// Auto-generated from packages/toml/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Value#0\",\"Value#1\",\"Value#2\",\"Value#3\",\"Value#dispatch\",\"Pair#0\",\"Table#0\",\"Document#0\",\"doubleQuoted\",\"value\",\"true\",\"false\",\"int\",\"css\",\"key\",\"=\",\"pairs\",\"[\",\"name\",\"]\",\"items\",\"string\",\"ast\",\"type\",\"source\",\"boolean\",\"integer\",\"pair\",\" = \",\"table\",\"] \",\"document\",\"\",\"Value\",\"Pair\",\"Pair|Table\"],\"numberPool\":[],\"productionOffsets\":[[\"Value#0\",0],[\"Value#1\",26],[\"Value#2\",42],[\"Value#3\",58],[\"Value#dispatch\",84],[\"Pair#0\",137],[\"Table#0\",197],[\"Document#0\",279]],\"renderOffsets\":[[\"Value#0:ast\",357],[\"Value#0:source\",386],[\"Value#1:ast\",402],[\"Value#1:source\",422],[\"Value#2:ast\",433],[\"Value#2:source\",453],[\"Value#3:ast\",464],[\"Value#3:source\",493],[\"Pair#0:ast\",509],[\"Pair#0:source\",552],[\"Table#0:ast\",583],[\"Table#0:source\",626],[\"Document#0:ast\",662],[\"Document#0:source\",691]],\"stringifyOffsets\":[[\"Value#0:ast\",707],[\"Value#0:source\",752],[\"Value#1:ast\",805],[\"Value#1:source\",840],[\"Value#2:ast\",875],[\"Value#2:source\",910],[\"Value#3:ast\",945],[\"Value#3:source\",990],[\"Pair#0:ast\",1043],[\"Pair#0:source\",1124],[\"Table#0:ast\",1205],[\"Table#0:source\",1291],[\"Document#0:ast\",1377],[\"Document#0:source\",1431]],\"stringifyOffsetsByNodeType\":[[\"Value:ast\",[707,805,875,945]],[\"Value:source\",[752,840,910,990]],[\"Pair:ast\",[1043]],[\"Pair:source\",[1124]],[\"Table:ast\",[1205]],[\"Table:source\",[1291]],[\"Document:ast\",[1377]],[\"Document:source\",[1431]],[\"Pair|Table:ast\",[1043,1205]],[\"Pair|Table:source\",[1124,1291]]],\"stringifyDispatcherOffsets\":[[\"Value:ast\",707],[\"Value:source\",752],[\"Pair:ast\",1043],[\"Pair:source\",1124],[\"Table:ast\",1205],[\"Table:source\",1291],[\"Document:ast\",1377],[\"Document:source\",1431]],\"rootProductionKey\":\"Document#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAECAAAABACEgECCQAAAEAQAANgAQAAABABAQoAAABAEAADYAIAAAAQAQELAAAAQBAAA2ADAAAAEAEgAgwAAAAQAhIBAgkAAABAEAAwKgAAAFIBAAAAQBAAMBoAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwOgAAAFIBAAAAQEEQAANgBQAAABABIAENAAAAEAISAQIOAAAAAxADAQ8AAAADEAQwVAAAAFIKAAAAEwkAAABQAQAAAEEQBUAQAANgBgAAABcQAAAAEAEBEQAAAAMQAiABDQAAABADEgIDEgAAAAMQBAETAAAAAxAFEAcwiQAAAFISAAAAUwcLAAAAFBAAAAADUOP///+MEAZAEAADYAcAAAAXFAAAABABEAMwxQAAAFISAAAAUwMLAAAAFBQAAAADUOP///+MEAMwiQAAAFISAAAAUwMLAAAAFBQAAAADUOP///+MEAJAgBUAAACFCQAAAHAWAAAAhwIAAAAXAAAACQAAAImFCQAAAHAYAAAAhgEAAACJgBkAAACChwIAAAAXAAAACQAAAImACgAAAIYBAAAAiYAZAAAAg4cCAAAAFwAAAAkAAACJgAsAAACGAQAAAImAGgAAAIUJAAAAcBYAAACHAgAAABcAAAAJAAAAiYUJAAAAcBgAAACGAQAAAImAGwAAAIUOAAAAcBYAAACFCQAAAHAWAAAAhwMAAAAXAAAADgAAAAkAAACJhQ4AAABwGAAAAIAcAAAAhQkAAABwGAAAAIYDAAAAiYAdAAAAhRIAAABwFgAAAIUQAAAAcBYAAACHAwAAABcAAAASAAAAEAAAAImAEQAAAIUSAAAAcBgAAACAHgAAAIUQAAAAcBgAAACGBAAAAImAHwAAAIUUAAAAcBYAAACHAgAAABcAAAAUAAAAiYUUAAAAcBgAAACGAQAAAIlgAAAAAIyKFwAAAIsVAAAAigkAAAATCQAAAIGMjIUJAAAAcBgAAACGAQAAAIlgAAAAAIyQAgAAAAEAAAAYAAAAIAAAACAAAAAJAAAA/////wCMhQkAAABwGAAAAIYBAAAAiWABAAAAjIoXAAAAixkAAACKCQAAAI0BjIAKAAAAhgEAAACJYAEAAACMkAEAAAAAAAAAGAAAAAoAAACMgAoAAACGAQAAAIlgAgAAAIyKFwAAAIsZAAAAigkAAACNAIyACwAAAIYBAAAAiWACAAAAjJABAAAAAAAAABgAAAALAAAAjIALAAAAhgEAAACJYAMAAACMihcAAACLGgAAAIoJAAAAEwkAAACBjIyFCQAAAHAYAAAAhgEAAACJYAMAAACMkAIAAAABAAAAGAAAACAAAAAgAAAACQAAAP////8AjIUJAAAAcBgAAACGAQAAAIlgBQAAAIyKFwAAAIsbAAAAig4AAAATDgAAAIGMigkAAABxIQAAABYAAAATCQAAAIGMjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBQAAAIyQAwAAAAIAAAAYAAAAIAAAABwAAAAgAAAADgAAAP////8ACQAAACEAAAAAjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBgAAAIyKFwAAAIsdAAAAihIAAAATEgAAAIGMihAAAABxIgAAABYAAAATEAAAAIGMjIARAAAAhRIAAABwGAAAAIAeAAAAhRAAAABwGAAAAIYEAAAAiWAGAAAAjJADAAAAAgAAABgAAAARAAAAHgAAACAAAAASAAAA/////wAQAAAAIgAAAAGMgBEAAACFEgAAAHAYAAAAgB4AAACFEAAAAHAYAAAAhgQAAACJYAcAAACMihcAAACLHwAAAIoUAAAAcSMAAAAWAAAAExQAAACBjIyFFAAAAHAYAAAAhgEAAACJYAcAAACMkAIAAAABAAAAGAAAACAAAAAgAAAAFAAAACMAAAABjIUUAAAAcBgAAACGAQAAAIk=";
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
