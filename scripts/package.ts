import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const publishDir = join(rootDir, 'publish');

interface Manifest {
  background?: {
    service_worker?: string;
    scripts?: string[];
  };
  [key: string]: unknown;
}

async function createPackage(target: 'chrome' | 'firefox'): Promise<void> {
  const zipPath = join(publishDir, `heimdall-${target}.zip`);

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  if (!existsSync(publishDir)) {
    mkdirSync(publishDir, { recursive: true });
  }

  if (existsSync(zipPath)) {
    unlinkSync(zipPath);
  }

  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`  ✓ Created: publish/heimdall-${target}.zip (${sizeKB} KB)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    const manifestPath = join(distDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      if (target === 'firefox') {
        if (manifest.background?.service_worker) {
          const sw = manifest.background.service_worker;
          delete manifest.background.service_worker;
          manifest.background.scripts = [sw];
        }
      } else if (target === 'chrome') {
        if (manifest.background?.scripts) {
          const sw = manifest.background.scripts[0];
          delete manifest.background.scripts;
          manifest.background.service_worker = sw;
        }
      }

      archive.append(JSON.stringify(manifest, null, 2), {
        name: 'manifest.json',
      });
    }

    const items = readdirSync(distDir);
    for (const item of items) {
      if (item === 'manifest.json' || item.endsWith('.zip')) continue;
      const itemPath = join(distDir, item);
      const stat = statSync(itemPath);
      if (stat.isDirectory()) {
        archive.directory(itemPath, item);
      } else {
        archive.file(itemPath, { name: item });
      }
    }

    archive.finalize();
  });
}

async function build(): Promise<void> {
  console.log('\nPackaging extension...');
  const targets: ('chrome' | 'firefox')[] = ['chrome', 'firefox'];
  for (const target of targets) {
    await createPackage(target);
  }
  console.log('\nReady to upload to:');
  console.log('  • Chrome Web Store: https://chrome.google.com/webstore/devconsole');
  console.log('  • Firefox Add-ons:  https://addons.mozilla.org/developers/');
}

build().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
