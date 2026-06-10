// Auto-generated from packages/toml/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Value#0\",\"Value#1\",\"Value#2\",\"Value#3\",\"Value#dispatch\",\"Pair#0\",\"Table#0\",\"Document#0\",\"doubleQuoted\",\"value\",\"true\",\"false\",\"int\",\"css\",\"key\",\"=\",\"pairs\",\"[\",\"name\",\"]\",\"items\",\"string\",\"ast\",\"type\",\"source\",\"boolean\",\"integer\",\"pair\",\" = \",\"table\",\"] \",\"document\",\"\",\"Value\",\"Pair\",\"Pair|Table\"],\"numberPool\":[],\"productionOffsets\":[[\"Value#0\",0],[\"Value#1\",26],[\"Value#2\",42],[\"Value#3\",58],[\"Value#dispatch\",84],[\"Pair#0\",137],[\"Table#0\",197],[\"Document#0\",278]],\"renderOffsets\":[[\"Value#0:ast\",354],[\"Value#0:source\",383],[\"Value#1:ast\",399],[\"Value#1:source\",419],[\"Value#2:ast\",430],[\"Value#2:source\",450],[\"Value#3:ast\",461],[\"Value#3:source\",490],[\"Pair#0:ast\",506],[\"Pair#0:source\",549],[\"Table#0:ast\",580],[\"Table#0:source\",623],[\"Document#0:ast\",659],[\"Document#0:source\",688]],\"stringifyOffsets\":[[\"Value#0:ast\",704],[\"Value#0:source\",749],[\"Value#1:ast\",802],[\"Value#1:source\",837],[\"Value#2:ast\",872],[\"Value#2:source\",907],[\"Value#3:ast\",942],[\"Value#3:source\",987],[\"Pair#0:ast\",1040],[\"Pair#0:source\",1121],[\"Table#0:ast\",1202],[\"Table#0:source\",1288],[\"Document#0:ast\",1374],[\"Document#0:source\",1428]],\"stringifyOffsetsByNodeType\":[[\"Value:ast\",[704,802,872,942]],[\"Value:source\",[749,837,907,987]],[\"Pair:ast\",[1040]],[\"Pair:source\",[1121]],[\"Table:ast\",[1202]],[\"Table:source\",[1288]],[\"Document:ast\",[1374]],[\"Document:source\",[1428]],[\"Pair|Table:ast\",[1040,1202]],[\"Pair|Table:source\",[1121,1288]]],\"stringifyDispatcherOffsets\":[[\"Value:ast\",704],[\"Value:source\",749],[\"Pair:ast\",1040],[\"Pair:source\",1121],[\"Table:ast\",1202],[\"Table:source\",1288],[\"Document:ast\",1374],[\"Document:source\",1428]],\"rootProductionKey\":\"Document#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAECAAAABACEgECCQAAAEAQAANgAQAAABABAQoAAABAEAADYAIAAAAQAQELAAAAQBAAA2ADAAAAEAEgAgwAAAAQAhIBAgkAAABAEAAwKgAAAFIBAAAAQBAAMBoAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwOgAAAFIBAAAAQEEQAANgBQAAABABIAENAAAAEAISAQIOAAAAAxADAQ8AAAADEAQwVAAAAFIKAAAAEwkAAABQAQAAAEEQBUAQAANgBgAAABcQAAAAEAEBEQAAAAMQAiABDQAAABADEgIDEgAAAAMQBAETAAAAAxAFEAcwiQAAAFIRAAAAFBAAAABTBwYAAAADUOP///8QBkAQAANgBwAAABcUAAAAEAEQAzDFAAAAUhEAAAAUFAAAAFMDBgAAAANQ4////xADMIkAAABSEQAAABQUAAAAUwMGAAAAA1Dj////EAJAgBUAAACFCQAAAHAWAAAAhwIAAAAXAAAACQAAAImFCQAAAHAYAAAAhgEAAACJgBkAAACChwIAAAAXAAAACQAAAImACgAAAIYBAAAAiYAZAAAAg4cCAAAAFwAAAAkAAACJgAsAAACGAQAAAImAGgAAAIUJAAAAcBYAAACHAgAAABcAAAAJAAAAiYUJAAAAcBgAAACGAQAAAImAGwAAAIUOAAAAcBYAAACFCQAAAHAWAAAAhwMAAAAXAAAADgAAAAkAAACJhQ4AAABwGAAAAIAcAAAAhQkAAABwGAAAAIYDAAAAiYAdAAAAhRIAAABwFgAAAIUQAAAAcBYAAACHAwAAABcAAAASAAAAEAAAAImAEQAAAIUSAAAAcBgAAACAHgAAAIUQAAAAcBgAAACGBAAAAImAHwAAAIUUAAAAcBYAAACHAgAAABcAAAAUAAAAiYUUAAAAcBgAAACGAQAAAIlgAAAAAIyKFwAAAIsVAAAAigkAAAATCQAAAIGMjIUJAAAAcBgAAACGAQAAAIlgAAAAAIyQAgAAAAEAAAAYAAAAIAAAACAAAAAJAAAA/////wCMhQkAAABwGAAAAIYBAAAAiWABAAAAjIoXAAAAixkAAACKCQAAAI0BjIAKAAAAhgEAAACJYAEAAACMkAEAAAAAAAAAGAAAAAoAAACMgAoAAACGAQAAAIlgAgAAAIyKFwAAAIsZAAAAigkAAACNAIyACwAAAIYBAAAAiWACAAAAjJABAAAAAAAAABgAAAALAAAAjIALAAAAhgEAAACJYAMAAACMihcAAACLGgAAAIoJAAAAEwkAAACBjIyFCQAAAHAYAAAAhgEAAACJYAMAAACMkAIAAAABAAAAGAAAACAAAAAgAAAACQAAAP////8AjIUJAAAAcBgAAACGAQAAAIlgBQAAAIyKFwAAAIsbAAAAig4AAAATDgAAAIGMigkAAABxIQAAABYAAAATCQAAAIGMjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBQAAAIyQAwAAAAIAAAAYAAAAIAAAABwAAAAgAAAADgAAAP////8ACQAAACEAAAAAjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBgAAAIyKFwAAAIsdAAAAihIAAAATEgAAAIGMihAAAABxIgAAABYAAAATEAAAAIGMjIARAAAAhRIAAABwGAAAAIAeAAAAhRAAAABwGAAAAIYEAAAAiWAGAAAAjJADAAAAAgAAABgAAAARAAAAHgAAACAAAAASAAAA/////wAQAAAAIgAAAAGMgBEAAACFEgAAAHAYAAAAgB4AAACFEAAAAHAYAAAAhgQAAACJYAcAAACMihcAAACLHwAAAIoUAAAAcSMAAAAWAAAAExQAAACBjIyFFAAAAHAYAAAAhgEAAACJYAcAAACMkAIAAAABAAAAGAAAACAAAAAgAAAAFAAAACMAAAABjIUUAAAAcBgAAACGAQAAAIk=";
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
