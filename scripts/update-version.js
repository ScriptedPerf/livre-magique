import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

try {
    // Get the last commit date in YYYYMM format
    const commitMonth = execSync('git log -1 --format=%cd --date=format:%Y%m').toString().trim();
    const sinceDate = execSync('git log -1 --format=%cd --date=format:%Y-%m-01').toString().trim();

    // Get sequence: number of commits since the start of the current month
    const seqCount = execSync(`git rev-list --count HEAD --since="${sinceDate}"`).toString().trim();
    const seq = seqCount.padStart(2, '0');

    if (!commitMonth) {
        throw new Error('Could not retrieve git commit date');
    }

    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const currentVersion = pkg.version;

    // Extract base version (X.X.X)
    const baseVersion = currentVersion.split('-')[0];

    const newVersion = `${baseVersion}-${commitMonth}-${seq}`;

    console.log(`Updating version: ${currentVersion} -> ${newVersion}`);
    pkg.version = newVersion;

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
} catch (e) {
    console.error('Failed to update version:', e.message);
    process.exit(1);
}
