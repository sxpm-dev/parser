// Shared-helper registry — content-hash-deduped emission of module-level
// helper functions and constants for the v2 backend.
//
// Motivation: the v2 emitters historically inlined their scan/skip snippets
// at every call site — ws-skip loops, comment skips, the balanced
// until-scan kernel, and 256-entry known-byte tables were stamped out per
// span per production per fused variant. The machine code is identical per
// distinct configuration, so the duplication bought nothing at runtime and
// cost hundreds of KB per generated parser. This module collapses each
// distinct snippet configuration to ONE module-level helper, emitted once
// and named by a content hash so identical bodies dedupe and different
// bodies can never collide.
//
// Collection protocol mirrors until-guard.ts (see its header for why a
// module registry instead of a threaded sink): `beginSharedHelpers()` opens
// the collection, emitters register sources during emission,
// `drainSharedHelpers()` closes it and returns the sources. Emission is
// fully synchronous, so begin/drain pairs cannot interleave. When no
// collection is open (standalone inline emission of a sub-schema), every
// emitter in this module falls back to the previous inline snippet, so the
// standalone path stays self-contained.
//
// Secondary kernel outputs travel through the `__u*` scratch slots declared
// in the V2 runtime preamble (see runtime.ts): a kernel returns the new
// offset and deposits lastNonWs / depth / comments / fail into the slots;
// the call site reads them immediately after the call returns. Parsing is
// synchronous and kernels are leaf calls, so a slot cannot be clobbered
// between write and read.

let registry: Map<string, string> | null = null;

export function beginSharedHelpers(): void {
  registry = new Map();
}

export function drainSharedHelpers(): string[] {
  const out = registry === null ? [] : [...registry.values()];
  registry = null;
  return out;
}

export function sharedHelpersOpen(): boolean {
  return registry !== null;
}

/** Register a helper whose source contains the placeholder `@@NAME@@`.
 *  The final name is `<prefix>_<fnv-of-source>` so identical bodies dedupe
 *  and different bodies cannot collide. Returns the resolved name. Throws
 *  when no collection is open — callers must check sharedHelpersOpen()
 *  and fall back to inline emission. */
export function registerHelper(prefix: string, source: string): string {
  if (registry === null) {
    throw new Error('shared-helper registry not open (use sharedHelpersOpen() and fall back inline)');
  }
  const name = `${prefix}_${fnvHash(source)}`;
  if (!registry.has(name)) {
    registry.set(name, source.replaceAll('@@NAME@@', name));
  }
  return name;
}

/** Register a helper with a FIXED name (for constant bodies that have no
 *  per-site configuration). Returns false when no collection is open. */
export function registerFixedHelper(name: string, source: string): boolean {
  if (registry === null) return false;
  if (!registry.has(name)) registry.set(name, source);
  return true;
}

// --- whitespace / comment skip ----------------------------------------------

const SKIP_WS_FN = `function __skipWs(input: string, off: number, len: number): number {
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  return off;
}`;

function skipWsInline(offVar: string, lenVar: string): string {
  return `while (${offVar} < ${lenVar}) { const c = input.charCodeAt(${offVar}); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { ${offVar}++; continue; } break; }`;
}

/** Statement that advances `offVar` past horizontal/vertical whitespace.
 *  Registry open → call to the shared `__skipWs`; closed → the historical
 *  inline loop (byte-identical to the previous emit). */
export function skipWsStmt(offVar = 'off', lenVar = 'len'): string {
  if (registry === null) return skipWsInline(offVar, lenVar);
  registerFixedHelper('__skipWs', SKIP_WS_FN);
  return `${offVar} = __skipWs(input, ${offVar}, ${lenVar});`;
}

function skipWsCommentsBody(lineCommentMarkers: ReadonlyArray<string>): string {
  const lineCheck = lineCommentMarkers.length === 0
    ? ''
    : lineCommentMarkers.map((marker) => {
        const m = JSON.stringify(marker);
        return `
    if (input.startsWith(${m}, off)) {
      off += ${marker.length};
      while (off < len && input.charCodeAt(off) !== 0x0a) off++;
      if (off < len) off++;
      continue;
    }`;
      }).join('');
  return `  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }${lineCheck}
    break;
  }`;
}

/** Statement that advances `offVar` past ws, `/* *​/` block comments, and
 *  (when declared) line comments. Helper name is content-hashed over the
 *  line-comment marker set. */
export function skipWsCommentsStmt(
  lineCommentMarkers: ReadonlyArray<string> = [],
  offVar = 'off',
  lenVar = 'len',
): string {
  if (registry === null) return skipWsCommentsInline(lineCommentMarkers, offVar, lenVar);
  const source = `function @@NAME@@(input: string, off: number, len: number): number {
${skipWsCommentsBody(lineCommentMarkers)}
  return off;
}`;
  const name = registerHelper('__skipWsC', source);
  return `${offVar} = ${name}(input, ${offVar}, ${lenVar});`;
}

