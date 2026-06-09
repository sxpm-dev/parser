// Auto-generated from packages/cron/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"CronField#0\",\"CronField#1\",\"CronField#2\",\"CronField#3\",\"CronField#dispatch\",\"CommandWord#0\",\"Command#0\",\"Cron#0\",\"*\",\"/\",\"int\",\"step\",\"value\",\"start\",\"-\",\"end\",\"css\",\"words\",\"minute\",\"hour\",\"dayOfMonth\",\"month\",\"dayOfWeek\",\"command\",\"wildcard\",\"type\",\"ast\",\"*/\",\"source\",\"range\",\"cron\",\" \",\"\",\"CommandWord\",\"CronField\",\"Command\"],\"numberPool\":[],\"productionOffsets\":[[\"CronField#0\",0],[\"CronField#1\",16],[\"CronField#2\",58],[\"CronField#3\",84],[\"CronField#dispatch\",136],[\"CommandWord#0\",189],[\"Command#0\",215],[\"Cron#0\",266]],\"renderOffsets\":[[\"CronField#0:ast\",424],[\"CronField#0:source\",439],[\"CronField#1:ast\",450],[\"CronField#1:source\",479],[\"CronField#2:ast\",500],[\"CronField#2:source\",529],[\"CronField#3:ast\",545],[\"CronField#3:source\",588],[\"CommandWord#0:ast\",619],[\"CommandWord#0:source\",630],[\"Command#0:ast\",646],[\"Command#0:source\",675],[\"Cron#0:ast\",691],[\"Cron#0:source\",790]],\"stringifyOffsets\":[[\"CronField#0:ast\",902],[\"CronField#0:source\",930],[\"CronField#1:ast\",965],[\"CronField#1:source\",1015],[\"CronField#2:ast\",1073],[\"CronField#2:source\",1118],[\"CronField#3:ast\",1171],[\"CronField#3:source\",1243],[\"CommandWord#0:ast\",1324],[\"CommandWord#0:source\",1353],[\"Command#0:ast\",1406],[\"Command#0:source\",1460],[\"Cron#0:ast\",1513],[\"Cron#0:source\",1768]],\"stringifyOffsetsByNodeType\":[[\"CronField:ast\",[902,965,1073,1171]],[\"CronField:source\",[930,1015,1118,1243]],[\"CommandWord:ast\",[1324]],[\"CommandWord:source\",[1353]],[\"Command:ast\",[1406]],[\"Command:source\",[1460]],[\"Cron:ast\",[1513]],[\"Cron:source\",[1768]]],\"stringifyDispatcherOffsets\":[[\"CronField:ast\",902],[\"CronField:source\",930],[\"CommandWord:ast\",1324],[\"CommandWord:source\",1353],[\"Command:ast\",1406],[\"Command:source\",1460],[\"Cron:ast\",1513],[\"Cron:source\",1768]],\"rootProductionKey\":\"Cron#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
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
