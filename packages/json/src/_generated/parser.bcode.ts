// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"items\",\"[\",\"]\",\"key\",\":\",\"js\",\"entries\",\"{\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",242],[\"JsonMember#1\",302],[\"JsonMember#dispatch\",362],[\"JsonObject#0\",389],[\"JsonValue#0\",452]],\"renderOffsets\":[[\"Comment#0:ast\",612],[\"Comment#0:source\",614],[\"JsonNull#0:ast\",630],[\"JsonNull#0:source\",632],[\"JsonTrue#0:ast\",638],[\"JsonTrue#0:source\",640],[\"JsonFalse#0:ast\",646],[\"JsonFalse#0:source\",648],[\"JsonNumber#0:ast\",654],[\"JsonNumber#0:source\",665],[\"JsonString#0:ast\",676],[\"JsonString#0:source\",687],[\"JsonString#1:ast\",698],[\"JsonString#1:source\",709],[\"JsonArray#0:ast\",720],[\"JsonArray#0:source\",731],[\"JsonMember#0:ast\",757],[\"JsonMember#0:source\",796],[\"JsonMember#1:ast\",827],[\"JsonMember#1:source\",866],[\"JsonObject#0:ast\",897],[\"JsonObject#0:source\",922],[\"JsonValue#0:ast\",948],[\"JsonValue#0:source\",959]],\"stringifyOffsets\":[[\"Comment#0:ast\",970],[\"Comment#0:source\",994],[\"JsonNull#0:ast\",1047],[\"JsonNull#0:source\",1061],[\"JsonTrue#0:ast\",1079],[\"JsonTrue#0:source\",1094],[\"JsonFalse#0:ast\",1112],[\"JsonFalse#0:source\",1127],[\"JsonNumber#0:ast\",1145],[\"JsonNumber#0:source\",1169],[\"JsonString#0:ast\",1193],[\"JsonString#0:source\",1217],[\"JsonArray#0:ast\",1241],[\"JsonArray#0:source\",1289],[\"JsonMember#0:source\",1352],[\"JsonMember#1:source\",1433],[\"JsonObject#0:source\",1514],[\"JsonValue#0:ast\",1577],[\"JsonValue#0:source\",1610]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[970]],[\"Comment:source\",[994]],[\"JsonNull:ast\",[1047]],[\"JsonNull:source\",[1061]],[\"JsonTrue:ast\",[1079]],[\"JsonTrue:source\",[1094]],[\"JsonFalse:ast\",[1112]],[\"JsonFalse:source\",[1127]],[\"JsonNumber:ast\",[1145]],[\"JsonNumber:source\",[1169]],[\"JsonString:ast\",[1193]],[\"JsonString:source\",[1217]],[\"JsonArray:ast\",[1241]],[\"JsonArray:source\",[1289]],[\"JsonMember:source\",[1352,1433]],[\"JsonObject:source\",[1514]],[\"JsonValue:ast\",[1577]],[\"JsonValue:source\",[1610]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1241,1112,1047,1145,1193,1079]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1289,1127,1061,1169,1514,1217,1094]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",970],[\"Comment:source\",994],[\"JsonNull:ast\",1047],[\"JsonNull:source\",1061],[\"JsonTrue:ast\",1079],[\"JsonTrue:source\",1094],[\"JsonFalse:ast\",1112],[\"JsonFalse:source\",1127],[\"JsonNumber:ast\",1145],[\"JsonNumber:source\",1169],[\"JsonString:ast\",1193],[\"JsonString:source\",1217],[\"JsonArray:ast\",1241],[\"JsonArray:source\",1289],[\"JsonMember:source\",1352],[\"JsonObject:source\",1514],[\"JsonValue:ast\",1577],[\"JsonValue:source\",1610]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
