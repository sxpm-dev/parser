// Auto-generated from packages/iso-duration/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"DateUnit#0\",\"DateUnit#1\",\"DateUnit#2\",\"DateUnit#3\",\"DateUnit#dispatch\",\"TimeUnit#0\",\"TimeUnit#1\",\"TimeUnit#2\",\"TimeUnit#dispatch\",\"Duration#0\",\"Duration#1\",\"Duration#dispatch\",\"int\",\"value\",\"Y\",\"M\",\"W\",\"D\",\"H\",\"S\",\"P\",\"date\",\"T\",\"time\",\"years\",\"ast\",\"type\",\"source\",\"months\",\"weeks\",\"days\",\"hours\",\"minutes\",\"seconds\",\"duration\",\"\",\"DateUnit\",\"TimeUnit\"],\"numberPool\":[],\"productionOffsets\":[[\"DateUnit#0\",0],[\"DateUnit#1\",34],[\"DateUnit#2\",68],[\"DateUnit#3\",102],[\"DateUnit#dispatch\",136],[\"TimeUnit#0\",189],[\"TimeUnit#1\",223],[\"TimeUnit#2\",257],[\"TimeUnit#dispatch\",291],[\"Duration#0\",331],[\"Duration#1\",404],[\"Duration#dispatch\",530]],\"renderOffsets\":[[\"DateUnit#0:ast\",557],[\"DateUnit#0:source\",586],[\"DateUnit#1:ast\",607],[\"DateUnit#1:source\",636],[\"DateUnit#2:ast\",657],[\"DateUnit#2:source\",686],[\"DateUnit#3:ast\",707],[\"DateUnit#3:source\",736],[\"TimeUnit#0:ast\",757],[\"TimeUnit#0:source\",786],[\"TimeUnit#1:ast\",807],[\"TimeUnit#1:source\",836],[\"TimeUnit#2:ast\",857],[\"TimeUnit#2:source\",886],[\"Duration#0:ast\",907],[\"Duration#0:source\",936],[\"Duration#1:ast\",957],[\"Duration#1:source\",1000]],\"stringifyOffsets\":[[\"DateUnit#0:ast\",1036],[\"DateUnit#0:source\",1086],[\"DateUnit#1:ast\",1144],[\"DateUnit#1:source\",1194],[\"DateUnit#2:ast\",1252],[\"DateUnit#2:source\",1302],[\"DateUnit#3:ast\",1360],[\"DateUnit#3:source\",1410],[\"TimeUnit#0:ast\",1468],[\"TimeUnit#0:source\",1518],[\"TimeUnit#1:ast\",1576],[\"TimeUnit#1:source\",1626],[\"TimeUnit#2:ast\",1684],[\"TimeUnit#2:source\",1734],[\"Duration#0:ast\",1792],[\"Duration#0:source\",1857],[\"Duration#1:ast\",1915],[\"Duration#1:source\",2016]],\"stringifyOffsetsByNodeType\":[[\"DateUnit:ast\",[1036,1144,1252,1360]],[\"DateUnit:source\",[1086,1194,1302,1410]],[\"TimeUnit:ast\",[1468,1576,1684]],[\"TimeUnit:source\",[1518,1626,1734]],[\"Duration:ast\",[1792,1915]],[\"Duration:source\",[1857,2016]]],\"stringifyDispatcherOffsets\":[[\"DateUnit:ast\",1036],[\"DateUnit:source\",1086],[\"TimeUnit:ast\",1468],[\"TimeUnit:source\",1518],[\"Duration:ast\",1792],[\"Duration:source\",1857]],\"rootProductionKey\":\"Duration#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "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";
const __DECODED = decodeSchema(__SCHEMA_JSON, __OPS_B64);
const __defaultTarget: string | undefined = "ast";

export function __parse(input: string, options?: { mode?: string }): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode !== 'fast') {
    throw new Error("bytecode-backend parser only supports 'fast' mode; use the TS backend for 'raws'");
  }
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  const state = {
    input,
    ops: __DECODED.ops,
    stringPool: __DECODED.stringPool,
    numberPool: __DECODED.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [] as unknown[],
    operatorLiterals: __DECODED.operatorLiterals,
  };
  const rootOffset = __DECODED.productionOffsets.get(__DECODED.rootProductionKey);
  if (rootOffset === undefined) {
    throw new Error("bytecode-backend parser: missing root production offset for '" + __DECODED.rootProductionKey + "'");
  }
  const captures = runParse(state, rootOffset);
  if (captures === null) {
    throw syntaxErrorAt(input, state.maxOff > state.off ? state.maxOff : state.off);
  }
  // Trailing-whitespace skip before the EOF check. Mirrors v2's
  // __parse trailing skip — fixtures with trailing \n / spaces /
  // tabs would otherwise fail the EOF check at state.off=len-1.
  while (state.off < input.length) {
    const c = input.charCodeAt(state.off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { state.off++; continue; }
    break;
  }
  if (state.off !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.off ? state.maxOff : state.off);
  }
  return captures;
}

export function render(input: string, options?: { target?: string; mode?: string }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  const captures = __parse(input, options);
  return runRender(__DECODED, captures, target);
}

export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
  }
  return runStringify(__DECODED, value, target);
}
