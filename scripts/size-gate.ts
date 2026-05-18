import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SizeEntry = {
  readonly bytes: number;
  readonly gzipBytes: number;
  readonly hash: string;
};

type SizeBaseline = Record<string, SizeEntry>;

const args = process.argv.slice(2);
const explicitPackage = args.find((arg) => !arg.startsWith('-'));
const assetArg = args.find((arg, index) => index > 0 && !arg.startsWith('-'));
const writeBaseline = args.includes('--write') || args.includes('-w');
const tolerance = readTolerance();
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageName = explicitPackage ?? basename(process.cwd());
const packageRoot = join(root, 'packages', packageName);
const assetPath = resolve(packageRoot, assetArg ?? 'dist/browser/index.min.js');
const baselinePath = join(packageRoot, 'bench', 'size-baseline.json');

main();

function main(): void {
  if (!existsSync(assetPath)) {
    throw new Error(`${relativeAssetPath()} does not exist; build the browser asset before running the size gate`);
  }

  const baseline: SizeBaseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf8')) as SizeBaseline
    : {};
  const bytes = readFileSync(assetPath);
  const key = relativeAssetPath();
  const entry: SizeEntry = {
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
    hash: hashBytes(bytes),
  };
  const previous = baseline[key];

  console.log(`${packageName} size ${writeBaseline ? 'baseline' : 'gate'} (${Math.round(tolerance * 100)}% tolerance)`);
  console.log('asset'.padEnd(32) + 'bytes'.padEnd(12) + 'gzip'.padEnd(12) + (writeBaseline ? 'baseline' : 'maximum'));
  console.log(
    key.padEnd(32) +
    `${entry.bytes}`.padEnd(12) +
    `${entry.gzipBytes}`.padEnd(12) +
    (writeBaseline || !previous
      ? writeBaseline ? 'locked' : 'missing'
      : `${Math.round(previous.bytes * (1 + tolerance))}/${Math.round(previous.gzipBytes * (1 + tolerance))}`),
  );

  if (writeBaseline) {
    writeFileSync(baselinePath, `${JSON.stringify({ ...baseline, [key]: entry }, null, 2)}\n`);
    return;
  }

  if (!previous) fail(`${key}: missing baseline`);
  const maxBytes = previous.bytes * (1 + tolerance);
  const maxGzipBytes = previous.gzipBytes * (1 + tolerance);
  const failures: string[] = [];
  if (entry.bytes > maxBytes) failures.push(`${entry.bytes} bytes > ${Math.round(maxBytes)} bytes`);
  if (entry.gzipBytes > maxGzipBytes) failures.push(`${entry.gzipBytes} gzip bytes > ${Math.round(maxGzipBytes)} gzip bytes`);
  if (failures.length > 0) fail(`${key}: ${failures.join('; ')}`);
}

function relativeAssetPath(): string {
  return assetPath.startsWith(`${packageRoot}/`) ? assetPath.slice(packageRoot.length + 1) : assetPath;
}

function readTolerance(): number {
  const raw = process.env.PARSER2_SIZE_TOLERANCE;
  if (!raw) return 0.05;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) {
    throw new Error('PARSER2_SIZE_TOLERANCE must be a number from 0 to 0.99');
  }
  return parsed;
}

function fail(message: string): never {
  console.error(`\nSize gate failed:\n- ${message}`);
  process.exit(1);
}

function hashBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
