// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Operator#0\",\"Operator#1\",\"Operator#2\",\"Operator#3\",\"Operator#4\",\"Operator#5\",\"Operator#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"!=\",\"<=\",\">=\",\"=\",\"<\",\">\",\"col\",\"op\",\"val\",\"SELECT\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"\",\"ColumnRef\",\"Operator\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Operator#0\",148],[\"Operator#1\",164],[\"Operator#2\",180],[\"Operator#3\",196],[\"Operator#4\",212],[\"Operator#5\",228],[\"Operator#dispatch\",244],[\"Predicate#0\",323],[\"Select#0\",409],[\"Select#1\",494],[\"Select#2\",613],[\"Select#3\",724],[\"Select#dispatch\",869]],\"renderOffsets\":[[\"ColumnRef#0:ast\",922],[\"ColumnRef#0:source\",937],[\"ColumnRef#1:ast\",948],[\"ColumnRef#1:source\",977],[\"LiteralValue#0:ast\",993],[\"LiteralValue#0:source\",1022],[\"LiteralValue#1:ast\",1038],[\"LiteralValue#1:source\",1067],[\"Operator#0:ast\",1083],[\"Operator#0:source\",1089],[\"Operator#1:ast\",1100],[\"Operator#1:source\",1106],[\"Operator#2:ast\",1117],[\"Operator#2:source\",1123],[\"Operator#3:ast\",1134],[\"Operator#3:source\",1140],[\"Operator#4:ast\",1151],[\"Operator#4:source\",1157],[\"Operator#5:ast\",1168],[\"Operator#5:source\",1174],[\"Predicate#0:ast\",1185],[\"Predicate#0:source\",1242],[\"Select#0:ast\",1288],[\"Select#0:source\",1331],[\"Select#1:ast\",1367],[\"Select#1:source\",1424],[\"Select#2:ast\",1475],[\"Select#2:source\",1532],[\"Select#3:ast\",1583],[\"Select#3:source\",1654]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1720],[\"ColumnRef#0:source\",1748],[\"ColumnRef#1:ast\",1783],[\"ColumnRef#1:source\",1828],[\"LiteralValue#0:ast\",1881],[\"LiteralValue#0:source\",1926],[\"LiteralValue#1:ast\",1979],[\"LiteralValue#1:source\",2024],[\"Operator#0:ast\",2077],[\"Operator#0:source\",2100],[\"Operator#1:ast\",2135],[\"Operator#1:source\",2158],[\"Operator#2:ast\",2193],[\"Operator#2:source\",2216],[\"Operator#3:ast\",2251],[\"Operator#3:source\",2274],[\"Operator#4:ast\",2309],[\"Operator#4:source\",2332],[\"Operator#5:ast\",2367],[\"Operator#5:source\",2390],[\"Predicate#0:ast\",2425],[\"Predicate#0:source\",2551],[\"Select#0:ast\",2660],[\"Select#0:source\",2746],[\"Select#1:ast\",2832],[\"Select#1:source\",2954],[\"Select#2:ast\",3068],[\"Select#2:source\",3181],[\"Select#3:ast\",3295],[\"Select#3:source\",3444]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1720,1783]],[\"ColumnRef:source\",[1748,1828]],[\"LiteralValue:ast\",[1881,1979]],[\"LiteralValue:source\",[1926,2024]],[\"Operator:ast\",[2077,2135,2193,2251,2309,2367]],[\"Operator:source\",[2100,2158,2216,2274,2332,2390]],[\"Predicate:ast\",[2425]],[\"Predicate:source\",[2551]],[\"Select:ast\",[2660,2832,3068,3295]],[\"Select:source\",[2746,2954,3181,3444]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1720],[\"ColumnRef:source\",1748],[\"LiteralValue:ast\",1881],[\"LiteralValue:source\",1926],[\"Operator:ast\",2077],[\"Operator:source\",2100],[\"Predicate:ast\",2425],[\"Predicate:source\",2551],[\"Select:ast\",2660],[\"Select:source\",2746]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\"}";
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
