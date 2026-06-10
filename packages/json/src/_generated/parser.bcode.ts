// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"items\",\"[\",\"]\",\"key\",\":\",\"js\",\"entries\",\"{\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",248],[\"JsonMember#1\",308],[\"JsonMember#dispatch\",368],[\"JsonObject#0\",395],[\"JsonValue#0\",464]],\"renderOffsets\":[[\"Comment#0:ast\",624],[\"Comment#0:source\",626],[\"JsonNull#0:ast\",642],[\"JsonNull#0:source\",644],[\"JsonTrue#0:ast\",650],[\"JsonTrue#0:source\",652],[\"JsonFalse#0:ast\",658],[\"JsonFalse#0:source\",660],[\"JsonNumber#0:ast\",666],[\"JsonNumber#0:source\",677],[\"JsonString#0:ast\",688],[\"JsonString#0:source\",699],[\"JsonString#1:ast\",710],[\"JsonString#1:source\",721],[\"JsonArray#0:ast\",732],[\"JsonArray#0:source\",743],[\"JsonMember#0:ast\",769],[\"JsonMember#0:source\",808],[\"JsonMember#1:ast\",839],[\"JsonMember#1:source\",878],[\"JsonObject#0:ast\",909],[\"JsonObject#0:source\",934],[\"JsonValue#0:ast\",960],[\"JsonValue#0:source\",971]],\"stringifyOffsets\":[[\"Comment#0:ast\",982],[\"Comment#0:source\",1006],[\"JsonNull#0:ast\",1059],[\"JsonNull#0:source\",1073],[\"JsonTrue#0:ast\",1091],[\"JsonTrue#0:source\",1106],[\"JsonFalse#0:ast\",1124],[\"JsonFalse#0:source\",1139],[\"JsonNumber#0:ast\",1157],[\"JsonNumber#0:source\",1181],[\"JsonString#0:ast\",1205],[\"JsonString#0:source\",1229],[\"JsonArray#0:ast\",1253],[\"JsonArray#0:source\",1301],[\"JsonMember#0:source\",1364],[\"JsonMember#1:source\",1445],[\"JsonObject#0:source\",1526],[\"JsonValue#0:ast\",1589],[\"JsonValue#0:source\",1622]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[982]],[\"Comment:source\",[1006]],[\"JsonNull:ast\",[1059]],[\"JsonNull:source\",[1073]],[\"JsonTrue:ast\",[1091]],[\"JsonTrue:source\",[1106]],[\"JsonFalse:ast\",[1124]],[\"JsonFalse:source\",[1139]],[\"JsonNumber:ast\",[1157]],[\"JsonNumber:source\",[1181]],[\"JsonString:ast\",[1205]],[\"JsonString:source\",[1229]],[\"JsonArray:ast\",[1253]],[\"JsonArray:source\",[1301]],[\"JsonMember:source\",[1364,1445]],[\"JsonObject:source\",[1526]],[\"JsonValue:ast\",[1589]],[\"JsonValue:source\",[1622]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1253,1124,1059,1157,1205,1091]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1301,1139,1073,1181,1526,1229,1106]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",982],[\"Comment:source\",1006],[\"JsonNull:ast\",1059],[\"JsonNull:source\",1073],[\"JsonTrue:ast\",1091],[\"JsonTrue:source\",1106],[\"JsonFalse:ast\",1124],[\"JsonFalse:source\",1139],[\"JsonNumber:ast\",1157],[\"JsonNumber:source\",1181],[\"JsonString:ast\",1205],[\"JsonString:source\",1229],[\"JsonArray:ast\",1253],[\"JsonArray:source\",1301],[\"JsonMember:source\",1364],[\"JsonObject:source\",1526],[\"JsonValue:ast\",1589],[\"JsonValue:source\",1622]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
