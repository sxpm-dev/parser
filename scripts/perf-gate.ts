import { parserPackages } from './parser-packages.ts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Bench } from 'tinybench';

type PackageName = string;

type PerfCase = {
  readonly name: string;
  readonly kb: number;
  readonly input: string;
  readonly run: (api: Record<string, unknown>, input: string) => unknown;
};

type BaselineEntry = {
  readonly hz: number;
  readonly inputHash: string;
  readonly bytes: number;
};

type Baseline = Record<string, BaselineEntry>;

const packageNames = new Set<PackageName>(parserPackages);
const args = process.argv.slice(2);
const explicitPackage = args.find((arg) => !arg.startsWith('-'));
const packageName = resolvePackageName(explicitPackage);
const writeBaseline = args.includes('--write') || args.includes('-w');
const tolerance = readTolerance('PARSER2_PERF_TOLERANCE', 0.25);
const baselineFloorFactor = 1;
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(root, 'packages', packageName);
const baselinePath = join(packageRoot, 'bench', 'perf-baseline.json');

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const api = await import(pathToFileURL(join(packageRoot, 'src', 'index.ts')).href) as Record<string, unknown>;
  const { cases } = await import(pathToFileURL(join(packageRoot, 'bench', 'cases.ts')).href);
  const baseline: Baseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline
    : {};
  const nextBaseline: Baseline = {};
  const failures: string[] = [];

  console.log(`${packageName} performance ${writeBaseline ? 'baseline' : 'gate'} (${Math.round(tolerance * 100)}% tolerance, ${Math.round(baselineFloorFactor * 100)}% floor)`);
  console.log('case'.padEnd(18) + 'input'.padEnd(18) + 'ops/s'.padEnd(14) + (writeBaseline ? 'baseline' : 'minimum'));

  for (const perfCase of cases) {
    const result = await measure(perfCase, api);
    const lockedHz = writeBaseline ? result.hz * baselineFloorFactor : result.hz;
    const entry: BaselineEntry = {
      hz: Math.round(lockedHz),
      inputHash: hashInput(perfCase.input),
      bytes: perfCase.input.length,
    };
    nextBaseline[perfCase.name] = entry;

    const previous = baseline[perfCase.name];
    const minimum = previous ? previous.hz * (1 - tolerance) : 0;
    console.log(
      perfCase.name.padEnd(18) +
      `${Math.round(entry.bytes / 1024)}KB/${entry.inputHash}`.padEnd(18) +
      `${entry.hz}`.padEnd(14) +
      (writeBaseline ? 'locked' : previous ? `${Math.round(minimum)} ops/s` : 'missing'),
    );

    if (writeBaseline) continue;
    if (!previous) {
      failures.push(`${perfCase.name}: missing baseline`);
    } else if (previous.inputHash !== entry.inputHash || previous.bytes !== entry.bytes) {
      failures.push(`${perfCase.name}: input changed, run perf:baseline to intentionally relock`);
    } else if (entry.hz < minimum) {
      failures.push(`${perfCase.name}: ${entry.hz} ops/s < ${Math.round(minimum)} ops/s`);
    }
  }

  if (writeBaseline) {
    writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`);
    return;
  }

  if (failures.length > 0) {
    console.error('\nPerformance gate failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

async function measure(perfCase: PerfCase, api: Record<string, unknown>): Promise<{ hz: number }> {
  perfCase.run(api, perfCase.input);
  let stableHz = Number.POSITIVE_INFINITY;
  for (let sample = 0; sample < 4; sample++) {
    const bench = new Bench({
      time: perfCase.kb >= 100 ? 350 : 400,
      warmupIterations: perfCase.kb >= 100 ? 5 : 10,
      iterations: 1,
    });
    bench.add(perfCase.name, () => perfCase.run(api, perfCase.input));
    await bench.run();
    const result = bench.tasks[0]?.result as BenchTaskResult | undefined;
    if (!result?.hz) throw new Error(`${perfCase.name} did not complete`);
    stableHz = Math.min(stableHz, result.hz);
  }
  return { hz: stableHz };
}

function resolvePackageName(arg: string | undefined): PackageName {
  const candidate = arg ?? basename(process.cwd());
  if (packageNames.has(candidate as PackageName)) return candidate as PackageName;
  throw new Error(`usage: tsx scripts/perf-gate.ts <${[...packageNames].join('|')}> [--write]`);
}

function readTolerance(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) {
    throw new Error(`${name} must be a number from 0 to 0.99`);
  }
  return parsed;
}

function hashInput(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

type BenchTaskResult = {
  readonly hz: number;
};
