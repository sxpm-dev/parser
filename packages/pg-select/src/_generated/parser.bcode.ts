// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"col\",\"\",\"op\",\"val\",\"SELECT\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"ColumnRef\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Predicate#0\",148],[\"Select#0\",226],[\"Select#1\",311],[\"Select#2\",430],[\"Select#3\",541],[\"Select#dispatch\",686]],\"renderOffsets\":[[\"ColumnRef#0:ast\",739],[\"ColumnRef#0:source\",754],[\"ColumnRef#1:ast\",765],[\"ColumnRef#1:source\",794],[\"LiteralValue#0:ast\",810],[\"LiteralValue#0:source\",839],[\"LiteralValue#1:ast\",855],[\"LiteralValue#1:source\",884],[\"Predicate#0:ast\",900],[\"Predicate#0:source\",957],[\"Select#0:ast\",1003],[\"Select#0:source\",1046],[\"Select#1:ast\",1082],[\"Select#1:source\",1139],[\"Select#2:ast\",1190],[\"Select#2:source\",1247],[\"Select#3:ast\",1298],[\"Select#3:source\",1369]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1435],[\"ColumnRef#0:source\",1463],[\"ColumnRef#1:ast\",1498],[\"ColumnRef#1:source\",1543],[\"LiteralValue#0:ast\",1596],[\"LiteralValue#0:source\",1641],[\"LiteralValue#1:ast\",1694],[\"LiteralValue#1:source\",1739],[\"Predicate#0:ast\",1792],[\"Predicate#0:source\",1909],[\"Select#0:ast\",2018],[\"Select#0:source\",2104],[\"Select#1:ast\",2190],[\"Select#1:source\",2312],[\"Select#2:ast\",2426],[\"Select#2:source\",2539],[\"Select#3:ast\",2653],[\"Select#3:source\",2802]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1435,1498]],[\"ColumnRef:source\",[1463,1543]],[\"LiteralValue:ast\",[1596,1694]],[\"LiteralValue:source\",[1641,1739]],[\"Predicate:ast\",[1792]],[\"Predicate:source\",[1909]],[\"Select:ast\",[2018,2190,2426,2653]],[\"Select:source\",[2104,2312,2539,2802]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1435],[\"ColumnRef:source\",1463],[\"LiteralValue:ast\",1596],[\"LiteralValue:source\",1641],[\"Predicate:ast\",1792],[\"Predicate:source\",1909],[\"Select:ast\",2018],[\"Select:source\",2104]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[\"!=\",\"<=\",\">=\",\"<\",\"=\",\">\"]}";
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
