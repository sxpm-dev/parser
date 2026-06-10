// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"nodes\",\"{\",\"selector\",\",\",\">\",\"+\",\"~\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",460],[\"AtRule#1\",662],[\"AtRule#dispatch\",737],[\"Stylesheet#0\",764]],\"renderOffsets\":[[\"Comment#0:ast\",895],[\"Comment#0:json\",924],[\"Comment#0:source\",926],[\"Declaration#0:ast\",952],[\"Declaration#0:json\",1014],[\"Declaration#0:source\",1016],[\"Declaration#1:ast\",1067],[\"Declaration#1:json\",1110],[\"Declaration#1:source\",1149],[\"Rule#0:ast\",1185],[\"Rule#0:json\",1228],[\"Rule#0:source\",1281],[\"AtRule#0:ast\",1317],[\"AtRule#0:json\",1374],[\"AtRule#0:source\",1376],[\"AtRule#1:ast\",1432],[\"AtRule#1:json\",1475],[\"AtRule#1:source\",1477],[\"Stylesheet#0:ast\",1518],[\"Stylesheet#0:json\",1547],[\"Stylesheet#0:source\",1572]],\"stringifyOffsets\":[[\"Comment#0:ast\",1588],[\"Comment#0:json\",1643],[\"Comment#0:source\",1677],[\"Declaration#0:ast\",1740],[\"Declaration#0:json\",1857],[\"Declaration#0:source\",1916],[\"Declaration#1:ast\",2030],[\"Declaration#1:source\",2119],[\"Rule#0:ast\",2205],[\"Rule#0:source\",2291],[\"AtRule#0:ast\",2377],[\"AtRule#0:json\",2501],[\"AtRule#0:source\",2565],[\"AtRule#1:ast\",2684],[\"AtRule#1:json\",2772],[\"AtRule#1:source\",2821],[\"Stylesheet#0:ast\",2912],[\"Stylesheet#0:source\",2966]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1588]],[\"Comment:json\",[1643]],[\"Comment:source\",[1677]],[\"Declaration:ast\",[1740,2030]],[\"Declaration:json\",[1857]],[\"Declaration:source\",[1916,2119]],[\"Rule:ast\",[2205]],[\"Rule:source\",[2291]],[\"AtRule:ast\",[2377,2684]],[\"AtRule:json\",[2501,2772]],[\"AtRule:source\",[2565,2821]],[\"Stylesheet:ast\",[2912]],[\"Stylesheet:source\",[2966]],[\"AtRule|Comment|Declaration|Rule:ast\",[2377,2684,1588,1740,2030,2205]],[\"AtRule|Comment|Declaration|Rule:source\",[2565,2821,1677,1916,2119,2291]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1588],[\"Comment:json\",1643],[\"Comment:source\",1677],[\"Declaration:ast\",1740],[\"Declaration:json\",1857],[\"Declaration:source\",1916],[\"Rule:ast\",2205],[\"Rule:source\",2291],[\"AtRule:ast\",2377],[\"AtRule:json\",2501],[\"AtRule:source\",2565],[\"Stylesheet:ast\",2912],[\"Stylesheet:source\",2966]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
