// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"items\",\"[\",\",\",\"]\",\"key\",\":\",\"js\",\"entries\",\"{\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",253],[\"JsonMember#1\",313],[\"JsonMember#dispatch\",373],[\"JsonObject#0\",400],[\"JsonValue#0\",474]],\"renderOffsets\":[[\"Comment#0:ast\",634],[\"Comment#0:source\",636],[\"JsonNull#0:ast\",652],[\"JsonNull#0:source\",654],[\"JsonTrue#0:ast\",660],[\"JsonTrue#0:source\",662],[\"JsonFalse#0:ast\",668],[\"JsonFalse#0:source\",670],[\"JsonNumber#0:ast\",676],[\"JsonNumber#0:source\",687],[\"JsonString#0:ast\",698],[\"JsonString#0:source\",709],[\"JsonString#1:ast\",720],[\"JsonString#1:source\",731],[\"JsonArray#0:ast\",742],[\"JsonArray#0:source\",753],[\"JsonMember#0:ast\",779],[\"JsonMember#0:source\",818],[\"JsonMember#1:ast\",849],[\"JsonMember#1:source\",888],[\"JsonObject#0:ast\",919],[\"JsonObject#0:source\",944],[\"JsonValue#0:ast\",970],[\"JsonValue#0:source\",981]],\"stringifyOffsets\":[[\"Comment#0:ast\",992],[\"Comment#0:source\",1016],[\"JsonNull#0:ast\",1069],[\"JsonNull#0:source\",1083],[\"JsonTrue#0:ast\",1101],[\"JsonTrue#0:source\",1116],[\"JsonFalse#0:ast\",1134],[\"JsonFalse#0:source\",1149],[\"JsonNumber#0:ast\",1167],[\"JsonNumber#0:source\",1191],[\"JsonString#0:ast\",1215],[\"JsonString#0:source\",1239],[\"JsonArray#0:ast\",1263],[\"JsonArray#0:source\",1311],[\"JsonMember#0:source\",1374],[\"JsonMember#1:source\",1455],[\"JsonObject#0:source\",1536],[\"JsonValue#0:ast\",1599],[\"JsonValue#0:source\",1632]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[992]],[\"Comment:source\",[1016]],[\"JsonNull:ast\",[1069]],[\"JsonNull:source\",[1083]],[\"JsonTrue:ast\",[1101]],[\"JsonTrue:source\",[1116]],[\"JsonFalse:ast\",[1134]],[\"JsonFalse:source\",[1149]],[\"JsonNumber:ast\",[1167]],[\"JsonNumber:source\",[1191]],[\"JsonString:ast\",[1215]],[\"JsonString:source\",[1239]],[\"JsonArray:ast\",[1263]],[\"JsonArray:source\",[1311]],[\"JsonMember:source\",[1374,1455]],[\"JsonObject:source\",[1536]],[\"JsonValue:ast\",[1599]],[\"JsonValue:source\",[1632]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1263,1134,1069,1167,1215,1101]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1311,1149,1083,1191,1536,1239,1116]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",992],[\"Comment:source\",1016],[\"JsonNull:ast\",1069],[\"JsonNull:source\",1083],[\"JsonTrue:ast\",1101],[\"JsonTrue:source\",1116],[\"JsonFalse:ast\",1134],[\"JsonFalse:source\",1149],[\"JsonNumber:ast\",1167],[\"JsonNumber:source\",1191],[\"JsonString:ast\",1215],[\"JsonString:source\",1239],[\"JsonArray:ast\",1263],[\"JsonArray:source\",1311],[\"JsonMember:source\",1374],[\"JsonObject:source\",1536],[\"JsonValue:ast\",1599],[\"JsonValue:source\",1632]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
