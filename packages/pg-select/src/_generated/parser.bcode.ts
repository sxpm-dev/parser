// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"col\",\"\",\"op\",\"val\",\"SELECT\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"ColumnRef\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Predicate#0\",148],[\"Select#0\",226],[\"Select#1\",320],[\"Select#2\",448],[\"Select#3\",568],[\"Select#dispatch\",722]],\"renderOffsets\":[[\"ColumnRef#0:ast\",775],[\"ColumnRef#0:source\",790],[\"ColumnRef#1:ast\",801],[\"ColumnRef#1:source\",830],[\"LiteralValue#0:ast\",846],[\"LiteralValue#0:source\",875],[\"LiteralValue#1:ast\",891],[\"LiteralValue#1:source\",920],[\"Predicate#0:ast\",936],[\"Predicate#0:source\",993],[\"Select#0:ast\",1039],[\"Select#0:source\",1082],[\"Select#1:ast\",1118],[\"Select#1:source\",1175],[\"Select#2:ast\",1226],[\"Select#2:source\",1283],[\"Select#3:ast\",1334],[\"Select#3:source\",1405]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1471],[\"ColumnRef#0:source\",1505],[\"ColumnRef#1:ast\",1540],[\"ColumnRef#1:source\",1591],[\"LiteralValue#0:ast\",1644],[\"LiteralValue#0:source\",1689],[\"LiteralValue#1:ast\",1742],[\"LiteralValue#1:source\",1787],[\"Predicate#0:ast\",1840],[\"Predicate#0:source\",1957],[\"Select#0:ast\",2066],[\"Select#0:source\",2164],[\"Select#1:ast\",2250],[\"Select#1:source\",2384],[\"Select#2:ast\",2498],[\"Select#2:source\",2623],[\"Select#3:ast\",2737],[\"Select#3:source\",2898]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1471,1540]],[\"ColumnRef:source\",[1505,1591]],[\"LiteralValue:ast\",[1644,1742]],[\"LiteralValue:source\",[1689,1787]],[\"Predicate:ast\",[1840]],[\"Predicate:source\",[1957]],[\"Select:ast\",[2066,2250,2498,2737]],[\"Select:source\",[2164,2384,2623,2898]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1471],[\"ColumnRef:source\",1505],[\"LiteralValue:ast\",1644],[\"LiteralValue:source\",1689],[\"Predicate:ast\",1840],[\"Predicate:source\",1957],[\"Select:ast\",2066],[\"Select:source\",2164]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[\"!=\",\"<=\",\">=\",\"<\",\"=\",\">\"]}";
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
