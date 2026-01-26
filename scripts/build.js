const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Files/folders to include in the extension zip
const includeItems = [
    'manifest.json',
    'popup.html',
    'js',
    'css',
    'images',
    'privacy-policy.txt',
    'dashboard.html',
    'dashboard_classic.html',
    'rules.json'
];

async function createPackage(target) {
    const distDir = path.join(__dirname, '..', 'dist');
    const zipPath = path.join(distDir, `heimdall-${target}.zip`);

    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            const sizeKB = (archive.pointer() / 1024).toFixed(2);
            console.log(`\n✓ Created: dist/heimdall-${target}.zip (${sizeKB} KB)`);
            resolve();
        });

        archive.on('error', (err) => reject(err));
        archive.pipe(output);

        const rootDir = path.join(__dirname, '..');

        for (const item of includeItems) {
            const itemPath = path.join(rootDir, item);
            if (!fs.existsSync(itemPath)) continue;

            if (item === 'manifest.json') {
                const manifest = JSON.parse(fs.readFileSync(itemPath, 'utf8'));

                // Transform manifest based on target
                if (target === 'firefox') {
                    if (manifest.background && manifest.background.service_worker) {
                        const sw = manifest.background.service_worker;
                        delete manifest.background.service_worker;
                        manifest.background.scripts = [sw];
                    }
                } else if (target === 'chrome') {
                    // Ensure service_worker is used (default)
                    if (manifest.background && manifest.background.scripts) {
                        const sw = manifest.background.scripts[0];
                        delete manifest.background.scripts;
                        manifest.background.service_worker = sw;
                    }
                }

                archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
            } else {
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    archive.directory(itemPath, item);
                } else {
                    archive.file(itemPath, { name: item });
                }
            }
        }

        archive.finalize();
    });
}

async function build() {
    const targets = ['chrome', 'firefox'];
    for (const target of targets) {
        await createPackage(target);
    }
    console.log('\nReady to upload to:');
    console.log('  • Chrome Web Store: https://chrome.google.com/webstore/devconsole');
    console.log('  • Firefox Add-ons:  https://addons.mozilla.org/developers/');
}

build().catch(console.error);
