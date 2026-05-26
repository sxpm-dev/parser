// Aho-Corasick scanner builder + JS emitter for v2 .until() codegen.
//
// `buildAcScanner(stops)` constructs an Aho-Corasick automaton (trie +
// failure links) over a stop-literal set and exposes two operations:
//
//   - `scan(input, off)` — pure interpretation. O(n) scan that returns the
//     offset of the first occurrence of any stop in `input` starting at
//     `off`, or -1 if no stop appears. Used as the slow-but-obviously-
//     correct reference scanner for tests.
//
//   - `emitJs(inputVar, offVar)` — codegen. Returns a JS source snippet
//     that walks the automaton's state machine inline. The emitted code
//     reads from `inputVar`, writes back to `offVar` (advancing it to the
//     match-start offset, or to `inputVar.length` on no match), and falls
//     through. No runtime dependency — pure straight-line code over a
//     switch-on-state state machine.
//
// First-match semantics: we want the START offset of the first stop
// occurrence (not all occurrences), so the moment we land on a state whose
// `output` is non-null we return `off - patternLen + 1`. Output is folded
// across the failure chain at build time so each state carries the
// longest pattern reachable from it directly — no failure-chain walk at
// scan time.

import { jsString } from '../strings.ts';

export interface AcScanner {
  // Pure interpretation — slow but obviously correct.
  scan(input: string, off: number): number;

  // Codegen — emits JS source that does the same scan inline.
  // Reads `inputVar`, writes `offVar` (advanced to match-start offset, or
  // input.length if no match found). Falls through with `offVar` set.
  emitJs(inputVar: string, offVar: string): string;

  // Diagnostics — exposed for tests / benches.
  readonly stateCount: number;
}

// Internal automaton representation. Each state is identified by its index.
type Automaton = {
  readonly stateCount: number;
  // children[state] = Map<byte, nextState> for trie-goto (no failure links).
  readonly children: ReadonlyArray<ReadonlyMap<number, number>>;
  // delta[state] = Map<byte, nextState> where transitions follow failure
  // links closure. Bytes not in this map reset to delta[0][byte] (which
  // resets to 0 if byte not in alphabet).
  readonly delta: ReadonlyArray<ReadonlyMap<number, number>>;
  // output[state] = the pattern that matches at this state (longest along
  // the failure chain), or null if no pattern ends here.
  readonly output: ReadonlyArray<string | null>;
  // Set of all bytes that appear as a transition out of any state in delta
  // (used by the emitter to know which bytes need explicit branches).
  readonly alphabet: ReadonlySet<number>;
  // Length of the longest stop pattern. Used for the "earliest start"
  // bounded look-ahead: once we find a match starting at `s`, we only need
  // to scan up to `s + maxPatternLen - 1` to be sure no later match has an
  // even earlier start.
  readonly maxPatternLen: number;
};

export function buildAcScanner(stops: readonly string[]): AcScanner {
  const automaton = buildAutomaton(stops);

  return {
    stateCount: automaton.stateCount,

    scan(input, off) {
      const len = input.length;
      let state = 0;
      const root = automaton.delta[0]!;
      const maxLen = automaton.maxPatternLen;
      // bestStart tracks the earliest start position of any match found
      // so far. -1 = no match yet. Stop scanning once `off >= bestStart
      // + maxLen` because any future match end-pos e' has e' >= off and
      // length at most maxLen, so its start is at least e' - maxLen + 1
      // >= bestStart — cannot improve on bestStart.
      let bestStart = -1;
      while (off < len) {
        const byte = input.charCodeAt(off);
        const transitions = automaton.delta[state]!;
        const next = transitions.get(byte);
        if (next !== undefined) {
          state = next;
        } else if (state !== 0) {
          // Re-dispatch from root for this byte without advancing off.
          // The delta closure already folded failure-chain recovery into
          // root, so a single root lookup is sufficient. We loop back to
          // the top of the while so the standard transition + match-check
          // path executes uniformly.
          state = root.get(byte) ?? 0;
          // Fall through to the match check below WITHOUT advancing off,
          // by manually invoking the same logic. To avoid duplicating it
          // we just re-run the loop iteration: we already updated state,
          // now check output then advance.
        }
        const matched = automaton.output[state];
        if (matched !== null && matched !== undefined) {
          const candStart = off - matched.length + 1;
          if (bestStart === -1 || candStart < bestStart) bestStart = candStart;
        }
        off++;
        if (bestStart !== -1 && off >= bestStart + maxLen) break;
      }
      return bestStart;
    },

    emitJs(inputVar, offVar) {
      return emitJsScanner(automaton, inputVar, offVar);
    },
  };
}

