// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"col\",\"\",\"op\",\"val\",\"SELECT\",\",\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"ColumnRef\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Predicate#0\",148],[\"Select#0\",226],[\"Select#1\",330],[\"Select#2\",468],[\"Select#3\",598],[\"Select#dispatch\",762]],\"renderOffsets\":[[\"ColumnRef#0:ast\",815],[\"ColumnRef#0:source\",830],[\"ColumnRef#1:ast\",841],[\"ColumnRef#1:source\",870],[\"LiteralValue#0:ast\",886],[\"LiteralValue#0:source\",915],[\"LiteralValue#1:ast\",931],[\"LiteralValue#1:source\",960],[\"Predicate#0:ast\",976],[\"Predicate#0:source\",1033],[\"Select#0:ast\",1079],[\"Select#0:source\",1122],[\"Select#1:ast\",1158],[\"Select#1:source\",1215],[\"Select#2:ast\",1266],[\"Select#2:source\",1323],[\"Select#3:ast\",1374],[\"Select#3:source\",1445]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1511],[\"ColumnRef#0:source\",1545],[\"ColumnRef#1:ast\",1580],[\"ColumnRef#1:source\",1631],[\"LiteralValue#0:ast\",1684],[\"LiteralValue#0:source\",1729],[\"LiteralValue#1:ast\",1782],[\"LiteralValue#1:source\",1827],[\"Predicate#0:ast\",1880],[\"Predicate#0:source\",1997],[\"Select#0:ast\",2106],[\"Select#0:source\",2204],[\"Select#1:ast\",2290],[\"Select#1:source\",2424],[\"Select#2:ast\",2538],[\"Select#2:source\",2663],[\"Select#3:ast\",2777],[\"Select#3:source\",2938]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1511,1580]],[\"ColumnRef:source\",[1545,1631]],[\"LiteralValue:ast\",[1684,1782]],[\"LiteralValue:source\",[1729,1827]],[\"Predicate:ast\",[1880]],[\"Predicate:source\",[1997]],[\"Select:ast\",[2106,2290,2538,2777]],[\"Select:source\",[2204,2424,2663,2938]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1511],[\"ColumnRef:source\",1545],[\"LiteralValue:ast\",1684],[\"LiteralValue:source\",1729],[\"Predicate:ast\",1880],[\"Predicate:source\",1997],[\"Select:ast\",2106],[\"Select:source\",2204]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[\"!=\",\"<=\",\">=\",\"<\",\"=\",\">\"]}";
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
