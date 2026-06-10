// Auto-generated from packages/cron/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"CronField#0\",\"CronField#1\",\"CronField#2\",\"CronField#3\",\"CronField#dispatch\",\"CommandWord#0\",\"Command#0\",\"Cron#0\",\"*\",\"/\",\"int\",\"step\",\"value\",\"start\",\"-\",\"end\",\"css\",\"words\",\"minute\",\"hour\",\"dayOfMonth\",\"month\",\"dayOfWeek\",\"command\",\"wildcard\",\"type\",\"ast\",\"*/\",\"source\",\"range\",\"cron\",\" \",\"\",\"CommandWord\",\"CronField\",\"Command\"],\"numberPool\":[],\"productionOffsets\":[[\"CronField#0\",0],[\"CronField#1\",16],[\"CronField#2\",58],[\"CronField#3\",84],[\"CronField#dispatch\",136],[\"CommandWord#0\",189],[\"Command#0\",215],[\"Cron#0\",274]],\"renderOffsets\":[[\"CronField#0:ast\",432],[\"CronField#0:source\",447],[\"CronField#1:ast\",458],[\"CronField#1:source\",487],[\"CronField#2:ast\",508],[\"CronField#2:source\",537],[\"CronField#3:ast\",553],[\"CronField#3:source\",596],[\"CommandWord#0:ast\",627],[\"CommandWord#0:source\",638],[\"Command#0:ast\",654],[\"Command#0:source\",683],[\"Cron#0:ast\",699],[\"Cron#0:source\",798]],\"stringifyOffsets\":[[\"CronField#0:ast\",910],[\"CronField#0:source\",962],[\"CronField#1:ast\",997],[\"CronField#1:source\",1071],[\"CronField#2:ast\",1129],[\"CronField#2:source\",1198],[\"CronField#3:ast\",1251],[\"CronField#3:source\",1347],[\"CommandWord#0:ast\",1428],[\"CommandWord#0:source\",1457],[\"Command#0:ast\",1510],[\"Command#0:source\",1564],[\"Cron#0:ast\",1617],[\"Cron#0:source\",1872]],\"stringifyOffsetsByNodeType\":[[\"CronField:ast\",[910,997,1129,1251]],[\"CronField:source\",[962,1071,1198,1347]],[\"CommandWord:ast\",[1428]],[\"CommandWord:source\",[1457]],[\"Command:ast\",[1510]],[\"Command:source\",[1564]],[\"Cron:ast\",[1617]],[\"Cron:source\",[1872]]],\"stringifyDispatcherOffsets\":[[\"CronField:ast\",910],[\"CronField:source\",962],[\"CommandWord:ast\",1428],[\"CommandWord:source\",1457],[\"Command:ast\",1510],[\"Command:source\",1564],[\"Cron:ast\",1617],[\"Cron:source\",1872]],\"rootProductionKey\":\"Cron#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQAQEIAAAAQBAAA2ABAAAAEAEBCAAAAAMQAgEJAAAAAxADIAIKAAAAEAQSAwQLAAAAQBAAA2ACAAAAEAEgAgoAAAAQAhIBAgwAAABAEAADYAMAAAAQASACCgAAABACEgECDQAAAAMQAwEOAAAAAxAEIAIKAAAAEAUSBAUPAAAAQBAAMBAAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwVAAAAFIBAAAAQBAAMDoAAABSAQAAAEBBEAADYAUAAAAQASABEAAAABACEgECDAAAAEAQAANgBgAAABABEAMwvQAAAFIRAAAAFBEAAABTAwYAAAADUOP///+FEQAAAFIGAAAAjFABAAAAQRACQBAAA2AHAAAAEAEwiAAAAFIKAAAAExIAAABQAQAAAEEQAgMQAzCIAAAAUgoAAAATEwAAAFABAAAAQRAEAxAFMIgAAABSCgAAABMUAAAAUAEAAABBEAYDEAcwiAAAAFIKAAAAExUAAABQAQAAAEEQCAMQCTCIAAAAUgoAAAATFgAAAFABAAAAQRAKAxALMNcAAABSBwAAABMXAAAAEAxAgBgAAACHAQAAABkAAACJgAgAAACGAQAAAImACwAAAIULAAAAcBoAAACHAgAAABkAAAALAAAAiYAbAAAAhQsAAABwHAAAAIYCAAAAiYAMAAAAhQwAAABwGgAAAIcCAAAAGQAAAAwAAACJhQwAAABwHAAAAIYBAAAAiYAdAAAAhQ0AAABwGgAAAIUPAAAAcBoAAACHAwAAABkAAAANAAAADwAAAImFDQAAAHAcAAAAgA4AAACFDwAAAHAcAAAAhgMAAACJhQwAAABwGgAAAImFDAAAAHAcAAAAhgEAAACJgBcAAACFEQAAAHAaAAAAhwIAAAAZAAAAEQAAAImFEQAAAHAcAAAAhgEAAACJgB4AAACFEgAAAHAaAAAAhRMAAABwGgAAAIUUAAAAcBoAAACFFQAAAHAaAAAAhRYAAABwGgAAAIUXAAAAcBoAAACHBwAAABkAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAACJhRIAAABwHAAAAIAfAAAAhRMAAABwHAAAAIAfAAAAhRQAAABwHAAAAIAfAAAAhRUAAABwHAAAAIAfAAAAhRYAAABwHAAAAIAfAAAAhRcAAABSDwAAAHAcAAAAhgIAAABQBgAAAIyAIAAAAIYKAAAAiWAAAAAAjIoLAAAAj4oMAAAAj4oNAAAAj4oPAAAAj4oZAAAAixgAAACMgAgAAACGAQAAAIlgAAAAAIyQAQAAAAAAAAAcAAAACAAAAIyACAAAAIYBAAAAiWABAAAAjIoMAAAAj4oNAAAAj4oPAAAAj4oLAAAAkYoZAAAAiwsAAACKCwAAABMLAAAAgYyMgBsAAACFCwAAAHAcAAAAhgIAAACJYAEAAACMkAIAAAABAAAAHAAAABsAAAAgAAAACwAAAP////8AjIAbAAAAhQsAAABwHAAAAIYCAAAAiWACAAAAjIoLAAAAj4oNAAAAj4oPAAAAj4oMAAAAkYoZAAAAiwwAAACKDAAAABMMAAAAgYyMhQwAAABwHAAAAIYBAAAAiWACAAAAjJACAAAAAQAAABwAAAAgAAAAIAAAAAwAAAD/////AIyFDAAAAHAcAAAAhgEAAACJYAMAAACMigsAAACPigwAAACPig0AAACRig8AAACRihkAAACLHQAAAIoNAAAAEw0AAACBjIoPAAAAEw8AAACBjIyFDQAAAHAcAAAAgA4AAACFDwAAAHAcAAAAhgMAAACJYAMAAACMkAMAAAACAAAAHAAAACAAAAAOAAAAIAAAAA0AAAD/////AA8AAAD/////AIyFDQAAAHAcAAAAgA4AAACFDwAAAHAcAAAAhgMAAACJYAUAAACMEwwAAACBjIUMAAAAcBwAAACGAQAAAIlgBQAAAIyQAgAAAAEAAAAcAAAAIAAAACAAAAAMAAAA/////wCMhQwAAABwHAAAAIYBAAAAiWAGAAAAjIoZAAAAixcAAACKEQAAAHEhAAAAGgAAABMRAAAAgYyMhREAAABwHAAAAIYBAAAAiWAGAAAAjJACAAAAAQAAABwAAAAgAAAAIAAAABEAAAAhAAAAAIyFEQAAAHAcAAAAhgEAAACJYAcAAACMihkAAACLHgAAAIoSAAAAcSIAAAAaAAAAExIAAACBjIoTAAAAcSIAAAAaAAAAExMAAACBjIoUAAAAcSIAAAAaAAAAExQAAACBjIoVAAAAcSIAAAAaAAAAExUAAACBjIoWAAAAcSIAAAAaAAAAExYAAACBjIoXAAAAcSMAAAAaAAAAExcAAACBjIyFEgAAAHAcAAAAgB8AAACFEwAAAHAcAAAAgB8AAACFFAAAAHAcAAAAgB8AAACFFQAAAHAcAAAAgB8AAACFFgAAAHAcAAAAgB8AAACFFwAAAFIPAAAAcBwAAACGAgAAAFAGAAAAjIAgAAAAhgoAAACJYAcAAACMkAcAAAAGAAAAHAAAACAAAAAfAAAAHwAAAB8AAAAfAAAAHwAAACAAAAASAAAAIgAAAAATAAAAIgAAAAAUAAAAIgAAAAAVAAAAIgAAAAAWAAAAIgAAAAAXAAAAIwAAAAGMhRIAAABwHAAAAIAfAAAAhRMAAABwHAAAAIAfAAAAhRQAAABwHAAAAIAfAAAAhRUAAABwHAAAAIAfAAAAhRYAAABwHAAAAIAfAAAAhRcAAABSDwAAAHAcAAAAhgIAAABQBgAAAIyAIAAAAIYKAAAAiQ==";
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
