// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"[\",\"items\",\"]\",\"key\",\":\",\"js\",\"{\",\"entries\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",237],[\"JsonMember#1\",297],[\"JsonMember#dispatch\",357],[\"JsonObject#0\",384],[\"JsonValue#0\",442]],\"renderOffsets\":[[\"Comment#0:ast\",602],[\"Comment#0:source\",604],[\"JsonNull#0:ast\",620],[\"JsonNull#0:source\",622],[\"JsonTrue#0:ast\",628],[\"JsonTrue#0:source\",630],[\"JsonFalse#0:ast\",636],[\"JsonFalse#0:source\",638],[\"JsonNumber#0:ast\",644],[\"JsonNumber#0:source\",655],[\"JsonString#0:ast\",666],[\"JsonString#0:source\",677],[\"JsonString#1:ast\",688],[\"JsonString#1:source\",699],[\"JsonArray#0:ast\",710],[\"JsonArray#0:source\",721],[\"JsonMember#0:ast\",747],[\"JsonMember#0:source\",786],[\"JsonMember#1:ast\",817],[\"JsonMember#1:source\",856],[\"JsonObject#0:ast\",887],[\"JsonObject#0:source\",912],[\"JsonValue#0:ast\",938],[\"JsonValue#0:source\",949]],\"stringifyOffsets\":[[\"Comment#0:ast\",960],[\"Comment#0:source\",984],[\"JsonNull#0:ast\",1037],[\"JsonNull#0:source\",1051],[\"JsonTrue#0:ast\",1069],[\"JsonTrue#0:source\",1084],[\"JsonFalse#0:ast\",1102],[\"JsonFalse#0:source\",1117],[\"JsonNumber#0:ast\",1135],[\"JsonNumber#0:source\",1159],[\"JsonString#0:ast\",1183],[\"JsonString#0:source\",1207],[\"JsonArray#0:ast\",1231],[\"JsonArray#0:source\",1279],[\"JsonMember#0:source\",1342],[\"JsonMember#1:source\",1423],[\"JsonObject#0:source\",1504],[\"JsonValue#0:ast\",1567],[\"JsonValue#0:source\",1600]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[960]],[\"Comment:source\",[984]],[\"JsonNull:ast\",[1037]],[\"JsonNull:source\",[1051]],[\"JsonTrue:ast\",[1069]],[\"JsonTrue:source\",[1084]],[\"JsonFalse:ast\",[1102]],[\"JsonFalse:source\",[1117]],[\"JsonNumber:ast\",[1135]],[\"JsonNumber:source\",[1159]],[\"JsonString:ast\",[1183]],[\"JsonString:source\",[1207]],[\"JsonArray:ast\",[1231]],[\"JsonArray:source\",[1279]],[\"JsonMember:source\",[1342,1423]],[\"JsonObject:source\",[1504]],[\"JsonValue:ast\",[1567]],[\"JsonValue:source\",[1600]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1231,1102,1037,1135,1183,1069]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1279,1117,1051,1159,1504,1207,1084]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",960],[\"Comment:source\",984],[\"JsonNull:ast\",1037],[\"JsonNull:source\",1051],[\"JsonTrue:ast\",1069],[\"JsonTrue:source\",1084],[\"JsonFalse:ast\",1102],[\"JsonFalse:source\",1117],[\"JsonNumber:ast\",1135],[\"JsonNumber:source\",1159],[\"JsonString:ast\",1183],[\"JsonString:source\",1207],[\"JsonArray:ast\",1231],[\"JsonArray:source\",1279],[\"JsonMember:source\",1342],[\"JsonObject:source\",1504],[\"JsonValue:ast\",1567],[\"JsonValue:source\",1600]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
