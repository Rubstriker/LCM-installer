const { exec } = require('child_process');
const archiver = require('archiver');
const fss = require('fs');
const fs = fss.promises;
const path = require('path');
const root = path.join(__dirname, '../../');

function zipDirectory(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fss.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
        archive
            .directory(sourceDir, false)
            .on('error', err => reject(err))
            .pipe(stream)
        ;

        stream.on('close', () => resolve());
        archive.finalize();
    });
}
function cmd(command, ...args) {
    let cmdPath = JSON.stringify(path.join(root, 'node_modules', command));
    cmdPath += args.map(arg => ` ${arg}`).join('');

    return new Promise((resolve, reject) => {
        exec(`node ${cmdPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                reject(error);
                return;
            }

            resolve(stdout ? stdout : stderr);
        });
    });
}

async function readDirRecursive(dir) {
    const results = await fs.readdir(dir);
    const files = [];

    for (const result of results) {
        if (result.endsWith('.js')) files.push(result);
        if (result.includes('.')) continue;

        const subFiles = await readDirRecursive(path.join(dir, result));
        for (const subFile of subFiles) files.push(`${result}/${subFile}`);
    }

    return files;
}

async function package() {
    console.log('Compiling TypeScript...');
    await cmd(path.join('typescript', 'bin', 'tsc'));

    console.log('Packaging modpack...');
    await zipDirectory(path.join(root, 'pack'), path.join(root, 'lcm-data', 'pack.zip'));

    console.log('Packaging executable...');
    await cmd(path.join('pkg', 'lib-es5', 'bin.js'), JSON.stringify(path.join(root, 'package.json')));

    await fs.copyFile(path.join(root, 'lcm-data', 'pack.zip'), path.join(root, 'out', 'pack.zip')); // We also want to release the pack.zip file
}

async function clean() {
    console.log('Cleaning up...');

    const pack = `${root}/lcm-data/pack.zip`;
    await fs.rm(pack, { recursive: true });

    const dist = `${root}/dist`;
    await fs.rm(dist, { recursive: true });
}

async function main() {
    let state = true;
    await package().catch((e) => (state = false) || console.error(e));
    await clean();

    if (state) console.log('Build complete!');
    else console.error('Build failed!');
}

main().catch(console.error);