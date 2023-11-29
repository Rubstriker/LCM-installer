import chalk from 'chalk';
import {installMods} from './install';
import {uninstallMods} from './uninstall';
import {existsMods} from './exists';

const t = setInterval(() => {}, 1000);
async function main() {
    console.log(chalk.greenBright('Welcome to the Lethal Company Mods installer!'));
    console.log(chalk.blueBright('This installer will install (or uninstall) all the NaCo recommended Lethal Company mods!'));

    const exists = await existsMods();
    if (exists) await uninstallMods();
    else await installMods();

    console.log('Press Ctrl+C to exit.');
}

process.on('exit', () => {
    return false;
});

process.on('SIGINT', () => {
    clearInterval(t);
    process.exit(0);
});

if (require.main === module) main();