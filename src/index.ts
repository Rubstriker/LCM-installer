import chalk from 'chalk';
import {installMods} from './install';

const t = setInterval(() => {}, 1000);
async function main() {
    console.log(chalk.greenBright('Welcome to the Lethal Company Mods installer!'));
    console.log(chalk.blueBright('This installer will install all the mods you need to play on the Lethal Company server!'));

    const success = await installMods();
    if (success) {
        console.log(chalk.blueBright('All done!'));
        console.log(chalk.greenBright('Enjoy playing on the Lethal Company server!'));
    }

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