// Auto-generated from packages/cron/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"CronField#0\",\"CronField#1\",\"CronField#2\",\"CronField#3\",\"CronField#dispatch\",\"CommandWord#0\",\"Command#0\",\"Cron#0\",\"*\",\"/\",\"int\",\"step\",\"value\",\"start\",\"-\",\"end\",\"css\",\"words\",\"minute\",\"hour\",\"dayOfMonth\",\"month\",\"dayOfWeek\",\"command\",\"wildcard\",\"type\",\"ast\",\"*/\",\"source\",\"range\",\"cron\",\" \",\"CommandWord\",\"CronField\",\"Command\"],\"numberPool\":[],\"productionOffsets\":[[\"CronField#0\",0],[\"CronField#1\",16],[\"CronField#2\",58],[\"CronField#3\",84],[\"CronField#dispatch\",136],[\"CommandWord#0\",189],[\"Command#0\",215],[\"Cron#0\",249]],\"renderOffsets\":[[\"CronField#0:ast\",407],[\"CronField#0:source\",422],[\"CronField#1:ast\",433],[\"CronField#1:source\",462],[\"CronField#2:ast\",483],[\"CronField#2:source\",512],[\"CronField#3:ast\",528],[\"CronField#3:source\",571],[\"CommandWord#0:ast\",602],[\"CommandWord#0:source\",613],[\"Command#0:ast\",629],[\"Command#0:source\",658],[\"Cron#0:ast\",674],[\"Cron#0:source\",773]],\"stringifyOffsets\":[[\"CronField#0:ast\",864],[\"CronField#1:ast\",892],[\"CronField#2:ast\",942],[\"CronField#3:ast\",987],[\"CommandWord#0:ast\",1059],[\"Command#0:ast\",1088],[\"Cron#0:ast\",1142]],\"stringifyOffsetsByNodeType\":[[\"CronField:ast\",[864,892,942,987]],[\"CommandWord:ast\",[1059]],[\"Command:ast\",[1088]],[\"Cron:ast\",[1142]]],\"stringifyDispatcherOffsets\":[[\"CronField:ast\",864],[\"CommandWord:ast\",1059],[\"Command:ast\",1088],[\"Cron:ast\",1142]],\"rootProductionKey\":\"Cron#0\",\"targets\":[\"ast\",\"source\"]}";
const __OPS_B64: string = "EAADYAAAAAAQAQEIAAAAQBAAA2ABAAAAEAEBCAAAAAMQAgEJAAAAAxADIAIKAAAAEAQSAwQLAAAAQBAAA2ACAAAAEAEgAgoAAAAQAhIBAgwAAABAEAADYAMAAAAQASACCgAAABACEgECDQAAAAMQAwEOAAAAAxAEIAIKAAAAEAUSBAUPAAAAQBAAMAAAAABSAQAAAEAQADAQAAAAUgEAAABAEAAwOgAAAFIBAAAAQBAAMFQAAABSAQAAAEBBEAADYAUAAAAQASABEAAAABACEgECDAAAAEAQAANgBgAAABABML0AAABSCwAAABQRAAAAA1Dr////EAJAEAADYAcAAAAQATCIAAAAUgoAAAATEgAAAFABAAAAQRACAxADMIgAAABSCgAAABMTAAAAUAEAAABBEAQDEAUwiAAAAFIKAAAAExQAAABQAQAAAEEQBgMQBzCIAAAAUgoAAAATFQAAAFABAAAAQRAIAxAJMIgAAABSCgAAABMWAAAAUAEAAABBEAoDEAsw1wAAAFIHAAAAExcAAAAQDECAGAAAAIcBAAAAGQAAAImACAAAAIYBAAAAiYALAAAAhQsAAABwGgAAAIcCAAAAGQAAAAsAAACJgBsAAACFCwAAAHAcAAAAhgIAAACJgAwAAACFDAAAAHAaAAAAhwIAAAAZAAAADAAAAImFDAAAAHAcAAAAhgEAAACJgB0AAACFDQAAAHAaAAAAhQ8AAABwGgAAAIcDAAAAGQAAAA0AAAAPAAAAiYUNAAAAcBwAAACADgAAAIUPAAAAcBwAAACGAwAAAImFDAAAAHAaAAAAiYUMAAAAcBwAAACGAQAAAImAFwAAAIURAAAAcBoAAACHAgAAABkAAAARAAAAiYURAAAAcBwAAACGAQAAAImAHgAAAIUSAAAAcBoAAACFEwAAAHAaAAAAhRQAAABwGgAAAIUVAAAAcBoAAACFFgAAAHAaAAAAhRcAAABwGgAAAIcHAAAAGQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAAImFEgAAAHAcAAAAgB8AAACFEwAAAHAcAAAAgB8AAACFFAAAAHAcAAAAgB8AAACFFQAAAHAcAAAAgB8AAACFFgAAAHAcAAAAgB8AAACFFwAAAHAcAAAAhgsAAACJYAAAAACMihkAAACLGAAAAIyACAAAAIYBAAAAiWABAAAAjIoZAAAAiwsAAACKCwAAABMLAAAAgYyMgBsAAACFCwAAAHAcAAAAhgIAAACJYAIAAACMihkAAACLDAAAAIoMAAAAEwwAAACBjIyFDAAAAHAcAAAAhgEAAACJYAMAAACMihkAAACLHQAAAIoNAAAAEw0AAACBjIoPAAAAEw8AAACBjIyFDQAAAHAcAAAAgA4AAACFDwAAAHAcAAAAhgMAAACJYAUAAACMEwwAAACBjIUMAAAAcBwAAACGAQAAAIlgBgAAAIyKGQAAAIsXAAAAihEAAABxIAAAABoAAAATEQAAAIGMjIURAAAAcBwAAACGAQAAAIlgBwAAAIyKGQAAAIseAAAAihIAAABxIQAAABoAAAATEgAAAIGMihMAAABxIQAAABoAAAATEwAAAIGMihQAAABxIQAAABoAAAATFAAAAIGMihUAAABxIQAAABoAAAATFQAAAIGMihYAAABxIQAAABoAAAATFgAAAIGMihcAAABxIgAAABoAAAATFwAAAIGMjIUSAAAAcBwAAACAHwAAAIUTAAAAcBwAAACAHwAAAIUUAAAAcBwAAACAHwAAAIUVAAAAcBwAAACAHwAAAIUWAAAAcBwAAACAHwAAAIUXAAAAcBwAAACGCwAAAIk=";
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
