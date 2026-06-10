// Auto-generated from packages/cron/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"CronField#0\",\"CronField#1\",\"CronField#2\",\"CronField#3\",\"CronField#dispatch\",\"CommandWord#0\",\"Command#0\",\"Cron#0\",\"*\",\"/\",\"int\",\"step\",\"value\",\"start\",\"-\",\"end\",\"css\",\"words\",\"minute\",\"hour\",\"dayOfMonth\",\"month\",\"dayOfWeek\",\"command\",\"wildcard\",\"type\",\"ast\",\"*/\",\"source\",\"range\",\"cron\",\" \",\"\",\"CommandWord\",\"CronField\",\"Command\"],\"numberPool\":[],\"productionOffsets\":[[\"CronField#0\",0],[\"CronField#1\",16],[\"CronField#2\",58],[\"CronField#3\",84],[\"CronField#dispatch\",136],[\"CommandWord#0\",189],[\"Command#0\",215],[\"Cron#0\",280]],\"renderOffsets\":[[\"CronField#0:ast\",438],[\"CronField#0:source\",453],[\"CronField#1:ast\",464],[\"CronField#1:source\",493],[\"CronField#2:ast\",514],[\"CronField#2:source\",543],[\"CronField#3:ast\",559],[\"CronField#3:source\",602],[\"CommandWord#0:ast\",633],[\"CommandWord#0:source\",644],[\"Command#0:ast\",660],[\"Command#0:source\",689],[\"Cron#0:ast\",705],[\"Cron#0:source\",804]],\"stringifyOffsets\":[[\"CronField#0:ast\",916],[\"CronField#0:source\",968],[\"CronField#1:ast\",1003],[\"CronField#1:source\",1077],[\"CronField#2:ast\",1135],[\"CronField#2:source\",1204],[\"CronField#3:ast\",1257],[\"CronField#3:source\",1353],[\"CommandWord#0:ast\",1434],[\"CommandWord#0:source\",1463],[\"Command#0:ast\",1516],[\"Command#0:source\",1570],[\"Cron#0:ast\",1623],[\"Cron#0:source\",1878]],\"stringifyOffsetsByNodeType\":[[\"CronField:ast\",[916,1003,1135,1257]],[\"CronField:source\",[968,1077,1204,1353]],[\"CommandWord:ast\",[1434]],[\"CommandWord:source\",[1463]],[\"Command:ast\",[1516]],[\"Command:source\",[1570]],[\"Cron:ast\",[1623]],[\"Cron:source\",[1878]]],\"stringifyDispatcherOffsets\":[[\"CronField:ast\",916],[\"CronField:source\",968],[\"CommandWord:ast\",1434],[\"CommandWord:source\",1463],[\"Command:ast\",1516],[\"Command:source\",1570],[\"Cron:ast\",1623],[\"Cron:source\",1878]],\"rootProductionKey\":\"Cron#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
const __OPS_B64: string = "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";
const __DECODED = decodeSchema(__SCHEMA_JSON, __OPS_B64);
const __defaultTarget: string | undefined = undefined;

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
