// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"ColumnRef#0\",\"ColumnRef#1\",\"ColumnRef#dispatch\",\"LiteralValue#0\",\"LiteralValue#1\",\"LiteralValue#dispatch\",\"Predicate#0\",\"Select#0\",\"Select#1\",\"Select#2\",\"Select#3\",\"Select#dispatch\",\"*\",\"js\",\"name\",\"int\",\"value\",\"singleQuoted\",\"col\",\"\",\"op\",\"val\",\"SELECT\",\"columns\",\"FROM\",\"table\",\"WHERE\",\"where\",\"LIMIT\",\"limit\",\"wildcard\",\"type\",\"column\",\"ast\",\"source\",\"number\",\"string\",\"predicate\",\" \",\"select\",\"SELECT \",\" FROM \",\" WHERE \",\" LIMIT \",\"ColumnRef\",\"LiteralValue\",\"Predicate\"],\"numberPool\":[],\"productionOffsets\":[[\"ColumnRef#0\",0],[\"ColumnRef#1\",16],[\"ColumnRef#dispatch\",42],[\"LiteralValue#0\",69],[\"LiteralValue#1\",95],[\"LiteralValue#dispatch\",121],[\"Predicate#0\",148],[\"Select#0\",226],[\"Select#1\",325],[\"Select#2\",458],[\"Select#3\",583],[\"Select#dispatch\",742]],\"renderOffsets\":[[\"ColumnRef#0:ast\",795],[\"ColumnRef#0:source\",810],[\"ColumnRef#1:ast\",821],[\"ColumnRef#1:source\",850],[\"LiteralValue#0:ast\",866],[\"LiteralValue#0:source\",895],[\"LiteralValue#1:ast\",911],[\"LiteralValue#1:source\",940],[\"Predicate#0:ast\",956],[\"Predicate#0:source\",1013],[\"Select#0:ast\",1059],[\"Select#0:source\",1102],[\"Select#1:ast\",1138],[\"Select#1:source\",1195],[\"Select#2:ast\",1246],[\"Select#2:source\",1303],[\"Select#3:ast\",1354],[\"Select#3:source\",1425]],\"stringifyOffsets\":[[\"ColumnRef#0:ast\",1491],[\"ColumnRef#0:source\",1525],[\"ColumnRef#1:ast\",1560],[\"ColumnRef#1:source\",1611],[\"LiteralValue#0:ast\",1664],[\"LiteralValue#0:source\",1709],[\"LiteralValue#1:ast\",1762],[\"LiteralValue#1:source\",1807],[\"Predicate#0:ast\",1860],[\"Predicate#0:source\",1977],[\"Select#0:ast\",2086],[\"Select#0:source\",2184],[\"Select#1:ast\",2270],[\"Select#1:source\",2404],[\"Select#2:ast\",2518],[\"Select#2:source\",2643],[\"Select#3:ast\",2757],[\"Select#3:source\",2918]],\"stringifyOffsetsByNodeType\":[[\"ColumnRef:ast\",[1491,1560]],[\"ColumnRef:source\",[1525,1611]],[\"LiteralValue:ast\",[1664,1762]],[\"LiteralValue:source\",[1709,1807]],[\"Predicate:ast\",[1860]],[\"Predicate:source\",[1977]],[\"Select:ast\",[2086,2270,2518,2757]],[\"Select:source\",[2184,2404,2643,2918]]],\"stringifyDispatcherOffsets\":[[\"ColumnRef:ast\",1491],[\"ColumnRef:source\",1525],[\"LiteralValue:ast\",1664],[\"LiteralValue:source\",1709],[\"Predicate:ast\",1860],[\"Predicate:source\",1977],[\"Select:ast\",2086],[\"Select:source\",2184]],\"rootProductionKey\":\"Select#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[\"!=\",\"<=\",\">=\",\"<\",\"=\",\">\"]}";
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
