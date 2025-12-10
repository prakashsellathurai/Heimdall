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
    'privacy-policy.txt'
];

async function build() {
    const distDir = path.join(__dirname, '..', 'dist');
    const zipPath = path.join(distDir, 'heimdall.zip');

    // Create dist directory
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Remove old zip if exists
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
        const sizeKB = (archive.pointer() / 1024).toFixed(2);
        console.log(`\n✓ Created: dist/heimdall.zip (${sizeKB} KB)`);
        console.log('\nReady to upload to:');
        console.log('  • Chrome Web Store: https://chrome.google.com/webstore/devconsole');
        console.log('  • Firefox Add-ons:  https://addons.mozilla.org/developers/');
    });

    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    const rootDir = path.join(__dirname, '..');

    for (const item of includeItems) {
        const itemPath = path.join(rootDir, item);
        if (fs.existsSync(itemPath)) {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                archive.directory(itemPath, item);
            } else {
                archive.file(itemPath, { name: item });
            }
        }
    }

    await archive.finalize();
}

build().catch(console.error);
