// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"col\",\"\",\"op\",\"val\",\"SELECT\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"ColumnRef\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Predicate#0\",148],[\"Select#0\",226],[\"Select#1\",319],[\"Select#2\",446],[\"Select#3\",565],[\"Select#dispatch\",718]],\"renderOffsets\":[[\"ColumnRef#0:ast\",771],[\"ColumnRef#0:source\",786],[\"ColumnRef#1:ast\",797],[\"ColumnRef#1:source\",826],[\"LiteralValue#0:ast\",842],[\"LiteralValue#0:source\",871],[\"LiteralValue#1:ast\",887],[\"LiteralValue#1:source\",916],[\"Predicate#0:ast\",932],[\"Predicate#0:source\",989],[\"Select#0:ast\",1035],[\"Select#0:source\",1078],[\"Select#1:ast\",1114],[\"Select#1:source\",1171],[\"Select#2:ast\",1222],[\"Select#2:source\",1279],[\"Select#3:ast\",1330],[\"Select#3:source\",1401]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1467],[\"ColumnRef#0:source\",1501],[\"ColumnRef#1:ast\",1536],[\"ColumnRef#1:source\",1587],[\"LiteralValue#0:ast\",1640],[\"LiteralValue#0:source\",1685],[\"LiteralValue#1:ast\",1738],[\"LiteralValue#1:source\",1783],[\"Predicate#0:ast\",1836],[\"Predicate#0:source\",1953],[\"Select#0:ast\",2062],[\"Select#0:source\",2160],[\"Select#1:ast\",2246],[\"Select#1:source\",2380],[\"Select#2:ast\",2494],[\"Select#2:source\",2619],[\"Select#3:ast\",2733],[\"Select#3:source\",2894]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1467,1536]],[\"ColumnRef:source\",[1501,1587]],[\"LiteralValue:ast\",[1640,1738]],[\"LiteralValue:source\",[1685,1783]],[\"Predicate:ast\",[1836]],[\"Predicate:source\",[1953]],[\"Select:ast\",[2062,2246,2494,2733]],[\"Select:source\",[2160,2380,2619,2894]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1467],[\"ColumnRef:source\",1501],[\"LiteralValue:ast\",1640],[\"LiteralValue:source\",1685],[\"Predicate:ast\",1836],[\"Predicate:source\",1953],[\"Select:ast\",2062],[\"Select:source\",2160]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[\"!=\",\"<=\",\">=\",\"<\",\"=\",\">\"]}";
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
