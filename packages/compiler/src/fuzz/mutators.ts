// Input mutators for the differential fuzzer (Task 2.4). Each mutator
// derives one or more new inputs from a seed string. The fuzzer feeds
// mutated inputs through both the reference interpreter and the v2-
// generated parser and asserts equivalence.
//
// Design rules:
//   - Mutators MUST be deterministic given the supplied RNG. The fuzzer
//     replays the same seed on a regression and expects the same inputs.
//   - Mutators produce small batches (often 1-4 outputs per call) so the
//     runner can interleave mutator-kinds and respect the time budget.
//   - Each mutator is tagged with a stable name (used in failure reports
//     so a minimal failing input can be reproduced).

// --- Deterministic RNG (mulberry32) ----------------------------------------

export type Rng = {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(arr: ReadonlyArray<T>): T;
};

export function makeRng(seed: number): Rng {
  let s = seed | 0;
  if (s === 0) s = 0x9e3779b9;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(maxExclusive: number): number {
      if (maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    pick<T>(arr: ReadonlyArray<T>): T {
      if (arr.length === 0) throw new Error('pick(): empty array');
      return arr[Math.floor(next() * arr.length)]!;
    },
  };
}

// --- Mutator output --------------------------------------------------------

export type MutatedInput = {
  readonly mutator: string;
  readonly seed: string;
  readonly input: string;
};

export type Mutator = (seed: string, rng: Rng) => ReadonlyArray<MutatedInput>;

// --- Individual mutators ---------------------------------------------------

// Pass-through: emit the seed unchanged. Lets the runner cover the seed
// corpus alongside mutated inputs without a separate dispatch path.
export const identity: Mutator = (seed) => [
  { mutator: 'identity', seed, input: seed },
];

// Truncate at offsets 1, len/4, len/2, 3*len/4. Skips degenerate cases
// (empty or single-byte seeds).
export const truncate: Mutator = (seed) => {
  if (seed.length <= 1) return [];
  const offsets = new Set<number>();
  offsets.add(1);
  offsets.add(Math.max(1, Math.floor(seed.length / 4)));
  offsets.add(Math.max(1, Math.floor(seed.length / 2)));
  offsets.add(Math.max(1, Math.floor((seed.length * 3) / 4)));
  const out: MutatedInput[] = [];
  for (const off of offsets) {
    if (off < seed.length) {
      out.push({ mutator: `truncate@${off}`, seed, input: seed.slice(0, off) });
    }
  }
  return out;
};

// Concatenate seed with itself — exercises repeated-structure parsing.
export const duplicate: Mutator = (seed) => {
  if (seed.length === 0) return [];
  return [{ mutator: 'duplicate', seed, input: seed + seed }];
};

// Concatenate seed twice with a single newline between — exercises block-
// level adjacency in markdown / multi-rule CSS / sibling HTML elements.
export const duplicateWithSeparator: Mutator = (seed) => {
  if (seed.length === 0) return [];
  return [
    { mutator: 'duplicate-nl', seed, input: seed + '\n' + seed },
    { mutator: 'duplicate-sp', seed, input: seed + ' ' + seed },
  ];
};

// Insert a small run of random printable-ASCII noise at a random position.
const NOISE_CHARS = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ \t\n';
export const insertNoise: Mutator = (seed, rng) => {
  if (seed.length === 0) return [];
  const pos = rng.int(seed.length + 1);
  const runLen = 1 + rng.int(4);
  let noise = '';
  for (let i = 0; i < runLen; i++) noise += NOISE_CHARS.charAt(rng.int(NOISE_CHARS.length));
  return [
    {
      mutator: `insert-noise@${pos}+${runLen}`,
      seed,
      input: seed.slice(0, pos) + noise + seed.slice(pos),
    },
  ];
};

// Swap two adjacent bytes at a random position. Single-byte swap = the
// most common transcription-style corruption.
export const swapAdjacent: Mutator = (seed, rng) => {
  if (seed.length < 2) return [];
  const pos = rng.int(seed.length - 1);
  const a = seed.charAt(pos);
  const b = seed.charAt(pos + 1);
  if (a === b) return [];
  return [
    {
      mutator: `swap-adjacent@${pos}`,
      seed,
      input: seed.slice(0, pos) + b + a + seed.slice(pos + 2),
    },
  ];
};

// Delete a single byte at a random position.
export const deleteByte: Mutator = (seed, rng) => {
  if (seed.length === 0) return [];
  const pos = rng.int(seed.length);
  return [
    {
      mutator: `delete-byte@${pos}`,
      seed,
      input: seed.slice(0, pos) + seed.slice(pos + 1),
    },
  ];
};

// Replace a single byte with a random printable byte.
export const replaceByte: Mutator = (seed, rng) => {
  if (seed.length === 0) return [];
  const pos = rng.int(seed.length);
  const ch = NOISE_CHARS.charAt(rng.int(NOISE_CHARS.length));
  if (seed.charAt(pos) === ch) return [];
  return [
    {
      mutator: `replace-byte@${pos}`,
      seed,
      input: seed.slice(0, pos) + ch + seed.slice(pos + 1),
    },
  ];
};

// Repeat a structural delimiter (one of `< > ( ) [ ] { } # * _ ~ \``)
// found inside the seed. Exercises tokenizer + balanced-until edge cases.
const STRUCT_BYTES = new Set('<>()[]{}#*_~`'.split(''));
export const repeatDelimiter: Mutator = (seed, rng) => {
  const positions: number[] = [];
  for (let i = 0; i < seed.length; i++) {
    if (STRUCT_BYTES.has(seed.charAt(i))) positions.push(i);
  }
  if (positions.length === 0) return [];
  const pos = positions[rng.int(positions.length)]!;
  const ch = seed.charAt(pos);
  const runLen = 2 + rng.int(3);
  return [
    {
      mutator: `repeat-delim@${pos}x${runLen}`,
      seed,
      input: seed.slice(0, pos) + ch.repeat(runLen) + seed.slice(pos + 1),
    },
  ];
};

// Generate a small random ASCII printable + whitespace string. No seed
// dependency — used to widen coverage beyond the seed corpus.
export const randomSmall: Mutator = (_seed, rng) => {
  const len = 8 + rng.int(56);
  let out = '';
  for (let i = 0; i < len; i++) out += NOISE_CHARS.charAt(rng.int(NOISE_CHARS.length));
  return [{ mutator: `random-${len}`, seed: '<random>', input: out }];
};

// --- Registry --------------------------------------------------------------

export const allMutators: ReadonlyArray<Mutator> = [
  identity,
  truncate,
  duplicate,
  duplicateWithSeparator,
  insertNoise,
  swapAdjacent,
  deleteByte,
  replaceByte,
  repeatDelimiter,
  randomSmall,
];
