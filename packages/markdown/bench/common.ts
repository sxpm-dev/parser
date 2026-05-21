import { readFileSync } from 'node:fs';
import { Bench } from 'tinybench';

export interface BenchResult {
  readonly units: number;
}

export interface Contestant {
  readonly label: string;
  readonly unit: string;
  readonly fn: (input: string) => BenchResult;
}

export const SIZES_KB = [5, 20, 100, 500, 1000];

const fixture = readFileSync(new URL('../test/fixtures/release-notes.md', import.meta.url), 'utf8').trim();

export function generateMarkdown(targetBytes: number): string {
  const chunks: string[] = [];
  let bytes = 0;
  while (bytes < targetBytes) {
    const chunk = `${fixture}\n\n`;
    chunks.push(chunk);
    bytes += chunk.length;
  }
  return chunks.join('');
}

export function fmtNs(ns: number): string {
  if (ns < 1_000) return `${ns.toFixed(1)}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)}us`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(2)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

export function hashInput(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  console.log(title);
  console.log(
    'size'.padEnd(8) +
    'input'.padEnd(18) +
    'parser'.padEnd(26) +
    'avg time'.padEnd(12) +
    'ops/s'.padEnd(12) +
    '+/-'.padEnd(8) +
    'units'.padEnd(22) +
    'rel',
  );
  console.log('-'.repeat(117));

  for (const kb of SIZES_KB) {
    const input = generateMarkdown(kb * 1024);
    const inputLabel = `${Math.round(input.length / 1024)}KB/${hashInput(input)}`;
    const sanity = new Map<string, BenchResult | Error>();
    for (const contestant of contestants) {
      try {
        sanity.set(contestant.label, contestant.fn(input));
      } catch (error) {
        sanity.set(contestant.label, error as Error);
      }
    }

    const bench = new Bench({
      time: kb < 50 ? 500 : kb < 500 ? 400 : 250,
      warmupIterations: kb < 50 ? 20 : 3,
      iterations: 1,
    });

    for (const contestant of contestants) bench.add(contestant.label, () => contestant.fn(input));
    await bench.run();

    const tasks = new Map(bench.tasks.map((task) => [task.name, task]));
    const hasCoverage = (label: string): boolean => {
      const sane = sanity.get(label);
      if (sane instanceof Error) return false;
      return (sane?.units ?? 0) > 0 || input.length === 0;
    };
    const baselineLabel =
      contestants.find((c) => c.label.includes('parser2') && hasCoverage(c.label))?.label ??
      contestants.find((c) => hasCoverage(c.label))?.label ??
      contestants[0]?.label ??
      '';
    const baseResult = tasks.get(baselineLabel)?.result as BenchTaskResult | undefined;
    const base = baseResult?.hz ?? 0;

    let first = true;
    for (const contestant of contestants) {
      const task = tasks.get(contestant.label);
      const result = task?.result as BenchTaskResult | undefined;
      const size = first ? `${kb}KB` : '';
      const inputInfo = first ? inputLabel : '';
      first = false;

      if (!result?.hz) {
        const reason = sanity.get(contestant.label);
        const detail = reason instanceof Error ? `error: ${reason.message.split('\n')[0]}` : 'error';
        console.log(size.padEnd(8) + inputInfo.padEnd(18) + contestant.label.padEnd(26) + detail);
        continue;
      }

      const sane = sanity.get(contestant.label);
      const coverage = hasCoverage(contestant.label);
      const ops = result.hz;
      const ns = ops > 0 ? 1_000_000_000 / ops : 0;
      const units = sane instanceof Error
        ? 'error'
        : coverage
          ? `${sane?.units ?? 0} ${contestant.unit}`
          : `0 ${contestant.unit} (partial)`;
      const rel = !coverage ? 'n/a' : base > 0 ? `${(base / ops).toFixed(2)}x` : '-';
      console.log(
        size.padEnd(8) +
        inputInfo.padEnd(18) +
        contestant.label.padEnd(26) +
        fmtNs(ns).padEnd(12) +
        ops.toFixed(1).padEnd(12) +
        `+/-${result.rme.toFixed(1)}`.padEnd(8) +
        units.padEnd(22) +
        rel,
      );
    }
    console.log('-'.repeat(117));
  }
}

type BenchTaskResult = {
  readonly hz: number;
  readonly rme: number;
};
