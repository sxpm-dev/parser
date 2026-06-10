// Auto-generated from packages/toml/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Value#0\",\"Value#1\",\"Value#2\",\"Value#3\",\"Value#dispatch\",\"Pair#0\",\"Table#0\",\"Document#0\",\"doubleQuoted\",\"value\",\"true\",\"false\",\"int\",\"css\",\"key\",\"=\",\"[\",\"name\",\"]\",\"pairs\",\"items\",\"string\",\"ast\",\"type\",\"source\",\"boolean\",\"integer\",\"pair\",\" = \",\"table\",\"] \",\"document\",\"\",\"Value\",\"Pair\",\"Pair|Table\"],\"numberPool\":[],\"productionOffsets\":[[\"Value#0\",0],[\"Value#1\",26],[\"Value#2\",42],[\"Value#3\",58],[\"Value#dispatch\",84],[\"Pair#0\",137],[\"Table#0\",197],[\"Document#0\",265]],\"renderOffsets\":[[\"Value#0:ast\",320],[\"Value#0:source\",349],[\"Value#1:ast\",365],[\"Value#1:source\",385],[\"Value#2:ast\",396],[\"Value#2:source\",416],[\"Value#3:ast\",427],[\"Value#3:source\",456],[\"Pair#0:ast\",472],[\"Pair#0:source\",515],[\"Table#0:ast\",546],[\"Table#0:source\",589],[\"Document#0:ast\",625],[\"Document#0:source\",654]],\"stringifyOffsets\":[[\"Value#0:ast\",670],[\"Value#0:source\",715],[\"Value#1:source\",768],[\"Value#2:source\",803],[\"Value#3:ast\",838],[\"Value#3:source\",883],[\"Pair#0:ast\",936],[\"Pair#0:source\",1017],[\"Table#0:ast\",1098],[\"Table#0:source\",1184],[\"Document#0:ast\",1270],[\"Document#0:source\",1324]],\"stringifyOffsetsByNodeType\":[[\"Value:ast\",[670,838]],[\"Value:source\",[715,768,803,883]],[\"Pair:ast\",[936]],[\"Pair:source\",[1017]],[\"Table:ast\",[1098]],[\"Table:source\",[1184]],[\"Document:ast\",[1270]],[\"Document:source\",[1324]],[\"Pair|Table:ast\",[936,1098]],[\"Pair|Table:source\",[1017,1184]]],\"stringifyDispatcherOffsets\":[[\"Value:ast\",670],[\"Value:source\",715],[\"Pair:ast\",936],[\"Pair:source\",1017],[\"Table:ast\",1098],[\"Table:source\",1184],[\"Document:ast\",1270],[\"Document:source\",1324]],\"rootProductionKey\":\"Document#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAECAAAABACEgECCQAAAEAQAANgAQAAABABAQoAAABAEAADYAIAAAAQAQELAAAAQBAAA2ADAAAAEAEgAgwAAAAQAhIBAgkAAABAEAAwKgAAAFIBAAAAQBAAMBoAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwOgAAAFIBAAAAQEEQAANgBQAAABABIAENAAAAEAISAQIOAAAAAxADAQ8AAAADEAQwVAAAAFIKAAAAEwkAAABQAQAAAEEQBUAQAANgBgAAABABARAAAAADEAIgAQ0AAAAQAxICAxEAAAADEAQBEgAAAAMQBTCJAAAAUgsAAAAUEwAAAANQ6////xAGQBAAA2AHAAAAEAEwiQAAAFILAAAAFBQAAAADUOv///8wxQAAAFILAAAAFBQAAAADUOv///8QAkCAFQAAAIUJAAAAcBYAAACHAgAAABcAAAAJAAAAiYUJAAAAcBgAAACGAQAAAImAGQAAAIKHAgAAABcAAAAJAAAAiYAKAAAAhgEAAACJgBkAAACDhwIAAAAXAAAACQAAAImACwAAAIYBAAAAiYAaAAAAhQkAAABwFgAAAIcCAAAAFwAAAAkAAACJhQkAAABwGAAAAIYBAAAAiYAbAAAAhQ4AAABwFgAAAIUJAAAAcBYAAACHAwAAABcAAAAOAAAACQAAAImFDgAAAHAYAAAAgBwAAACFCQAAAHAYAAAAhgMAAACJgB0AAACFEQAAAHAWAAAAhRMAAABwFgAAAIcDAAAAFwAAABEAAAATAAAAiYAQAAAAhREAAABwGAAAAIAeAAAAhRMAAABwGAAAAIYEAAAAiYAfAAAAhRQAAABwFgAAAIcCAAAAFwAAABQAAACJhRQAAABwGAAAAIYBAAAAiWAAAAAAjIoXAAAAixUAAACKCQAAABMJAAAAgYyMhQkAAABwGAAAAIYBAAAAiWAAAAAAjJACAAAAAQAAABgAAAAgAAAAIAAAAAkAAAD/////AIyFCQAAAHAYAAAAhgEAAACJYAEAAACMkAEAAAAAAAAAGAAAAAoAAACMgAoAAACGAQAAAIlgAgAAAIyQAQAAAAAAAAAYAAAACwAAAIyACwAAAIYBAAAAiWADAAAAjIoXAAAAixoAAACKCQAAABMJAAAAgYyMhQkAAABwGAAAAIYBAAAAiWADAAAAjJACAAAAAQAAABgAAAAgAAAAIAAAAAkAAAD/////AIyFCQAAAHAYAAAAhgEAAACJYAUAAACMihcAAACLGwAAAIoOAAAAEw4AAACBjIoJAAAAcSEAAAAWAAAAEwkAAACBjIyFDgAAAHAYAAAAgBwAAACFCQAAAHAYAAAAhgMAAACJYAUAAACMkAMAAAACAAAAGAAAACAAAAAcAAAAIAAAAA4AAAD/////AAkAAAAhAAAAAIyFDgAAAHAYAAAAgBwAAACFCQAAAHAYAAAAhgMAAACJYAYAAACMihcAAACLHQAAAIoRAAAAExEAAACBjIoTAAAAcSIAAAAWAAAAExMAAACBjIyAEAAAAIURAAAAcBgAAACAHgAAAIUTAAAAcBgAAACGBAAAAIlgBgAAAIyQAwAAAAIAAAAYAAAAEAAAAB4AAAAgAAAAEQAAAP////8AEwAAACIAAAABjIAQAAAAhREAAABwGAAAAIAeAAAAhRMAAABwGAAAAIYEAAAAiWAHAAAAjIoXAAAAix8AAACKFAAAAHEjAAAAFgAAABMUAAAAgYyMhRQAAABwGAAAAIYBAAAAiWAHAAAAjJACAAAAAQAAABgAAAAgAAAAIAAAABQAAAAjAAAAAYyFFAAAAHAYAAAAhgEAAACJ";
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
