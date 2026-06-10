// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"nodes\",\"{\",\"selector\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",431],[\"AtRule#1\",633],[\"AtRule#dispatch\",708],[\"Stylesheet#0\",735]],\"renderOffsets\":[[\"Comment#0:ast\",866],[\"Comment#0:json\",895],[\"Comment#0:source\",897],[\"Declaration#0:ast\",923],[\"Declaration#0:json\",985],[\"Declaration#0:source\",987],[\"Declaration#1:ast\",1038],[\"Declaration#1:json\",1081],[\"Declaration#1:source\",1120],[\"Rule#0:ast\",1156],[\"Rule#0:json\",1199],[\"Rule#0:source\",1252],[\"AtRule#0:ast\",1288],[\"AtRule#0:json\",1345],[\"AtRule#0:source\",1347],[\"AtRule#1:ast\",1403],[\"AtRule#1:json\",1446],[\"AtRule#1:source\",1448],[\"Stylesheet#0:ast\",1489],[\"Stylesheet#0:json\",1518],[\"Stylesheet#0:source\",1543]],\"stringifyOffsets\":[[\"Comment#0:ast\",1559],[\"Comment#0:json\",1614],[\"Comment#0:source\",1648],[\"Declaration#0:ast\",1711],[\"Declaration#0:json\",1828],[\"Declaration#0:source\",1887],[\"Declaration#1:ast\",2001],[\"Declaration#1:source\",2090],[\"Rule#0:ast\",2176],[\"Rule#0:source\",2262],[\"AtRule#0:ast\",2348],[\"AtRule#0:json\",2472],[\"AtRule#0:source\",2536],[\"AtRule#1:ast\",2655],[\"AtRule#1:json\",2743],[\"AtRule#1:source\",2792],[\"Stylesheet#0:ast\",2883],[\"Stylesheet#0:source\",2937]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1559]],[\"Comment:json\",[1614]],[\"Comment:source\",[1648]],[\"Declaration:ast\",[1711,2001]],[\"Declaration:json\",[1828]],[\"Declaration:source\",[1887,2090]],[\"Rule:ast\",[2176]],[\"Rule:source\",[2262]],[\"AtRule:ast\",[2348,2655]],[\"AtRule:json\",[2472,2743]],[\"AtRule:source\",[2536,2792]],[\"Stylesheet:ast\",[2883]],[\"Stylesheet:source\",[2937]],[\"AtRule|Comment|Declaration|Rule:ast\",[2348,2655,1559,1711,2001,2176]],[\"AtRule|Comment|Declaration|Rule:source\",[2536,2792,1648,1887,2090,2262]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1559],[\"Comment:json\",1614],[\"Comment:source\",1648],[\"Declaration:ast\",1711],[\"Declaration:json\",1828],[\"Declaration:source\",1887],[\"Rule:ast\",2176],[\"Rule:source\",2262],[\"AtRule:ast\",2348],[\"AtRule:json\",2472],[\"AtRule:source\",2536],[\"Stylesheet:ast\",2883],[\"Stylesheet:source\",2937]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
