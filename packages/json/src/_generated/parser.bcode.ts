// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"items\",\"[\",\"]\",\"key\",\":\",\"js\",\"entries\",\"{\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",243],[\"JsonMember#1\",303],[\"JsonMember#dispatch\",363],[\"JsonObject#0\",390],[\"JsonValue#0\",454]],\"renderOffsets\":[[\"Comment#0:ast\",614],[\"Comment#0:source\",616],[\"JsonNull#0:ast\",632],[\"JsonNull#0:source\",634],[\"JsonTrue#0:ast\",640],[\"JsonTrue#0:source\",642],[\"JsonFalse#0:ast\",648],[\"JsonFalse#0:source\",650],[\"JsonNumber#0:ast\",656],[\"JsonNumber#0:source\",667],[\"JsonString#0:ast\",678],[\"JsonString#0:source\",689],[\"JsonString#1:ast\",700],[\"JsonString#1:source\",711],[\"JsonArray#0:ast\",722],[\"JsonArray#0:source\",733],[\"JsonMember#0:ast\",759],[\"JsonMember#0:source\",798],[\"JsonMember#1:ast\",829],[\"JsonMember#1:source\",868],[\"JsonObject#0:ast\",899],[\"JsonObject#0:source\",924],[\"JsonValue#0:ast\",950],[\"JsonValue#0:source\",961]],\"stringifyOffsets\":[[\"Comment#0:ast\",972],[\"Comment#0:source\",996],[\"JsonNull#0:ast\",1049],[\"JsonNull#0:source\",1063],[\"JsonTrue#0:ast\",1081],[\"JsonTrue#0:source\",1096],[\"JsonFalse#0:ast\",1114],[\"JsonFalse#0:source\",1129],[\"JsonNumber#0:ast\",1147],[\"JsonNumber#0:source\",1171],[\"JsonString#0:ast\",1195],[\"JsonString#0:source\",1219],[\"JsonArray#0:ast\",1243],[\"JsonArray#0:source\",1291],[\"JsonMember#0:source\",1354],[\"JsonMember#1:source\",1435],[\"JsonObject#0:source\",1516],[\"JsonValue#0:ast\",1579],[\"JsonValue#0:source\",1612]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[972]],[\"Comment:source\",[996]],[\"JsonNull:ast\",[1049]],[\"JsonNull:source\",[1063]],[\"JsonTrue:ast\",[1081]],[\"JsonTrue:source\",[1096]],[\"JsonFalse:ast\",[1114]],[\"JsonFalse:source\",[1129]],[\"JsonNumber:ast\",[1147]],[\"JsonNumber:source\",[1171]],[\"JsonString:ast\",[1195]],[\"JsonString:source\",[1219]],[\"JsonArray:ast\",[1243]],[\"JsonArray:source\",[1291]],[\"JsonMember:source\",[1354,1435]],[\"JsonObject:source\",[1516]],[\"JsonValue:ast\",[1579]],[\"JsonValue:source\",[1612]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1243,1114,1049,1147,1195,1081]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1291,1129,1063,1171,1516,1219,1096]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",972],[\"Comment:source\",996],[\"JsonNull:ast\",1049],[\"JsonNull:source\",1063],[\"JsonTrue:ast\",1081],[\"JsonTrue:source\",1096],[\"JsonFalse:ast\",1114],[\"JsonFalse:source\",1129],[\"JsonNumber:ast\",1147],[\"JsonNumber:source\",1171],[\"JsonString:ast\",1195],[\"JsonString:source\",1219],[\"JsonArray:ast\",1243],[\"JsonArray:source\",1291],[\"JsonMember:source\",1354],[\"JsonObject:source\",1516],[\"JsonValue:ast\",1579],[\"JsonValue:source\",1612]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
