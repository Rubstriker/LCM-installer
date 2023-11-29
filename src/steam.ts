import * as vdf from 'vdf-parser';
import * as path from 'path';
import { promises as fs } from 'fs';
import { noTryAsync } from 'no-try';
import { enumerateValues, HKEY } from 'registry-js'
import chalk from 'chalk';

const STEAM_DEFAULT_PATH = 'C:\\Program Files (x86)\\Steam';
const STEAM_LIBRARIES_PATH = 'steamapps\\libraryfolders.vdf';
const STEAM_GAME_PATH = '{library}\\steamapps\\common\\{game}\\';
const STEAM_KEY = 'SOFTWARE\\Wow6432Node\\Valve\\Steam';

async function getSteamPath() {
    const values = enumerateValues(
        HKEY.HKEY_LOCAL_MACHINE,
        STEAM_KEY,
    );

    const result = values.find((value) => value.name === 'InstallPath')?.data;
    if (!result) return STEAM_DEFAULT_PATH;

    console.log(chalk.yellow('Steam path resolved to: '), chalk.green(result));
    return result as string;
}

async function findSteamLibraries() {
    const STEAM_PATH = path.join(await getSteamPath(), STEAM_LIBRARIES_PATH);
    const steamPath = await fs.readFile(STEAM_PATH, 'utf-8');
    const parsed = vdf.parse(steamPath) as any;

    const steamLibraries = [path.dirname(STEAM_PATH)];
    for (const key in parsed.libraryfolders) {
        const index = parseInt(key);
        if (isNaN(index)) continue;

        const library = parsed.libraryfolders[key];
        if (!library) continue;
        if (!library.path) continue;

        steamLibraries[index] = library.path;
    }

    return steamLibraries;
}

async function findGamePathInLibrary(game: string, library: string) {
    const gamePath = STEAM_GAME_PATH
        .replace('{library}', library)
        .replace('{game}', game);

    console.log(chalk.yellow('Searching for game in: '), chalk.green(gamePath));

    const [error, result] = await noTryAsync(() => fs.readdir(gamePath));
    if (error) return null;

    return gamePath;
}

let gamePathCache: { [key: string]: string } = {};
export async function findGamePath(game: string) {
    if (gamePathCache[game]) return gamePathCache[game];

    const libraries = await findSteamLibraries();
    for (const library of libraries) {
        const gamePath = await findGamePathInLibrary(game, library);
        if (!gamePath) continue;

        gamePathCache[game] = gamePath;
        return gamePath;
    }

    return null;
}