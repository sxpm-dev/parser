// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"nodes\",\"{\",\"selector\",\",\",\">\",\"+\",\"~\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",465],[\"AtRule#1\",672],[\"AtRule#dispatch\",747],[\"Stylesheet#0\",774]],\"renderOffsets\":[[\"Comment#0:ast\",910],[\"Comment#0:json\",939],[\"Comment#0:source\",941],[\"Declaration#0:ast\",967],[\"Declaration#0:json\",1029],[\"Declaration#0:source\",1031],[\"Declaration#1:ast\",1082],[\"Declaration#1:json\",1125],[\"Declaration#1:source\",1164],[\"Rule#0:ast\",1200],[\"Rule#0:json\",1243],[\"Rule#0:source\",1296],[\"AtRule#0:ast\",1332],[\"AtRule#0:json\",1389],[\"AtRule#0:source\",1391],[\"AtRule#1:ast\",1447],[\"AtRule#1:json\",1490],[\"AtRule#1:source\",1492],[\"Stylesheet#0:ast\",1533],[\"Stylesheet#0:json\",1562],[\"Stylesheet#0:source\",1587]],\"stringifyOffsets\":[[\"Comment#0:ast\",1603],[\"Comment#0:json\",1658],[\"Comment#0:source\",1692],[\"Declaration#0:ast\",1755],[\"Declaration#0:json\",1872],[\"Declaration#0:source\",1931],[\"Declaration#1:ast\",2045],[\"Declaration#1:source\",2134],[\"Rule#0:ast\",2220],[\"Rule#0:source\",2306],[\"AtRule#0:ast\",2392],[\"AtRule#0:json\",2516],[\"AtRule#0:source\",2580],[\"AtRule#1:ast\",2699],[\"AtRule#1:json\",2787],[\"AtRule#1:source\",2836],[\"Stylesheet#0:ast\",2927],[\"Stylesheet#0:source\",2981]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1603]],[\"Comment:json\",[1658]],[\"Comment:source\",[1692]],[\"Declaration:ast\",[1755,2045]],[\"Declaration:json\",[1872]],[\"Declaration:source\",[1931,2134]],[\"Rule:ast\",[2220]],[\"Rule:source\",[2306]],[\"AtRule:ast\",[2392,2699]],[\"AtRule:json\",[2516,2787]],[\"AtRule:source\",[2580,2836]],[\"Stylesheet:ast\",[2927]],[\"Stylesheet:source\",[2981]],[\"AtRule|Comment|Declaration|Rule:ast\",[2392,2699,1603,1755,2045,2220]],[\"AtRule|Comment|Declaration|Rule:source\",[2580,2836,1692,1931,2134,2306]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1603],[\"Comment:json\",1658],[\"Comment:source\",1692],[\"Declaration:ast\",1755],[\"Declaration:json\",1872],[\"Declaration:source\",1931],[\"Rule:ast\",2220],[\"Rule:source\",2306],[\"AtRule:ast\",2392],[\"AtRule:json\",2516],[\"AtRule:source\",2580],[\"Stylesheet:ast\",2927],[\"Stylesheet:source\",2981]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
const __OPS_B64: string = "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";
const __DECODED = decodeSchema(__SCHEMA_JSON, __OPS_B64);
const __defaultTarget: string | undefined = undefined;

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
