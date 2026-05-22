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

export const DEFAULT_SIZES_KB = [5, 20, 100, 500, 1000] as const;

export function repeatToBytes(seed: string, targetBytes: number): string {
  let out = '';
  while (out.length < targetBytes) out += seed;
  return out;
}

export function countRows(input: string, fn: (value: string) => void): BenchResult {
  let units = 0;
  for (const row of input.trim().split(/\n/)) {
    fn(row);
    units++;
  }
  return { units };
}

export function countValidRows(input: string, fn: (value: string) => boolean): BenchResult {
  let units = 0;
  for (const row of input.trim().split(/\n/)) {
    if (fn(row)) units++;
  }
  return { units };
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
  readonly contestants: readonly Contestant[];
  readonly generateInput?: (targetBytes: number) => string;
  readonly seed?: string;
  readonly prepare?: (seed: string, targetBytes: number) => string;
  readonly sizesKb?: readonly number[];
  readonly smallInputs?: readonly string[];
  // Named fixed-content inputs. Each entry appears in the bench table with
  // its given label in the size column. Useful for benchmarking against
  // real-world fixtures (e.g. huge-page.html) alongside synthetic sizes.
  readonly namedInputs?: readonly { readonly label: string; readonly input: string }[];
  readonly parserColumnWidth?: number;
}): Promise<void> {
  const generateInput = options.generateInput ?? ((targetBytes: number) => {
    if (options.seed === undefined || options.prepare === undefined) {
      throw new Error('runBenchTable requires generateInput or seed + prepare');
    }
    return options.prepare(options.seed, targetBytes);
  });
  const parserWidth = options.parserColumnWidth ?? 28;
  console.log(options.title);
  console.log(
    'size'.padEnd(12) +
    'input'.padEnd(18) +
    'parser'.padEnd(parserWidth) +
    'avg time'.padEnd(12) +
    'ops/s'.padEnd(12) +
    '+/-'.padEnd(8) +
    'units'.padEnd(22) +
    'rel',
  );
  console.log('-'.repeat(95 + parserWidth));

  const inputs: Array<{ readonly label: string; readonly input: string }> = [
    ...(options.smallInputs ?? []).map((input, index) => ({ label: `small${index + 1}`, input })),
    ...(options.namedInputs ?? []),
    ...(options.sizesKb ?? DEFAULT_SIZES_KB).map((kb) => ({
      label: `${kb}KB`,
      input: generateInput(kb * 1024),
    })),
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
      time: kb < 50 ? 500 : kb < 500 ? 400 : 250,
      warmupIterations: kb < 50 ? 20 : 3,
      iterations: 1,
    });

    for (const contestant of options.contestants) bench.add(contestant.label, () => contestant.fn(input));
    await bench.run();

    const tasks = new Map(bench.tasks.map((task) => [task.name, task]));
    const hasCoverage = (labelForCoverage: string): boolean => {
      const sane = sanity.get(labelForCoverage);
      if (sane instanceof Error) return false;
      return (sane?.units ?? 0) > 0 || input.length === 0;
    };
    const baselineLabel =
      options.contestants.find((c) => c.label.includes('parser2') && hasCoverage(c.label))?.label ??
      options.contestants.find((c) => hasCoverage(c.label))?.label ??
      options.contestants[0]?.label ??
      '';
    const baseResult = tasks.get(baselineLabel)?.result as BenchTaskResult | undefined;
    const base = baseResult?.hz ?? 0;

    let first = true;
    for (const contestant of options.contestants) {
      const result = tasks.get(contestant.label)?.result as BenchTaskResult | undefined;
      const size = first ? label : '';
      const inputInfo = first ? inputLabel : '';
      first = false;

      if (!result?.hz) {
        const reason = sanity.get(contestant.label);
        const detail = reason instanceof Error ? `error: ${reason.message.split('\n')[0]}` : 'error';
        console.log(size.padEnd(12) + inputInfo.padEnd(18) + contestant.label.padEnd(parserWidth) + detail);
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
        size.padEnd(12) +
        inputInfo.padEnd(18) +
        contestant.label.padEnd(parserWidth) +
        fmtNs(ns).padEnd(12) +
        ops.toFixed(1).padEnd(12) +
        `+/-${result.rme.toFixed(1)}`.padEnd(8) +
        units.padEnd(22) +
        rel,
      );
    }
    console.log('-'.repeat(91 + parserWidth));
  }
}

type BenchTaskResult = {
  readonly hz: number;
  readonly rme: number;
};
