// Per-class inline scanners for scannerless emit. Each function returns a
// JS snippet that scans the class at `__off` (a function-scope local that
// the caller has hoisted from state.off). The snippet advances `__off`
// through the matched bytes and binds the captured text (or null) to
// `let <varName>` declared by the snippet.
//
// All snippets reference function-scope locals:
//   __input  — const, state.input
//   __len    — const, state.input.length
//   __off    — let, current source offset (managed by caller)
//
// These are the scannerless equivalents of the per-class branches in the
// (tokenized) emit/tokenize.ts.

import type { ResolvedSpan } from '../../model.ts';

export type ClassScanOptions = {
  readonly optional: boolean;
  // When false, the scanner advances `__off` through the matched bytes
  // but does NOT slice the input into a string. Saves a per-call string
  // allocation when the value is not consumed downstream.
  readonly needsValue?: boolean;
};

// Emit a snippet that scans the class identified by `span` starting at
// `__off`. On success, advances `__off` and (if needsValue) binds the
// captured text to `let <varName>`. For mandatory spans throws SyntaxError
// on miss. For optional spans, leaves `__off` unchanged and binds
// varName = null on miss.
//
// The snippet always declares `const __<varName>_s` holding the offset at
// which scanning began (used later by emitClassOffsetVars).
export function emitClassScan(
  span: ResolvedSpan,
  varName: string,
  options: ClassScanOptions,
): string {
  const { class: cls, refinements } = span;
  const refSet = new Set(refinements.map((r) => r.name));
  if (cls === 'ident' && refSet.has('html')) return emitHtmlIdentScan(varName, options);
  if (cls === 'ident' && refSet.has('js')) return emitJsIdentScan(varName, options);
  if (cls === 'ident') return emitCssIdentScan(varName, options); // css or no refinement
  if (cls === 'number') return emitNumberScan(varName, options);
  if (cls === 'hex') return emitHexScan(varName, options);
  if (cls === 'string') return emitStringScan(varName, options);
  if (cls === 'comment') return emitCommentScan(varName, options);
  throw new Error(`scannerless: class '${cls}' with refinements [${[...refSet].join(',')}] not implemented`);
}

// Emit `__<varName>_start` / `__<varName>_end` constants for callers that
// need the span's source range (raws mode or $.gap/$.tail/$.raw refs).
// For optional spans the offsets collapse to `__off` when null.
export function emitClassOffsetVars(varName: string, options: ClassScanOptions): string {
  const startVar = `__${varName}_start`;
  const endVar = `__${varName}_end`;
  if (options.optional) {
    return `const ${startVar} = ${varName} !== null ? __${varName}_s : __off;
const ${endVar} = ${varName} !== null ? __off : ${startVar};`;
  }
  return `const ${startVar} = __${varName}_s;
const ${endVar} = __off;`;
}

// Emit the scan snippet for a class. Uses function-scope locals __off,
// __input, __len which the production body wrapper must declare.
function wrapScan(v: string, opts: ClassScanOptions, leadExpr: string, scanBody: string, kindLabel: string): string {
  const valueDecl = opts.needsValue === false
    ? ''
    : opts.optional
      ? `let ${v} = null;`
      : `let ${v};`;
  // Mandatory: error directly. Optional: skip silently when leadExpr fails.
  if (opts.optional) {
    return `const __${v}_s = __off;
${valueDecl}
if (${leadExpr}) {
${scanBody}
${opts.needsValue === false ? '' : `  ${v} = __input.slice(__${v}_s, __off);`}
}`;
  }
  return `const __${v}_s = __off;
${valueDecl}
if (!(${leadExpr})) throw new SyntaxError("expected ${kindLabel} at position " + __${v}_s);
${scanBody}
${opts.needsValue === false ? '' : `${v} = __input.slice(__${v}_s, __off);`}`;
}

function emitCssIdentScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `(isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c)`;
  const body = `  {
    const __c0 = __input.charCodeAt(__off);
    __off++;
    if (__c0 === 0x5c) {
      if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
        let __n = 0;
        while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
        if (__off < __len) {
          const __w = __input.charCodeAt(__off);
          if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
        }
      } else if (__off < __len) {
        __off++;
      }
    }
    while (__off < __len) {
      const __c2 = __input.charCodeAt(__off);
      if (__c2 === 0x5c) {
        __off++;
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
        continue;
      }
      if (!isCssIdentPart(__c2)) break;
      __off++;
    }
    // Raw url(...) tokenization (matches tokenized backend).
    if (
      __off - __${v}_s === 3
      && __off < __len
      && __input.charCodeAt(__off) === 0x28
      && (__input.charCodeAt(__${v}_s) | 32) === 0x75
      && (__input.charCodeAt(__${v}_s + 1) | 32) === 0x72
      && (__input.charCodeAt(__${v}_s + 2) | 32) === 0x6c
    ) {
      __off++;
      while (__off < __len) {
        const __cu = __input.charCodeAt(__off);
        if (__cu === 0x29) { __off++; break; }
        if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
        if (__cu === 0x22 || __cu === 0x27) {
          const __q = __cu;
          __off++;
          while (__off < __len) {
            const __ch = __input.charCodeAt(__off);
            if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
            if (__ch === __q) { __off++; break; }
            if (__ch === 0x0a || __ch === 0x0d) break;
            __off++;
          }
          continue;
        }
        __off++;
      }
    }
  }`;
  return wrapScan(v, opts, leadExpr, body, 'ident');
}

function emitHtmlIdentScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `isCssIdentStart(__input.charCodeAt(__off))`;
  const body = `  __off++;
  while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;`;
  return wrapScan(v, opts, leadExpr, body, 'ident');
}

function emitJsIdentScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `isJsIdentStart(__input.charCodeAt(__off))`;
  const body = `  __off++;
  while (__off < __len && isJsIdentPart(__input.charCodeAt(__off))) __off++;`;
  return wrapScan(v, opts, leadExpr, body, 'ident');
}

function emitNumberScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `isDigit(__input.charCodeAt(__off))`;
  const body = `  __off++;
  while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
  if (__off < __len && __input.charCodeAt(__off) === 0x2e && __off + 1 < __len && isDigit(__input.charCodeAt(__off + 1))) {
    __off++;
    while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
  }
  {
    const __ec = __off < __len ? __input.charCodeAt(__off) : 0;
    if (__ec === 0x65 || __ec === 0x45) {
      let __j = __off + 1;
      if (__j < __len && (__input.charCodeAt(__j) === 0x2b || __input.charCodeAt(__j) === 0x2d)) __j++;
      if (__j < __len && isDigit(__input.charCodeAt(__j))) {
        __off = __j;
        while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
      }
    }
  }`;
  return wrapScan(v, opts, leadExpr, body, 'number');
}

function emitHexScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `isHexDigit(__input.charCodeAt(__off))`;
  const body = `  __off++;
  while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;`;
  return wrapScan(v, opts, leadExpr, body, 'hex');
}

function emitStringScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `(__input.charCodeAt(__off) === 0x22 || __input.charCodeAt(__off) === 0x27)`;
  const body = `  {
    const __quote = __input.charCodeAt(__off);
    __off++;
    while (__off < __len) {
      const __ch = __input.charCodeAt(__off);
      if (__ch === 0x5c) { __off += 2; continue; }
      if (__ch === __quote) { __off++; break; }
      if (__ch === 0x0a || __ch === 0x0d) break;
      __off++;
    }
  }`;
  return wrapScan(v, opts, leadExpr, body, 'string');
}

function emitCommentScan(v: string, opts: ClassScanOptions): string {
  const leadExpr = `(__input.charCodeAt(__off) === 0x2f && __input.charCodeAt(__off + 1) === 0x2a)`;
  const body = `  __off += 2;
  while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
  if (__off < __len) __off += 2;`;
  return wrapScan(v, opts, leadExpr, body, 'comment');
}

// Char-class predicate snippet for peek/dispatch. Returns a JS expression
// that evaluates to true iff the byte at offsetExpr starts a span of the
// given class.
export function classStartPredicate(span: ResolvedSpan, offsetExpr: string): string {
  const { class: cls, refinements } = span;
  const refSet = new Set(refinements.map((r) => r.name));
  const cExpr = `__input.charCodeAt(${offsetExpr})`;
  if (cls === 'ident' && refSet.has('html')) return `isCssIdentStart(${cExpr})`;
  if (cls === 'ident' && refSet.has('js')) return `isJsIdentStart(${cExpr})`;
  if (cls === 'ident' && refSet.has('css')) return `(isCssIdentStart(${cExpr}) || ${cExpr} === 0x5c)`;
  if (cls === 'ident') return `(isCssIdentStart(${cExpr}) || ${cExpr} === 0x5c)`;
  if (cls === 'number') return `isDigit(${cExpr})`;
  if (cls === 'hex') return `isHexDigit(${cExpr})`;
  if (cls === 'string') return `(${cExpr} === 0x22 || ${cExpr} === 0x27)`;
  if (cls === 'comment') return `(${cExpr} === 0x2f && __input.charCodeAt(${offsetExpr} + 1) === 0x2a)`;
  return 'false';
}
