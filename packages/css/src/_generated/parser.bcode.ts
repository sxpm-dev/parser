// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"nodes\",\"{\",\"selector\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",438],[\"AtRule#1\",647],[\"AtRule#dispatch\",722],[\"Stylesheet#0\",749]],\"renderOffsets\":[[\"Comment#0:ast\",887],[\"Comment#0:json\",916],[\"Comment#0:source\",918],[\"Declaration#0:ast\",944],[\"Declaration#0:json\",1006],[\"Declaration#0:source\",1008],[\"Declaration#1:ast\",1059],[\"Declaration#1:json\",1102],[\"Declaration#1:source\",1141],[\"Rule#0:ast\",1177],[\"Rule#0:json\",1220],[\"Rule#0:source\",1273],[\"AtRule#0:ast\",1309],[\"AtRule#0:json\",1366],[\"AtRule#0:source\",1368],[\"AtRule#1:ast\",1424],[\"AtRule#1:json\",1467],[\"AtRule#1:source\",1469],[\"Stylesheet#0:ast\",1510],[\"Stylesheet#0:json\",1539],[\"Stylesheet#0:source\",1564]],\"stringifyOffsets\":[[\"Comment#0:ast\",1580],[\"Comment#0:json\",1635],[\"Comment#0:source\",1669],[\"Declaration#0:ast\",1732],[\"Declaration#0:json\",1849],[\"Declaration#0:source\",1908],[\"Declaration#1:ast\",2022],[\"Declaration#1:source\",2111],[\"Rule#0:ast\",2197],[\"Rule#0:source\",2283],[\"AtRule#0:ast\",2369],[\"AtRule#0:json\",2493],[\"AtRule#0:source\",2557],[\"AtRule#1:ast\",2676],[\"AtRule#1:json\",2764],[\"AtRule#1:source\",2813],[\"Stylesheet#0:ast\",2904],[\"Stylesheet#0:source\",2958]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1580]],[\"Comment:json\",[1635]],[\"Comment:source\",[1669]],[\"Declaration:ast\",[1732,2022]],[\"Declaration:json\",[1849]],[\"Declaration:source\",[1908,2111]],[\"Rule:ast\",[2197]],[\"Rule:source\",[2283]],[\"AtRule:ast\",[2369,2676]],[\"AtRule:json\",[2493,2764]],[\"AtRule:source\",[2557,2813]],[\"Stylesheet:ast\",[2904]],[\"Stylesheet:source\",[2958]],[\"AtRule|Comment|Declaration|Rule:ast\",[2369,2676,1580,1732,2022,2197]],[\"AtRule|Comment|Declaration|Rule:source\",[2557,2813,1669,1908,2111,2283]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1580],[\"Comment:json\",1635],[\"Comment:source\",1669],[\"Declaration:ast\",1732],[\"Declaration:json\",1849],[\"Declaration:source\",1908],[\"Rule:ast\",2197],[\"Rule:source\",2283],[\"AtRule:ast\",2369],[\"AtRule:json\",2493],[\"AtRule:source\",2557],[\"Stylesheet:ast\",2904],[\"Stylesheet:source\",2958]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
  if (captures === null || state.off !== input.length) {
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
