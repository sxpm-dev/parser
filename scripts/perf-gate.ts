import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Bench } from 'tinybench';

type PackageName = 'cron' | 'css' | 'html' | 'json' | 'markdown';

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

const packageNames = new Set<PackageName>(['cron', 'css', 'html', 'json', 'markdown']);
const args = process.argv.slice(2);
const explicitPackage = args.find((arg) => !arg.startsWith('-'));
const packageName = resolvePackageName(explicitPackage);
const writeBaseline = args.includes('--write') || args.includes('-w');
const tolerance = readTolerance('PARSER2_PERF_TOLERANCE', 0.25);
const baselineFloorFactor = readTolerance('PARSER2_PERF_BASELINE_FLOOR', 0.1);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(root, 'packages', packageName);
const baselinePath = join(packageRoot, 'bench', 'perf-baseline.json');

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const api = await import(pathToFileURL(join(packageRoot, 'src', 'index.ts')).href) as Record<string, unknown>;
  const cases = createCases(packageName);
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

function createCases(name: PackageName): PerfCase[] {
  const sizes = [5, 20, 100];

  if (name === 'cron') {
    const seed = '*/5 * * * *\n0 9 * * 1-5 npm test\n15 14 1 * * deploy\n';
    return sizes.map((kb) => ({
      name: `validate:${kb}KB`,
      kb,
      input: repeat(seed, kb * 1024),
      run: (api, input) => {
        const validate = api.validate as (value: string) => void;
        let rows = 0;
        for (const row of input.trim().split(/\n/)) {
          validate(row);
          rows++;
        }
        return rows;
      },
    }));
  }

  if (name === 'css') {
    return sizes.map((kb) => ({
      name: `parse:${kb}KB`,
      kb,
      input: generateCss(kb * 1024),
      run: (api, css) => (api.render as (input: string, opts: { target: string }) => unknown)(css, { target: 'ast' }),
    }));
  }

  if (name === 'html') {
    return sizes.map((kb) => ({
      name: `parse:${kb}KB`,
      kb,
      input: generateHtml(kb * 1024),
      run: (api, html) => (api.render as (input: string, opts: { target: string }) => unknown)(html, { target: 'ast' }),
    }));
  }

  if (name === 'json') {
    return sizes.map((kb) => ({
      name: `parse:${kb}KB`,
      kb,
      input: generateJson(kb * 1024),
      run: (api, json) => (api.render as (input: string, opts: { target: string }) => unknown)(json, { target: 'ast' }),
    }));
  }

  // markdown
  return sizes.flatMap((kb) => {
    const input = generateMarkdown(kb * 1024);
    return [
      {
        name: `parse:${kb}KB`,
        kb,
        input,
        run: (api, markdown) => (api.render as (input: string, opts: { target: string }) => unknown)(markdown, { target: 'ast' }),
      },
      {
        name: `render:${kb}KB`,
        kb,
        input,
        run: (api, markdown) => (api.render as (input: string, opts: { target: string }) => unknown)(markdown, { target: 'html' }),
      },
    ];
  });
}

function generateMarkdown(targetBytes: number): string {
  const seed = [
    '# Release notes',
    'Plain paragraph',
    '',
    '## Installation guide',
    '- first item',
    '+ alternate marker',
    '* star marker',
    '1. ordered item',
    '- [x] completed task',
    '- [ ] pending task',
    '',
    '> quoted text',
    '',
    'Setext heading',
    '---',
    '',
    '**bold**',
    '*italic*',
    '~~removed~~',
    '`code`',
    '[docs](https://example.com)',
    '[docs][id]',
    '![diagram](https://example.com/diagram.png)',
    '![diagram][image-id]',
    '<https://example.com>',
    '&amp;',
    '',
    '```js',
    'sample',
    '```',
    '',
    '```',
    'plain',
    '```',
    '',
    '| name | value |',
    '| --- | --- |',
    '|:---|---:|',
    '',
    '[id]: https://example.com',
    '[^1]: footnote text',
    '[^1]',
    '',
    '<div>html</div>',
    '',
  ].join('\n');
  return repeat(seed, targetBytes);
}

function generateHtml(targetBytes: number): string {
  const seed = '<!doctype html><h1 class="title">Hello world</h1><p class="copy" disabled>Parser benchmark text</p><br />\n';
  return repeat(seed, targetBytes);
}

function generateCss(targetBytes: number): string {
  const chunks: string[] = [];
  let bytes = 0;
  let i = 0;
  while (bytes < targetBytes) {
    const chunk = realisticRule(i);
    chunks.push(chunk);
    bytes += chunk.length;
    i++;
  }
  return chunks.join('');
}

function realisticRule(i: number): string {
  switch (i % 5) {
    case 0:
      return `.card-${i}, #panel-${i} { color: red; margin: ${i % 17}px ${i % 11}px; background: url("asset-${i}.svg"); }\n`;
    case 1:
      return `@media screen and (max-width: ${320 + (i % 600)}px) { .card-${i}:hover { border-color: green; transform: translate(${i % 9}px, ${i % 7}px); } }\n`;
    case 2:
      return `/* theme ${i} */ [data-state="open-${i}"]::before { content: "{ item ${i}; }"; padding: calc(100% - ${i % 13}px); }\n`;
    case 3:
      return `@font-face { font-family: "Inter ${i}"; src: url("inter-${i}.woff2"); font-display: swap; }\n`;
    default:
      return `.grid-${i} > .item:not(.disabled), .grid-${i} + .summary { --gap: ${i % 20}px; color: rgb(${i % 255}, ${(i * 2) % 255}, ${(i * 3) % 255}); }\n`;
  }
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

function generateJson(targetBytes: number): string {
  const seed = JSON.stringify({
    name: 'my-project',
    version: '1.0.0',
    tags: ['alpha', 'beta', 'gamma'],
    settings: {
      strict: true,
      timeout: 30,
      retries: 3,
      targets: ['node', 'browser', 'deno'],
      flags: { verbose: false, color: true, exitOnError: true },
    },
    dependencies: Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [`pkg-${i}`, `^${i}.0.${i}`]),
    ),
  });
  const items: string[] = [];
  let total = 2;
  while (total < targetBytes) {
    items.push(seed);
    total += seed.length + 1;
  }
  return `[${items.join(',')}]`;
}

function repeat(seed: string, targetBytes: number): string {
  let out = '';
  while (out.length < targetBytes) out += seed;
  return out;
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