// --- automaton construction -------------------------------------------------

function buildAutomaton(stops: readonly string[]): Automaton {
  // Filter empty stops — they would match at every position which is
  // never useful for .until() and would short-circuit construction.
  const patterns = stops.filter((s) => s.length > 0);
  if (patterns.length === 0) {
    // Degenerate: no stops. One state, no transitions, no output.
    return {
      stateCount: 1,
      children: [new Map()],
      delta: [new Map()],
      output: [null],
      alphabet: new Set(),
      maxPatternLen: 0,
    };
  }

  let maxPatternLen = 0;
  for (const p of patterns) if (p.length > maxPatternLen) maxPatternLen = p.length;

  // 1. Build trie. State 0 is the root.
  const children: Map<number, number>[] = [new Map()];
  // ownPattern[state] = the pattern whose last byte is at this trie node,
  // or null if none.
  const ownPattern: (string | null)[] = [null];

  for (const pattern of patterns) {
    let cur = 0;
    for (let i = 0; i < pattern.length; i++) {
      const byte = pattern.charCodeAt(i);
      let next = children[cur]!.get(byte);
      if (next === undefined) {
        next = children.length;
        children.push(new Map());
        ownPattern.push(null);
        // Wire the new node into its parent.
        children[cur]!.set(byte, next);
      }
      cur = next;
    }
    // If multiple patterns share the same trie endpoint (duplicate input),
    // keep the first one. Same string → same length, no ambiguity.
    if (ownPattern[cur] === null) ownPattern[cur] = pattern;
  }

  const stateCount = children.length;

  // 2. Compute failure links via BFS. fail[0] = 0 (sentinel).
  const fail: number[] = new Array(stateCount).fill(0);
  const output: (string | null)[] = ownPattern.slice();

  const queue: number[] = [];
  // Initialize: every depth-1 state's failure link is root.
  for (const [, child] of children[0]!) {
    fail[child] = 0;
    queue.push(child);
  }

  while (queue.length > 0) {
    const state = queue.shift()!;
    for (const [byte, child] of children[state]!) {
      // Failure link for `child`: walk the parent's failure chain.
      let f = fail[state]!;
      while (f !== 0 && !children[f]!.has(byte)) {
        f = fail[f]!;
      }
      const candidate = children[f]!.get(byte);
      fail[child] = candidate !== undefined && candidate !== child ? candidate : 0;

      // Fold output along the failure chain. The longest pattern reachable
      // from `child` is either its own pattern OR the failure target's
      // output (whichever is longer / non-null). For first-match
      // semantics we always prefer the LONGER pattern when there's a
      // choice — but in practice with first-match scan, hitting a state
      // with a shorter overlapping pattern from the failure chain means
      // we already would have matched earlier when traversing. So the
      // OWN pattern (longer prefix from root) is what we want IF non-
      // null; otherwise use the failure chain's output.
      if (output[child] === null) {
        output[child] = output[fail[child]!]!;
      }

      queue.push(child);
    }
  }

  // 3. Compute the delta closure: for each (state, byte) pair where state
  // has any forward transition, the next state. We only store entries
  // that match a child OR a non-root failure-induced transition; bytes
  // not present in delta[state] mean "fall back to delta[0][byte] (or 0)".
  //
  // For the emitter we want a complete picture per state, so we walk
  // every byte in the alphabet and resolve its transition.
  const alphabet = new Set<number>();
  for (const pattern of patterns) {
    for (let i = 0; i < pattern.length; i++) {
      alphabet.add(pattern.charCodeAt(i));
    }
  }

  const delta: Map<number, number>[] = [];
  for (let state = 0; state < stateCount; state++) {
    const transitions = new Map<number, number>();
    for (const byte of alphabet) {
      const direct = children[state]!.get(byte);
      if (direct !== undefined) {
        transitions.set(byte, direct);
        continue;
      }
      if (state === 0) {
        // Root: no transition on this byte → stay at 0. Don't emit an
        // entry (saves size; absent = 0).
        continue;
      }
      // Walk failure chain.
      let f = fail[state]!;
      while (f !== 0 && !children[f]!.has(byte)) {
        f = fail[f]!;
      }
      const next = children[f]!.get(byte) ?? 0;
      if (next !== 0) transitions.set(byte, next);
      // If next === 0 we elide the entry (default behavior = 0).
    }
    delta.push(transitions);
  }

  return {
    stateCount,
    children,
    delta,
    output,
    alphabet,
    maxPatternLen,
  };
}

