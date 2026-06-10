// Auto-generated from packages/toml/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Value#0\",\"Value#1\",\"Value#2\",\"Value#3\",\"Value#dispatch\",\"Pair#0\",\"Table#0\",\"Document#0\",\"doubleQuoted\",\"value\",\"true\",\"false\",\"int\",\"css\",\"key\",\"=\",\"[\",\"name\",\"]\",\"pairs\",\"items\",\"string\",\"ast\",\"type\",\"source\",\"boolean\",\"integer\",\"pair\",\" = \",\"table\",\"] \",\"document\",\"\",\"Value\",\"Pair\",\"Pair|Table\"],\"numberPool\":[],\"productionOffsets\":[[\"Value#0\",0],[\"Value#1\",26],[\"Value#2\",42],[\"Value#3\",58],[\"Value#dispatch\",84],[\"Pair#0\",137],[\"Table#0\",197],[\"Document#0\",273]],\"renderOffsets\":[[\"Value#0:ast\",344],[\"Value#0:source\",373],[\"Value#1:ast\",389],[\"Value#1:source\",409],[\"Value#2:ast\",420],[\"Value#2:source\",440],[\"Value#3:ast\",451],[\"Value#3:source\",480],[\"Pair#0:ast\",496],[\"Pair#0:source\",539],[\"Table#0:ast\",570],[\"Table#0:source\",613],[\"Document#0:ast\",649],[\"Document#0:source\",678]],\"stringifyOffsets\":[[\"Value#0:ast\",694],[\"Value#0:source\",739],[\"Value#1:ast\",792],[\"Value#1:source\",827],[\"Value#2:ast\",862],[\"Value#2:source\",897],[\"Value#3:ast\",932],[\"Value#3:source\",977],[\"Pair#0:ast\",1030],[\"Pair#0:source\",1111],[\"Table#0:ast\",1192],[\"Table#0:source\",1278],[\"Document#0:ast\",1364],[\"Document#0:source\",1418]],\"stringifyOffsetsByNodeType\":[[\"Value:ast\",[694,792,862,932]],[\"Value:source\",[739,827,897,977]],[\"Pair:ast\",[1030]],[\"Pair:source\",[1111]],[\"Table:ast\",[1192]],[\"Table:source\",[1278]],[\"Document:ast\",[1364]],[\"Document:source\",[1418]],[\"Pair|Table:ast\",[1030,1192]],[\"Pair|Table:source\",[1111,1278]]],\"stringifyDispatcherOffsets\":[[\"Value:ast\",694],[\"Value:source\",739],[\"Pair:ast\",1030],[\"Pair:source\",1111],[\"Table:ast\",1192],[\"Table:source\",1278],[\"Document:ast\",1364],[\"Document:source\",1418]],\"rootProductionKey\":\"Document#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAECAAAABACEgECCQAAAEAQAANgAQAAABABAQoAAABAEAADYAIAAAAQAQELAAAAQBAAA2ADAAAAEAEgAgwAAAAQAhIBAgkAAABAEAAwKgAAAFIBAAAAQBAAMBoAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwOgAAAFIBAAAAQEEQAANgBQAAABABIAENAAAAEAISAQIOAAAAAxADAQ8AAAADEAQwVAAAAFIKAAAAEwkAAABQAQAAAEEQBUAQAANgBgAAABABARAAAAADEAIgAQ0AAAAQAxICAxEAAAADEAQBEgAAAAMQBRAHMIkAAABSEQAAABQTAAAAUwcGAAAAA1Dj////EAZAEAADYAcAAAAQARADMIkAAABSEQAAABQUAAAAUwMGAAAAA1Dj////EAMwxQAAAFIRAAAAFBQAAABTAwYAAAADUOP///8QAkCAFQAAAIUJAAAAcBYAAACHAgAAABcAAAAJAAAAiYUJAAAAcBgAAACGAQAAAImAGQAAAIKHAgAAABcAAAAJAAAAiYAKAAAAhgEAAACJgBkAAACDhwIAAAAXAAAACQAAAImACwAAAIYBAAAAiYAaAAAAhQkAAABwFgAAAIcCAAAAFwAAAAkAAACJhQkAAABwGAAAAIYBAAAAiYAbAAAAhQ4AAABwFgAAAIUJAAAAcBYAAACHAwAAABcAAAAOAAAACQAAAImFDgAAAHAYAAAAgBwAAACFCQAAAHAYAAAAhgMAAACJgB0AAACFEQAAAHAWAAAAhRMAAABwFgAAAIcDAAAAFwAAABEAAAATAAAAiYAQAAAAhREAAABwGAAAAIAeAAAAhRMAAABwGAAAAIYEAAAAiYAfAAAAhRQAAABwFgAAAIcCAAAAFwAAABQAAACJhRQAAABwGAAAAIYBAAAAiWAAAAAAjIoXAAAAixUAAACKCQAAABMJAAAAgYyMhQkAAABwGAAAAIYBAAAAiWAAAAAAjJACAAAAAQAAABgAAAAgAAAAIAAAAAkAAAD/////AIyFCQAAAHAYAAAAhgEAAACJYAEAAACMihcAAACLGQAAAIoJAAAAjQGMgAoAAACGAQAAAIlgAQAAAIyQAQAAAAAAAAAYAAAACgAAAIyACgAAAIYBAAAAiWACAAAAjIoXAAAAixkAAACKCQAAAI0AjIALAAAAhgEAAACJYAIAAACMkAEAAAAAAAAAGAAAAAsAAACMgAsAAACGAQAAAIlgAwAAAIyKFwAAAIsaAAAAigkAAAATCQAAAIGMjIUJAAAAcBgAAACGAQAAAIlgAwAAAIyQAgAAAAEAAAAYAAAAIAAAACAAAAAJAAAA/////wCMhQkAAABwGAAAAIYBAAAAiWAFAAAAjIoXAAAAixsAAACKDgAAABMOAAAAgYyKCQAAAHEhAAAAFgAAABMJAAAAgYyMhQ4AAABwGAAAAIAcAAAAhQkAAABwGAAAAIYDAAAAiWAFAAAAjJADAAAAAgAAABgAAAAgAAAAHAAAACAAAAAOAAAA/////wAJAAAAIQAAAACMhQ4AAABwGAAAAIAcAAAAhQkAAABwGAAAAIYDAAAAiWAGAAAAjIoXAAAAix0AAACKEQAAABMRAAAAgYyKEwAAAHEiAAAAFgAAABMTAAAAgYyMgBAAAACFEQAAAHAYAAAAgB4AAACFEwAAAHAYAAAAhgQAAACJYAYAAACMkAMAAAACAAAAGAAAABAAAAAeAAAAIAAAABEAAAD/////ABMAAAAiAAAAAYyAEAAAAIURAAAAcBgAAACAHgAAAIUTAAAAcBgAAACGBAAAAIlgBwAAAIyKFwAAAIsfAAAAihQAAABxIwAAABYAAAATFAAAAIGMjIUUAAAAcBgAAACGAQAAAIlgBwAAAIyQAgAAAAEAAAAYAAAAIAAAACAAAAAUAAAAIwAAAAGMhRQAAABwGAAAAIYBAAAAiQ==";
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
