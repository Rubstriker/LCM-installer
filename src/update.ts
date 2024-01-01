import chalk from 'chalk';
import {noTryAsync} from 'no-try';
import {promises as fs} from 'fs';
import path from 'path';
import {downloadPack, installModpack} from './pack';
import os from 'os';
import {unzipPackage} from './zip';
import * as https from 'https';

async function downloadModpack(deleteTemp: boolean = true): Promise<{ plugins: string[] }> {
    const folder = path.join(os.tmpdir(), `../tmp/${Date.now()}`);
    await fs.mkdir(folder, {recursive: true});

    const packagePath = path.join(folder, 'pack.zip');
    await downloadPack(packagePath);

    const unpackPath = path.join(folder, 'pack');
    await unzipPackage(packagePath, unpackPath);

    const manifestPath = path.join(unpackPath, 'manifest.json');
    const manifest = await fs.readFile(manifestPath, 'utf8').then(JSON.parse);

    if (deleteTemp) await fs.rm(folder, {recursive: true});

    return manifest;
}

function parseDependencyString(dependencyString: string): [string, string, string] {
    const [author, name, version] = dependencyString.split('-');
    return [author, name, version];
}

const META_DATA_URL = 'https://thunderstore.io/api/experimental/package/';
async function fetchMetadata(dependencyString: string): Promise<any> {
    const [author, name] = parseDependencyString(dependencyString);
    const url = `${META_DATA_URL}${author}/${name}/`;

    const request = new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));

            res.on('error', err => reject(err));
        });
    });

    const [err, res] = await noTryAsync(() => request);
    if (err) throw err;

    return res;
}

async function needUpdate(dependencyString: string): Promise<string | null> {
    const version = parseDependencyString(dependencyString)[2];

    const metadata = await fetchMetadata(dependencyString);
    if (metadata.latest.version_number !== version) return metadata.latest.version_number;

    return null;
}

export async function updateMods(args: string[]): Promise<boolean> {
    console.log(chalk.yellow('Downloading modpack manifest...'));

    const [err, manifest] = await noTryAsync(() => downloadModpack());
    if (err) {
        console.log(chalk.redBright('Failed to download modpack manifest!'));
        console.error(err);
        return false;
    }

    console.log(chalk.yellow('Checking for updates...'));

    let action: null | 'all' | number = null;
    if (args[0] === 'all') action = 'all';
    if (args[0] && !isNaN(parseInt(args[0]))) action = parseInt(args[0]);

    let updatesCount = 0;
    for (let i = 0; i < manifest.plugins.length; i++) {
        if (typeof action === 'number' && action !== i + 1) continue;

        const plugin = manifest.plugins[i];

        const version = parseDependencyString(plugin)[2];
        const [err, newVersion] = await noTryAsync(() => needUpdate(plugin));
        if (err) {
            console.log(chalk.redBright(`Failed to check for update for ${plugin}!`));
            console.error(err);
            continue;
        }

        if (!newVersion) continue;

        // TODO: actually implement updates, however this requires a way to change the manifest

        updatesCount++;
        console.log(chalk.cyanBright(`There is a new version of ${plugin} [${version} -> ${newVersion}] available! Run "update ${i + 1}" to update this mod!`));
    }

    if (updatesCount === 0) {
        console.log(chalk.greenBright('No updates available!'));
        return true;
    }

    console.log(chalk.greenBright(`Found ${updatesCount} updates! Run "update all" to update all mods!`));

    return true;
}