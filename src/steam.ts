import * as vdf from 'vdf-parser';
import * as path from 'path';
import { promises as fs } from 'fs';
import {noTryAsync} from 'no-try';

const STEAM_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf';
const STEAM_GAME_PATH = '{library}\\steamapps\\common\\{game}\\';

async function findSteamLibraries() {
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

    const [error, result] = await noTryAsync(() => fs.readdir(gamePath));
    if (error) return null;

    return gamePath;
}

export async function findGamePath(game: string) {
    const libraries = await findSteamLibraries();
    for (const library of libraries) {
        const gamePath = await findGamePathInLibrary(game, library);
        if (gamePath) return gamePath;
    }

    return null;
}