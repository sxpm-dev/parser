// Auto-generated from packages/json/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"JsonNull#0\",\"JsonTrue#0\",\"JsonFalse#0\",\"JsonNumber#0\",\"JsonString#0\",\"JsonString#1\",\"JsonString#dispatch\",\"JsonArray#0\",\"JsonMember#0\",\"JsonMember#1\",\"JsonMember#dispatch\",\"JsonObject#0\",\"JsonValue#0\",\"block\",\"text\",\"null\",\"true\",\"false\",\"scientific\",\"value\",\"doubleQuoted\",\"singleQuoted\",\"[\",\"items\",\"]\",\"key\",\":\",\"js\",\"{\",\"entries\",\"}\",\"node\",\"source\",\"ast\",\"__dynKey\",\"__merge\",\"array\",\"\",\"JsonValue\",\"JsonMember\",\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"JsonNull#0\",26],[\"JsonTrue#0\",42],[\"JsonFalse#0\",58],[\"JsonNumber#0\",74],[\"JsonString#0\",100],[\"JsonString#1\",126],[\"JsonString#dispatch\",152],[\"JsonArray#0\",179],[\"JsonMember#0\",229],[\"JsonMember#1\",289],[\"JsonMember#dispatch\",349],[\"JsonObject#0\",376],[\"JsonValue#0\",426]],\"renderOffsets\":[[\"Comment#0:ast\",586],[\"Comment#0:source\",588],[\"JsonNull#0:ast\",604],[\"JsonNull#0:source\",606],[\"JsonTrue#0:ast\",612],[\"JsonTrue#0:source\",614],[\"JsonFalse#0:ast\",620],[\"JsonFalse#0:source\",622],[\"JsonNumber#0:ast\",628],[\"JsonNumber#0:source\",639],[\"JsonString#0:ast\",650],[\"JsonString#0:source\",661],[\"JsonString#1:ast\",672],[\"JsonString#1:source\",683],[\"JsonArray#0:ast\",694],[\"JsonArray#0:source\",705],[\"JsonMember#0:ast\",731],[\"JsonMember#0:source\",770],[\"JsonMember#1:ast\",801],[\"JsonMember#1:source\",840],[\"JsonObject#0:ast\",871],[\"JsonObject#0:source\",896],[\"JsonValue#0:ast\",922],[\"JsonValue#0:source\",933]],\"stringifyOffsets\":[[\"Comment#0:source\",944],[\"JsonNull#0:source\",997],[\"JsonTrue#0:source\",1015],[\"JsonFalse#0:source\",1033],[\"JsonNumber#0:ast\",1051],[\"JsonNumber#0:source\",1075],[\"JsonString#0:ast\",1099],[\"JsonString#0:source\",1123],[\"JsonArray#0:ast\",1147],[\"JsonArray#0:source\",1195],[\"JsonMember#0:source\",1258],[\"JsonMember#1:source\",1339],[\"JsonObject#0:source\",1420],[\"JsonValue#0:ast\",1483],[\"JsonValue#0:source\",1516]],\"stringifyOffsetsByNodeType\":[[\"Comment:source\",[944]],[\"JsonNull:source\",[997]],[\"JsonTrue:source\",[1015]],[\"JsonFalse:source\",[1033]],[\"JsonNumber:ast\",[1051]],[\"JsonNumber:source\",[1075]],[\"JsonString:ast\",[1099]],[\"JsonString:source\",[1123]],[\"JsonArray:ast\",[1147]],[\"JsonArray:source\",[1195]],[\"JsonMember:source\",[1258,1339]],[\"JsonObject:source\",[1420]],[\"JsonValue:ast\",[1483]],[\"JsonValue:source\",[1516]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:ast\",[1147,1051,1099]],[\"JsonArray|JsonFalse|JsonNull|JsonNumber|JsonObject|JsonString|JsonTrue:source\",[1195,1033,997,1075,1420,1123,1015]]],\"stringifyDispatcherOffsets\":[[\"Comment:source\",944],[\"JsonNull:source\",997],[\"JsonTrue:source\",1015],[\"JsonFalse:source\",1033],[\"JsonNumber:ast\",1051],[\"JsonNumber:source\",1075],[\"JsonString:ast\",1099],[\"JsonString:source\",1123],[\"JsonArray:ast\",1147],[\"JsonArray:source\",1195],[\"JsonMember:source\",1258],[\"JsonObject:source\",1420],[\"JsonValue:ast\",1483],[\"JsonValue:source\",1516]],\"rootProductionKey\":\"JsonValue#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
