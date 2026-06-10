// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"{\",\"selector\",\"nodes\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",429],[\"AtRule#1\",629],[\"AtRule#dispatch\",704],[\"Stylesheet#0\",731]],\"renderOffsets\":[[\"Comment#0:ast\",860],[\"Comment#0:json\",889],[\"Comment#0:source\",891],[\"Declaration#0:ast\",917],[\"Declaration#0:json\",979],[\"Declaration#0:source\",981],[\"Declaration#1:ast\",1032],[\"Declaration#1:json\",1075],[\"Declaration#1:source\",1114],[\"Rule#0:ast\",1150],[\"Rule#0:json\",1193],[\"Rule#0:source\",1246],[\"AtRule#0:ast\",1282],[\"AtRule#0:json\",1339],[\"AtRule#0:source\",1341],[\"AtRule#1:ast\",1397],[\"AtRule#1:json\",1440],[\"AtRule#1:source\",1442],[\"Stylesheet#0:ast\",1483],[\"Stylesheet#0:json\",1512],[\"Stylesheet#0:source\",1537]],\"stringifyOffsets\":[[\"Comment#0:ast\",1553],[\"Comment#0:json\",1608],[\"Comment#0:source\",1642],[\"Declaration#0:ast\",1705],[\"Declaration#0:json\",1822],[\"Declaration#0:source\",1881],[\"Declaration#1:ast\",1995],[\"Declaration#1:source\",2084],[\"Rule#0:ast\",2170],[\"Rule#0:source\",2256],[\"AtRule#0:ast\",2342],[\"AtRule#0:json\",2466],[\"AtRule#0:source\",2530],[\"AtRule#1:ast\",2649],[\"AtRule#1:json\",2737],[\"AtRule#1:source\",2786],[\"Stylesheet#0:ast\",2877],[\"Stylesheet#0:source\",2931]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1553]],[\"Comment:json\",[1608]],[\"Comment:source\",[1642]],[\"Declaration:ast\",[1705,1995]],[\"Declaration:json\",[1822]],[\"Declaration:source\",[1881,2084]],[\"Rule:ast\",[2170]],[\"Rule:source\",[2256]],[\"AtRule:ast\",[2342,2649]],[\"AtRule:json\",[2466,2737]],[\"AtRule:source\",[2530,2786]],[\"Stylesheet:ast\",[2877]],[\"Stylesheet:source\",[2931]],[\"AtRule|Comment|Declaration|Rule:ast\",[2342,2649,1553,1705,1995,2170]],[\"AtRule|Comment|Declaration|Rule:source\",[2530,2786,1642,1881,2084,2256]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1553],[\"Comment:json\",1608],[\"Comment:source\",1642],[\"Declaration:ast\",1705],[\"Declaration:json\",1822],[\"Declaration:source\",1881],[\"Rule:ast\",2170],[\"Rule:source\",2256],[\"AtRule:ast\",2342],[\"AtRule:json\",2466],[\"AtRule:source\",2530],[\"Stylesheet:ast\",2877],[\"Stylesheet:source\",2931]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