// --- JS emitter -------------------------------------------------------------

function emitJsScanner(
  automaton: Automaton,
  inputVar: string,
  offVar: string,
): string {
  const { stateCount, delta, output, maxPatternLen } = automaton;

  // Special case: no patterns. Just advance to end and return.
  if (stateCount === 1 && delta[0]!.size === 0) {
    return `${offVar} = ${inputVar}.length;`;
  }

  // The emitted scanner mirrors the library's "earliest-start with
  // bounded look-ahead" algorithm:
  //
  //   1. Walk the AC state machine byte by byte.
  //   2. On entering a state with non-null output (a match candidate),
  //      compute start = off - patternLen + 1 and update __acBest if
  //      smaller.
  //   3. After updating __acBest, check the look-ahead bound: if
  //      off + 1 > __acBest + maxPatternLen - 1, no later match can
  //      have an earlier start → break.
  //   4. At loop exit, off = __acBest (if any match) or input.length.
  //
  // Each state is a switch case. Transitions on bytes within the
  // alphabet update __acState; other bytes either re-dispatch from
  // root (non-root state) or stay at 0 (root state) without advancing.
  const lines: string[] = [];
  lines.push(`{`);
  lines.push(`  let __acState = 0;`);
  lines.push(`  const __acLen = ${inputVar}.length;`);
  lines.push(`  let __acBest = -1;`);
  lines.push(`  const __acMaxLen = ${maxPatternLen};`);
  lines.push(`  while (${offVar} < __acLen) {`);
  lines.push(`    const __acC = ${inputVar}.charCodeAt(${offVar});`);
  lines.push(`    switch (__acState) {`);

  for (let state = 0; state < stateCount; state++) {
    lines.push(`      case ${state}: {`);
    const transitions = delta[state]!;
    if (transitions.size === 0) {
      // No outgoing transitions. Drop to state 0 (no advance happens
      // here — the outer loop's offVar++ at the bottom handles it).
      lines.push(`        __acState = 0;`);
      lines.push(`        break;`);
      lines.push(`      }`);
      continue;
    }

    // Emit one branch per transition byte. Sort by byte for stable output.
    const sorted = [...transitions.entries()].sort(([a], [b]) => a - b);
    let firstBranch = true;
    for (const [byte, next] of sorted) {
      const matched = output[next];
      const guard = firstBranch ? 'if' : 'else if';
      firstBranch = false;
      if (matched !== null && matched !== undefined) {
        // Transition into a matching state — record candidate start and
        // continue scanning (bounded look-ahead in the outer loop will
        // break once no earlier-starting match is possible).
        const startExpr = `${offVar} - ${matched.length - 1}`;
        lines.push(`        ${guard} (__acC === ${byte}) {`);
        lines.push(`          const __acStart = ${startExpr};`);
        lines.push(`          if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;`);
        lines.push(`          __acState = ${next};`);
        lines.push(`          break;`);
        lines.push(`        }`);
      } else {
        lines.push(`        ${guard} (__acC === ${byte}) { __acState = ${next}; break; }`);
      }
    }
    // Default branch: byte not in state's transition table.
    if (state === 0) {
      // Root: stay at 0, advance.
      lines.push(`        else { break; }`);
    } else {
      // Non-root: re-dispatch from root for this same byte WITHOUT
      // advancing off. The outer loop will re-read the byte at state 0.
      lines.push(`        else { __acState = 0; continue; }`);
    }
    lines.push(`      }`);
  }

  lines.push(`    }`);
  lines.push(`    ${offVar}++;`);
  lines.push(`    if (__acBest !== -1 && ${offVar} >= __acBest + __acMaxLen) break;`);
  lines.push(`  }`);
  lines.push(`  ${offVar} = __acBest === -1 ? __acLen : __acBest;`);
  lines.push(`}`);
  return lines.join('\n');
}

// jsString is re-exported for callers (e.g., the .until() emitter wiring in
// Task 4.3) that want to inline literal stops alongside emitted scanner
// code without re-importing the helper.
export { jsString };
