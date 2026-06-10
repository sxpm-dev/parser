// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"nodes\",\"{\",\"selector\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",434],[\"AtRule#1\",639],[\"AtRule#dispatch\",714],[\"Stylesheet#0\",741]],\"renderOffsets\":[[\"Comment#0:ast\",875],[\"Comment#0:json\",904],[\"Comment#0:source\",906],[\"Declaration#0:ast\",932],[\"Declaration#0:json\",994],[\"Declaration#0:source\",996],[\"Declaration#1:ast\",1047],[\"Declaration#1:json\",1090],[\"Declaration#1:source\",1129],[\"Rule#0:ast\",1165],[\"Rule#0:json\",1208],[\"Rule#0:source\",1261],[\"AtRule#0:ast\",1297],[\"AtRule#0:json\",1354],[\"AtRule#0:source\",1356],[\"AtRule#1:ast\",1412],[\"AtRule#1:json\",1455],[\"AtRule#1:source\",1457],[\"Stylesheet#0:ast\",1498],[\"Stylesheet#0:json\",1527],[\"Stylesheet#0:source\",1552]],\"stringifyOffsets\":[[\"Comment#0:ast\",1568],[\"Comment#0:json\",1623],[\"Comment#0:source\",1657],[\"Declaration#0:ast\",1720],[\"Declaration#0:json\",1837],[\"Declaration#0:source\",1896],[\"Declaration#1:ast\",2010],[\"Declaration#1:source\",2099],[\"Rule#0:ast\",2185],[\"Rule#0:source\",2271],[\"AtRule#0:ast\",2357],[\"AtRule#0:json\",2481],[\"AtRule#0:source\",2545],[\"AtRule#1:ast\",2664],[\"AtRule#1:json\",2752],[\"AtRule#1:source\",2801],[\"Stylesheet#0:ast\",2892],[\"Stylesheet#0:source\",2946]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1568]],[\"Comment:json\",[1623]],[\"Comment:source\",[1657]],[\"Declaration:ast\",[1720,2010]],[\"Declaration:json\",[1837]],[\"Declaration:source\",[1896,2099]],[\"Rule:ast\",[2185]],[\"Rule:source\",[2271]],[\"AtRule:ast\",[2357,2664]],[\"AtRule:json\",[2481,2752]],[\"AtRule:source\",[2545,2801]],[\"Stylesheet:ast\",[2892]],[\"Stylesheet:source\",[2946]],[\"AtRule|Comment|Declaration|Rule:ast\",[2357,2664,1568,1720,2010,2185]],[\"AtRule|Comment|Declaration|Rule:source\",[2545,2801,1657,1896,2099,2271]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1568],[\"Comment:json\",1623],[\"Comment:source\",1657],[\"Declaration:ast\",1720],[\"Declaration:json\",1837],[\"Declaration:source\",1896],[\"Rule:ast\",2185],[\"Rule:source\",2271],[\"AtRule:ast\",2357],[\"AtRule:json\",2481],[\"AtRule:source\",2545],[\"Stylesheet:ast\",2892],[\"Stylesheet:source\",2946]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
