import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

try {
    // Get the last commit date in YYYY.MM.DD.HHMM format
    const gitDate = execSync('git log -1 --format=%cd --date=format:%Y.%m.%d.%H%M').toString().trim();

    if (!gitDate) {
        throw new Error('Could not retrieve git commit date');
    }

    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    console.log(`Current version: ${pkg.version}`);
    pkg.version = gitDate;

    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated version to: ${gitDate}`);
} catch (e) {
    console.error('Failed to update version from git:', e.message);
    process.exit(1);
}
