import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

export type BumpType = 'patch' | 'minor' | 'major';

export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

export interface ParsedArgs {
  version?: string;
  bumpType?: BumpType;
  dryRun: boolean;
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(input: string): Semver {
  const match = SEMVER_RE.exec(input);
  if (!match) {
    throw new Error(`Invalid semver: "${input}". Expected MAJOR.MINOR.PATCH (digits only).`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function formatSemver(v: Semver): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function bumpSemver(current: string, type: BumpType): string {
  const v = parseSemver(current);
  switch (type) {
    case 'patch':
      return formatSemver({ ...v, patch: v.patch + 1 });
    case 'minor':
      return formatSemver({ ...v, minor: v.minor + 1, patch: 0 });
    case 'major':
      return formatSemver({ ...v, major: v.major + 1, minor: 0, patch: 0 });
  }
}

export function isGreaterVersion(next: string, prev: string): boolean {
  const a = parseSemver(next);
  const b = parseSemver(prev);
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

export function detectIndent(raw: string): number {
  const lines = raw.split('\n');
  for (const line of lines) {
    const match = line.match(/^( +)\S/);
    if (match) return match[1].length;
  }
  return 2;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeJsonString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function setVersionInFile(
  filePath: string,
  oldVersion: string,
  newVersion: string,
): void {
  const raw = readFileSync(filePath, 'utf-8');
  const indent = detectIndent(raw);
  const escapedOld = escapeRegExp(escapeJsonString(oldVersion));
  const topLevelPattern = new RegExp(
    `^( {${indent}}|\\t)"version"\\s*:\\s*"${escapedOld}"`,
    'm',
  );
  if (!topLevelPattern.test(raw)) {
    throw new Error(
      `Could not find top-level "version": "${oldVersion}" in ${filePath}. ` +
        `Refusing to modify the file to avoid silent corruption.`,
    );
  }
  const updated = raw.replace(
    topLevelPattern,
    (_match, prefix) => `${prefix}"version": "${newVersion}"`,
  );
  writeFileSync(filePath, updated);
}

export function readJsonVersion(filePath: string): string {
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  if (typeof data.version !== 'string') {
    throw new Error(`No string "version" field in ${filePath}`);
  }
  return data.version;
}

const VALID_BUMP_TYPES: readonly BumpType[] = ['patch', 'minor', 'major'];

export function parseArgs(argv: string[]): ParsedArgs {
  let dryRun = false;
  const positionals: string[] = [];
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length !== 1) {
    throw new Error(
      `Expected exactly one positional argument (version or bump type), got ${positionals.length}.`,
    );
  }

  const positional = positionals[0];
  if (/^\d/.test(positional)) {
    if (!SEMVER_RE.test(positional)) {
      throw new Error(`Invalid version "${positional}". Expected MAJOR.MINOR.PATCH.`);
    }
    return { version: positional, dryRun };
  }

  if ((VALID_BUMP_TYPES as readonly string[]).includes(positional)) {
    return { bumpType: positional as BumpType, dryRun };
  }

  throw new Error(
    `Unrecognized argument "${positional}". Expected a semver (1.2.3) or one of: ${VALID_BUMP_TYPES.join(', ')}.`,
  );
}

function printHelp(): void {
  console.log(`Usage: bun run scripts/bump-version.ts <version|bump-type> [--dry-run]

Arguments:
  1.2.3           Explicit new semver version
  patch|minor|major  Increment current version

Flags:
  --dry-run       Print the planned change without writing files or running build
  -h, --help      Show this help

This script:
  1. Cross-checks the "version" field in public/manifest.json and package.json.
  2. Fails (exit 1) if they don't match — they are the Chrome and Firefox source of truth.
  3. Updates both files.
  4. Runs "bun run build" so dist/ and publish/heimdall-{chrome,firefox}.zip carry the new version.
`);
}

function logStep(label: string): void {
  console.log(`\n→ ${label}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const manifestPath = join(rootDir, 'public', 'manifest.json');
  const packagePath = join(rootDir, 'package.json');

  logStep('Reading current versions');
  const manifestVersion = readJsonVersion(manifestPath);
  const packageVersion = readJsonVersion(packagePath);
  console.log(`  public/manifest.json: ${manifestVersion}`);
  console.log(`  package.json:         ${packageVersion}`);

  if (manifestVersion !== packageVersion) {
    console.error(
      `\n✗ Version mismatch between public/manifest.json (${manifestVersion}) and package.json (${packageVersion}).`,
    );
    console.error('  Refusing to bump. Manually reconcile the two files first.');
    process.exit(1);
  }
  console.log('  ✓ Versions match');

  if (!args.version && !args.bumpType) {
    console.error('\n✗ Either an explicit version or --bump-type is required.');
    process.exit(1);
  }

  const nextVersion = args.version ?? bumpSemver(manifestVersion, args.bumpType as BumpType);

  if (!isGreaterVersion(nextVersion, manifestVersion)) {
    console.error(
      `\n✗ New version ${nextVersion} is not greater than current ${manifestVersion}.`,
    );
    process.exit(1);
  }

  console.log(`\nPlan: ${manifestVersion} → ${nextVersion}`);
  console.log('  Files to update:');
  console.log(`    • ${manifestPath}`);
  console.log(`    • ${packagePath}`);
  console.log('  Then: bun run build (dist/ + publish/heimdall-{chrome,firefox}.zip)');

  if (args.dryRun) {
    console.log('\n--dry-run: no files written, build not executed.');
    return;
  }

  logStep('Updating source files');
  setVersionInFile(manifestPath, manifestVersion, nextVersion);
  console.log(`  ✓ public/manifest.json: ${manifestVersion} → ${nextVersion}`);
  setVersionInFile(packagePath, packageVersion, nextVersion);
  console.log(`  ✓ package.json:         ${packageVersion} → ${nextVersion}`);

  logStep('Running bun run build');
  const proc = Bun.spawn(['bun', 'run', 'build'], {
    cwd: rootDir,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`\n✗ Build failed with exit code ${exitCode}.`);
    process.exit(exitCode);
  }

  console.log(`\n✓ Bumped to ${nextVersion} and rebuilt.`);
  console.log('  Chrome zip:   publish/heimdall-chrome.zip');
  console.log('  Firefox zip:  publish/heimdall-firefox.zip');
}

if (import.meta.main) {
  main().catch((err: Error) => {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
  });
}
