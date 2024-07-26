import chalk from 'chalk';
import {installMods} from './install';
import {uninstallMods} from './uninstall';
import {existsMods} from './exists';
import {updateMods} from './update';

const t = setInterval(() => {}, 1000);
async function main() {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        if (args[0] === 'update') {
            await updateMods(args);
            return;
        }

        console.log(chalk.redBright('Invalid command!'));
        return;
    }

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

process.on('uncaughtException', (err) => {
    console.error(err);
});

process.on('unhandledRejection', (err) => {
    console.error(err);
});

if (require.main === module) setTimeout(main, 0);