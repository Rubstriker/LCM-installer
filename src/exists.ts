import * as path from 'path';
import {promises as fs} from 'fs';
import {findGamePath} from './steam';
import {noTryAsync} from 'no-try';

export async function existsMods(): Promise<boolean> {
    const modsPath = path.join(__dirname, '../lcm-data');
    const [error, lcPath] = await noTryAsync(() => findGamePath('Lethal Company'));
    if (error || !lcPath) return false;

    const files = await fs.readdir(modsPath);
    const promises = files.map(async file => {
        const dest = path.join(lcPath, file);
        const [err, result] = await noTryAsync(() => fs.lstat(dest));
        return !err && result;
    });

    return await Promise.all(promises).then(v => v.some(Boolean));
}