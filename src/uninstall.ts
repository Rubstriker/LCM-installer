import chalk from 'chalk';
import * as path from 'path';
import {promises as fs} from 'fs';
import {findGamePath} from './steam';
import {noTryAsync} from 'no-try';

export async function uninstallMods(): Promise<boolean> {
    console.log(chalk.yellow('Uninstalling mods...'));

    const modsPath = path.join(__dirname, '../lcm-data');
    const [error, lcPath] = await noTryAsync(() => findGamePath('Lethal Company'));
    if (error || !lcPath) {
        console.log(chalk.redBright('Could not find Lethal Company installation!'));
        return false;
    }

    const files = await fs.readdir(modsPath);
    const promises = files.map(file => {
        const dest = path.join(lcPath, file);
        fs.rm(dest, {recursive: true, force: true});
    });

    const [err] = await noTryAsync(() => Promise.all(promises));
    if (err) {
        console.log(chalk.redBright('Failed to uninstall mods!'));
        console.error(err);
        return false;
    }

    console.log(chalk.yellow('Uninstalled mods!'));

    console.log(chalk.blueBright('All done!'));
    console.log(chalk.greenBright('Enjoy playing Lethal Company (vanilla)!'));
    console.log(chalk.yellow('If you want to reinstall the mods, run this app again.'));
    return true;
}