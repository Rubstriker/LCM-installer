import chalk from 'chalk';
import * as path from 'path';
import {promises as fs} from 'fs';
import {findGamePath} from './steam';
import {noTryAsync} from 'no-try';

function getModsPath() {
    return path.join(__dirname, '../lcm-data');
}

async function copyFiles(source: string, dest: string) {
    const [error, stat] = await noTryAsync(() => fs.lstat(source));
    if (error || !stat) return Promise.resolve();
    if (!stat.isDirectory()) console.log(chalk.blueBright(`Copying ${source} to ${dest}`));
    if (!stat.isDirectory()) return void await fs.copyFile(source, dest);

    await fs.mkdir(dest, {recursive: true});
    const files = await fs.readdir(source);
    const promises = files.map(async file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(dest, file);

        await copyFiles(sourcePath, destPath);
    });

    await Promise.all(promises);
}

export async function installMods(): Promise<boolean> {
    console.log(chalk.yellowBright('Installing mods...'));

    const modsPath = getModsPath();
    const [error, lcPath] = await noTryAsync(() => findGamePath('Lethal Company'));
    if (error || !lcPath) {
        console.log(chalk.redBright('Could not find Lethal Company installation!'));
        return false;
    }

    const files = await fs.readdir(modsPath);
    const promises = files.map(file => {
        const source = path.join(modsPath, file);
        const dest = path.join(lcPath, file);

        return copyFiles(source, dest);
    });

    const [err] = await noTryAsync(() => Promise.all(promises));
    if (err) {
        console.log(chalk.redBright('Failed to install mods!'));
        console.error(err);
        return false;
    }

    console.log(chalk.greenBright('Installed mods!'));
    return true;
}