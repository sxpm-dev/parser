// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\"color\",\"prop\",\":\",\"red\",\"value\",\"!\",\"css\",\"important\",\";\",\".foo:hover\",\"selector\",\"{\",\"nodes\",\"}\",\"@\",\"name\",\"screen\",\"params\",\"\\\"UTF-8\\\"\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",110],[\"Declaration#dispatch\",168],[\"Rule#0\",195],[\"AtRule#0\",325],[\"AtRule#1\",481],[\"AtRule#dispatch\",540],[\"Stylesheet#0\",567]],\"renderOffsets\":[[\"Comment#0:ast\",664],[\"Comment#0:json\",693],[\"Comment#0:source\",695],[\"Declaration#0:ast\",721],[\"Declaration#0:json\",783],[\"Declaration#0:source\",785],[\"Declaration#1:ast\",836],[\"Declaration#1:json\",879],[\"Declaration#1:source\",918],[\"Rule#0:ast\",954],[\"Rule#0:json\",997],[\"Rule#0:source\",1050],[\"AtRule#0:ast\",1086],[\"AtRule#0:json\",1143],[\"AtRule#0:source\",1145],[\"AtRule#1:ast\",1201],[\"AtRule#1:json\",1244],[\"AtRule#1:source\",1246],[\"Stylesheet#0:ast\",1287],[\"Stylesheet#0:json\",1316],[\"Stylesheet#0:source\",1341]],\"stringifyOffsets\":[[\"Comment#0:ast\",1357],[\"Comment#0:source\",1412],[\"Declaration#0:source\",1475],[\"Declaration#1:ast\",1589],[\"Declaration#1:source\",1666],[\"Rule#0:ast\",1752],[\"Rule#0:source\",1838],[\"AtRule#0:ast\",1924],[\"AtRule#0:source\",2042],[\"AtRule#1:ast\",2161],[\"AtRule#1:source\",2243],[\"Stylesheet#0:ast\",2334],[\"Stylesheet#0:source\",2388]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1357]],[\"Comment:source\",[1412]],[\"Declaration:source\",[1475,1666]],[\"Declaration:ast\",[1589]],[\"Rule:ast\",[1752]],[\"AtRule|Comment|Declaration|Rule:ast\",[1357,1589,1752]],[\"Rule:source\",[1838]],[\"AtRule|Comment|Declaration|Rule:source\",[1412,1475,1666,1838]],[\"AtRule:ast\",[1924,2161]],[\"AtRule:source\",[2042,2243]],[\"Stylesheet:ast\",[2334]],[\"Stylesheet:source\",[2388]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1357],[\"Comment:source\",1412],[\"Declaration:ast\",1589],[\"Declaration:source\",1475],[\"Rule:ast\",1752],[\"Rule:source\",1838],[\"AtRule:ast\",1924],[\"AtRule:source\",2042],[\"Stylesheet:ast\",2334],[\"Stylesheet:source\",2388]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
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
