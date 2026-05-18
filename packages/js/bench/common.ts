import { Bench } from 'tinybench';

export interface BenchResult {
  readonly units: number;
  readonly sanity?: string;
}

export interface Contestant {
  readonly label: string;
  readonly unit: string;
  readonly fn: (input: string) => BenchResult;
}

export function lines(seed: string, targetBytes: number): string {
  let out = '';
  while (out.length < targetBytes) out += seed;
  return out;
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

export async function runBenchTable(options: {
  readonly title: string;
  readonly seed: string;
  readonly prepare: (seed: string, targetBytes: number) => string;
  readonly smallInputs?: readonly string[];
  readonly contestants: readonly Contestant[];
  readonly sizesKb: readonly number[];
}): Promise<void> {
  console.log(options.title);
  console.log(
    'size'.padEnd(8) +
    'input'.padEnd(18) +
    'parser'.padEnd(22) +
    'avg time'.padEnd(12) +
    'ops/s'.padEnd(12) +
    '+/-'.padEnd(10) +
    'units'.padEnd(22) +
    'rel',
  );
  console.log('-'.repeat(113));

  const inputs: Array<{ label: string; input: string }> = [
    ...(options.smallInputs ?? []).map((input, index) => ({ label: `small${index + 1}`, input })),
    ...options.sizesKb.map((kb) => {
      const input = options.prepare(options.seed, kb * 1024);
      return { label: `${kb}KB`, input };
    }),
  ];

  for (const { label, input } of inputs) {
    const inputLabel = `${Math.round(input.length / 1024)}KB/${hashInput(input)}`;
    const sanity = new Map<string, BenchResult | Error>();
    for (const contestant of options.contestants) {
      try {
        sanity.set(contestant.label, contestant.fn(input));
      } catch (error) {
        sanity.set(contestant.label, error as Error);
      }
    }

    const kb = Math.max(1, input.length / 1024);
    const bench = new Bench({
      time: kb < 50 ? 500 : 400,
      warmupIterations: kb < 50 ? 20 : 3,
      iterations: 1,
    });

    for (const contestant of options.contestants) bench.add(contestant.label, () => contestant.fn(input));
    await bench.run();

    const tasks = new Map(bench.tasks.map((task) => [task.name, task]));
    const baselineLabel = options.contestants.find((contestant) => contestant.label.includes('parser2'))?.label ?? options.contestants[0]?.label ?? '';
    const baseline = (tasks.get(baselineLabel)?.result as BenchTaskResult | undefined)?.hz ?? 0;

    let first = true;
    for (const contestant of options.contestants) {
      const result = tasks.get(contestant.label)?.result as BenchTaskResult | undefined;
      const size = first ? label : '';
      const inputInfo = first ? inputLabel : '';
      first = false;
      if (!result?.hz) {
        const reason = sanity.get(contestant.label);
        const detail = reason instanceof Error ? `error: ${reason.message.split('\n')[0]}` : 'error';
        console.log(size.padEnd(8) + inputInfo.padEnd(18) + contestant.label.padEnd(22) + detail);
        continue;
      }

      const ops = result.hz;
      const ns = ops > 0 ? 1_000_000_000 / ops : 0;
      const sane = sanity.get(contestant.label);
      const units = sane instanceof Error ? 'error' : `${sane?.units ?? 0} ${contestant.unit}`;
      const rel = baseline > 0 ? `${(baseline / ops).toFixed(2)}x` : '-';
      console.log(
        size.padEnd(8) +
        inputInfo.padEnd(18) +
        contestant.label.padEnd(22) +
        fmtNs(ns).padEnd(12) +
        ops.toFixed(1).padEnd(12) +
        `+/-${result.rme.toFixed(1)}`.padEnd(10) +
        units.padEnd(22) +
        rel,
      );
    }
    console.log('-'.repeat(113));
  }
}

type BenchTaskResult = {
  readonly hz: number;
  readonly rme: number;
};
