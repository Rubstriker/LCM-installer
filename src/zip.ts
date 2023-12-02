import * as fss from 'fs';
import * as archiver from 'archiver';
import extractZip from 'extract-zip';

export function zipDirectory(sourceDir: string, outPath: string): Promise<void> {
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

export function unzipPackage(packagePath: string, dest: string): Promise<void> {
    return extractZip(packagePath, { dir: dest });
}