/** Historical inline form — kept for the standalone-inline fallback path. */
export function skipWsCommentsInline(
  lineCommentMarkers: ReadonlyArray<string> = [],
  offVar = 'off',
  lenVar = 'len',
): string {
  const lineCheck = lineCommentMarkers.length === 0
    ? ''
    : lineCommentMarkers.map((marker) => {
        const m = JSON.stringify(marker);
        return `  if (input.startsWith(${m}, ${offVar})) {
    ${offVar} += ${marker.length};
    while (${offVar} < ${lenVar} && input.charCodeAt(${offVar}) !== 0x0a) ${offVar}++;
    if (${offVar} < ${lenVar}) ${offVar}++;
    continue;
  }`;
      }).join('\n');
  return `while (${offVar} < ${lenVar}) {
  const c = input.charCodeAt(${offVar});
  if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { ${offVar}++; continue; }
  if (c === 0x2f && ${offVar} + 1 < ${lenVar} && input.charCodeAt(${offVar} + 1) === 0x2a) {
    ${offVar} += 2;
    while (${offVar} < ${lenVar} && !(input.charCodeAt(${offVar}) === 0x2a && ${offVar} + 1 < ${lenVar} && input.charCodeAt(${offVar} + 1) === 0x2f)) ${offVar}++;
    if (${offVar} < ${lenVar}) ${offVar} += 2;
    continue;
  }
${lineCheck}
  break;
}`;
}

// Leading ws+block-comment skip for .until() captures. Differs from
// __skipWsC_*: the capture's empty-anchor logic needs the end offset of the
// LAST skipped comment, deposited into the __uLastCommentEnd scratch slot
// (-1 when no comment was skipped).
const SKIP_WS_C_LEAD_FN = `function __skipWsCLead(input: string, off: number, len: number): number {
  let lastEnd = -1;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      lastEnd = off;
      continue;
    }
    break;
  }
  __uLastCommentEnd = lastEnd;
  return off;
}`;

/** Register the leading ws+comment skip used by comment-aware until
 *  captures. Returns the helper name, or null when no collection is open. */
export function skipWsCLeadHelper(): string | null {
  if (registry === null) return null;
  registerFixedHelper('__skipWsCLead', SKIP_WS_C_LEAD_FN);
  return '__skipWsCLead';
}

// --- known-byte tables --------------------------------------------------------

const UNPACK_KB_FN = `function __unpackKB(hex: string): Uint8Array {
  const out = new Uint8Array(256);
  for (let i = 0; i < 256; i++) out[i] = (parseInt(hex[i >> 2], 16) >> (i & 3)) & 1;
  return out;
}`;

/** Register a known-bytes viability table as a hash-named module constant,
 *  packed as a 64-hex-char bitset (vs the ~512-byte array literal). Returns
 *  the constant's name, or null when no collection is open (caller falls
 *  back to a local array literal). Lookup semantics are unchanged:
 *  `__KB_x[c] === 0` — out-of-range char codes (> 255) index past the
 *  Uint8Array and yield undefined, which `=== 0` rejects, exactly like the
 *  previous 256-entry plain-array literal. */
export function kbConst(knownBytes: Uint8Array): string | null {
  if (registry === null) return null;
  registerFixedHelper('__unpackKB', UNPACK_KB_FN);
  let hex = '';
  for (let i = 0; i < 256; i += 4) {
    const nibble =
      (knownBytes[i] ? 1 : 0) |
      (knownBytes[i + 1] ? 2 : 0) |
      (knownBytes[i + 2] ? 4 : 0) |
      (knownBytes[i + 3] ? 8 : 0);
    hex += nibble.toString(16);
  }
  const name = `__KB_${fnvHash(hex)}`;
  if (registry !== null && !registry.has(name)) {
    registry.set(name, `const ${name} = __unpackKB(${JSON.stringify(hex)});`);
  }
  return name;
}

// --- misc pure helpers --------------------------------------------------------

const SLICE_OMIT_COMMENTS_FN = `function __sliceOmitComments(input: string, start: number, end: number, comments: [number, number][]): string {
  let buf = '';
  let cursor = start;
  const len = input.length;
  for (let i = 0; i < comments.length; i++) {
    const cs = comments[i][0];
    const ce = comments[i][1];
    if (ce > end) break;
    const before = cs > 0 ? input.charCodeAt(cs - 1) : -1;
    const after = ce < len ? input.charCodeAt(ce) : -1;
    const wsBefore = before === 0x20 || before === 0x09 || before === 0x0a || before === 0x0d;
    const wsAfter = after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d;
    if (!(wsBefore || wsAfter)) continue;
    buf += input.slice(cursor, cs);
    cursor = ce;
  }
  return buf + input.slice(cursor, end);
}`;

/** Register the ws-adjacent-comment-omitting slice builder (the epilogue of
 *  comment-aware until captures). Returns the helper name, or null when no
 *  collection is open. */
export function sliceOmitCommentsHelper(): string | null {
  if (registry === null) return null;
  registerFixedHelper('__sliceOmitComments', SLICE_OMIT_COMMENTS_FN);
  return '__sliceOmitComments';
}

function fnvHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
