import chalk from "chalk";
import {unzipPackage} from "./zip";
import path from "path";
import { promises as fs, createWriteStream } from "fs";
import * as https from "https";
import * as vm from "vm";
import * as os from "os";
import {copyFiles} from "./install";

async function downloadPlugin(dependencyString: string, folder: string) {
    const [author, plugin, version] = dependencyString.split('-');
    console.log(chalk.yellow(`Downloading plugin ${plugin}...`));

    // const url = `https://thunderstore.io/package/download/${author}/${plugin}/${version}/`;
    const url = `https://gcdn.thunderstore.io/live/repository/packages/${dependencyString}.zip`;
    const dest = path.join(folder, `${plugin}.zip`);
    const file = createWriteStream(dest);

    console.log(chalk.blueBright(`Downloading ${url} to ${dest}`));

    return new Promise<void>((resolve, reject) => {
        https.get(url, res => {
            res.pipe(file);
            file.on("finish", () => file.close());
        });

        file.on('close', () => resolve());
        file.on('error', err => reject(err));
    });
}

function unpackPlugin(dependencyString: string, downloads: string, folder: string) {
    const [author, plugin, version] = dependencyString.split('-');
    console.log(chalk.yellow(`Unpacking plugin ${plugin}...`));

    const input = path.join(downloads, `${plugin}.zip`);
    const output = path.join(folder, `${plugin}`);

    console.log(chalk.blueBright(`Unpacking ${input} to ${output}`));
    return unzipPackage(input, output);
}

async function getFiles(folder: string, filter: (file: string) => boolean) {
    const files = await fs.readdir(folder);
    const pluginFiles = [];

    for (const file of files) {
        const p = path.join(folder, file);

        const stat = await fs.lstat(p);
        if (stat.isDirectory()) pluginFiles.push(...await getFiles(p, filter));
        if (filter(file)) pluginFiles.push(p);
    }

    return pluginFiles;
}

async function installPlugin(dependencyString: string, plugins: string, folder: string) {
    const [author, plugin, version] = dependencyString.split('-');

    const pluginFolder = path.join(plugins, `${plugin}`);
    const pluginFiles = await getFiles(pluginFolder, file => file.endsWith('.dll'));

    console.log(chalk.yellow(`Installing plugin ${plugin}...`));

    await Promise.all(pluginFiles.map(async (file, i) => {
        const dest = path.join(folder, `${plugin}${i === 0 ? '' : i}.dll`);

        console.log(chalk.blueBright(`Copying ${file} to ${dest}`));
        await fs.copyFile(file, dest);
    }));
}

export async function runPatchJavascript(javascript: string, environment: any) {
    const script = await fs.readFile(javascript, 'utf8');
    const outputFile = path.join(environment.tempPath, 'patches', `${Date.now()}-${Math.random().toString(36).substring(7)}.data`);

    const scriptEnvironment = {
        env: {
            config: environment.config,
        },
        output: '',
    };

    const ctx = vm.createContext(scriptEnvironment);
    vm.runInContext(script, ctx);
    vm.runInContext(`output = patch(env);`, ctx);

    await fs.mkdir(path.dirname(outputFile), {recursive: true});
    await fs.writeFile(outputFile, scriptEnvironment.output);
    return outputFile;
}

export async function getFileFromPatchDefinition(url: string, patch: string, environment: any) {
    const protocol = url.split(':')[0];
    const patchDirectory = path.dirname(patch);

    if (protocol === 'js') {
        const file = await getFileFromPatchDefinition(url.substring('js:'.length), patch, environment);
        return await runPatchJavascript(file, environment);
    }
    if (protocol === 'patch') return path.join(patchDirectory, url.substring('patch://'.length));
    if (protocol === 'file') return url.substring('file://'.length);

    throw new Error(`Unknown protocol ${protocol}!`);
}

export async function runPatch(patch: string, environment: any) {
    const patchFile = await fs.readFile(patch, 'utf8').then(JSON.parse);
    const {name, action} = patchFile;

    console.log(chalk.yellow(`Running patch for ${name}...`));

    try {
        if (action === 'file') {
            const { operations } = patchFile;
            for (const operation of operations) {
                const { source, destination } = operation;

                const sourceFile = await getFileFromPatchDefinition(source, patch, environment);
                const destinationFile = path.join(environment.gamePath, destination);

                await fs.mkdir(path.dirname(destinationFile), {recursive: true});
                await copyFiles(sourceFile, destinationFile);
            }
        }
    } catch (err) {
        console.log(chalk.redBright(`Failed to run patch for ${name}!`));
        console.error(err);
        return;
    }
}

export async function getLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get({
            host: 'api.github.com',
            path: '/repos/firecraftgaming/LCM-installer/releases/latest',
            headers: {
                'User-Agent': 'LCM-installer',
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data).tag_name));
        });
    });
}

const PACK_URL = 'https://github.com/firecraftgaming/LCM-installer/releases/download/{version}/pack.zip';
async function downloadPack(file: string, url?: string) {
    if (!url) {
        const version = await getLatestVersion();
        url = PACK_URL.replace('{version}', version);
    }

    await new Promise<void>((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode === 301 || res.statusCode === 302) return downloadPack(file, res.headers.location).then(resolve, reject);
            const packageFile = createWriteStream(file);

            console.log(chalk.blueBright(`Downloading ${url} to ${file}`));
            res.pipe(packageFile);

            packageFile.on("finish", () => packageFile.close());

            packageFile.on('error', err => reject(err));
            packageFile.on('close', () => resolve());
        });
    });
}

export async function installModpack(gamePath: string) {
    console.log(chalk.yellow('Installing modpack...'));

    const folder = path.join(os.tmpdir(), `../tmp/${Date.now()}`);
    await fs.mkdir(folder, {recursive: true});

    const packagePath = path.join(folder, 'pack.zip');
    await downloadPack(packagePath);

    const unpackPath = path.join(folder, 'pack');
    await unzipPackage(packagePath, unpackPath);

    const manifestPath = path.join(unpackPath, 'manifest.json');
    const manifest = await fs.readFile(manifestPath, 'utf8').then(JSON.parse);

    const downloadFolder = path.join(folder, 'downloads');
    await fs.mkdir(downloadFolder, {recursive: true});

    for (const dependency of manifest.plugins) await downloadPlugin(dependency, downloadFolder);

    console.log(chalk.yellow('Downloaded all plugins!'));

    const pluginsFolder = path.join(folder, 'unpacked');
    await fs.mkdir(pluginsFolder, {recursive: true});

    const unpacks = manifest.plugins.map((dependency: string) => unpackPlugin(dependency, downloadFolder, pluginsFolder));
    await Promise.all(unpacks);

    console.log(chalk.yellow('Unpacked all plugins!'));

    const destination = path.join(gamePath, 'BepInEx', 'plugins');
    await fs.mkdir(destination, {recursive: true});

    const installs = manifest.plugins.map((dependency: string) => installPlugin(dependency, pluginsFolder, destination));
    await Promise.all(installs);

    console.log(chalk.yellow('Installed all plugins!'));

    const environment = {
        packagePath,
        gamePath,
        tempPath: folder,

        config: manifest.config,
    };

    const patches = await getFiles(unpackPath, file => file.endsWith('patch.json'));
    for (const patch of patches) await runPatch(patch, environment);

    console.log(chalk.yellow('Patched all plugins!'));
    console.log(chalk.yellow('Installed modpack!'));

    await fs.rm(folder, {recursive: true, force: true});
}