// Auto-generated from packages/toml/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Value#0\",\"Value#1\",\"Value#2\",\"Value#3\",\"Value#dispatch\",\"Pair#0\",\"Table#0\",\"Document#0\",\"doubleQuoted\",\"value\",\"true\",\"false\",\"int\",\"css\",\"key\",\"=\",\"pairs\",\"[\",\"name\",\"]\",\"items\",\"string\",\"ast\",\"type\",\"source\",\"boolean\",\"integer\",\"pair\",\" = \",\"table\",\"] \",\"document\",\"\",\"Value\",\"Pair\",\"Pair|Table\"],\"numberPool\":[],\"productionOffsets\":[[\"Value#0\",0],[\"Value#1\",26],[\"Value#2\",42],[\"Value#3\",58],[\"Value#dispatch\",84],[\"Pair#0\",137],[\"Table#0\",197],[\"Document#0\",284]],\"renderOffsets\":[[\"Value#0:ast\",363],[\"Value#0:source\",392],[\"Value#1:ast\",408],[\"Value#1:source\",428],[\"Value#2:ast\",439],[\"Value#2:source\",459],[\"Value#3:ast\",470],[\"Value#3:source\",499],[\"Pair#0:ast\",515],[\"Pair#0:source\",558],[\"Table#0:ast\",589],[\"Table#0:source\",632],[\"Document#0:ast\",668],[\"Document#0:source\",697]],\"stringifyOffsets\":[[\"Value#0:ast\",713],[\"Value#0:source\",758],[\"Value#1:ast\",811],[\"Value#1:source\",846],[\"Value#2:ast\",881],[\"Value#2:source\",916],[\"Value#3:ast\",951],[\"Value#3:source\",996],[\"Pair#0:ast\",1049],[\"Pair#0:source\",1130],[\"Table#0:ast\",1211],[\"Table#0:source\",1297],[\"Document#0:ast\",1383],[\"Document#0:source\",1437]],\"stringifyOffsetsByNodeType\":[[\"Value:ast\",[713,811,881,951]],[\"Value:source\",[758,846,916,996]],[\"Pair:ast\",[1049]],[\"Pair:source\",[1130]],[\"Table:ast\",[1211]],[\"Table:source\",[1297]],[\"Document:ast\",[1383]],[\"Document:source\",[1437]],[\"Pair|Table:ast\",[1049,1211]],[\"Pair|Table:source\",[1130,1297]]],\"stringifyDispatcherOffsets\":[[\"Value:ast\",713],[\"Value:source\",758],[\"Pair:ast\",1049],[\"Pair:source\",1130],[\"Table:ast\",1211],[\"Table:source\",1297],[\"Document:ast\",1383],[\"Document:source\",1437]],\"rootProductionKey\":\"Document#0\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAECAAAABACEgECCQAAAEAQAANgAQAAABABAQoAAABAEAADYAIAAAAQAQELAAAAQBAAA2ADAAAAEAEgAgwAAAAQAhIBAgkAAABAEAAwKgAAAFIBAAAAQBAAMBoAAABSAQAAAEAQADAAAAAAUgEAAABAEAAwOgAAAFIBAAAAQEEQAANgBQAAABABIAENAAAAEAISAQIOAAAAAxADAQ8AAAADEAQwVAAAAFIKAAAAEwkAAABQAQAAAEEQBUAQAANgBgAAABcQAAAAEAEBEQAAAAMQAiABDQAAABADEgIDEgAAAAMQBAETAAAAAxAFEAcwiQAAAFIXAAAAUwcQAAAAFBAAAABQAAAAAANQ3v///4wQBkAQAANgBwAAABcUAAAAEAEQAzDFAAAAUhAAAABTAyoAAAAUFAAAAFAaAAAAMIkAAABSFwAAAFMDEAAAABQUAAAAUAAAAAADUMT///+MEAJAgBUAAACFCQAAAHAWAAAAhwIAAAAXAAAACQAAAImFCQAAAHAYAAAAhgEAAACJgBkAAACChwIAAAAXAAAACQAAAImACgAAAIYBAAAAiYAZAAAAg4cCAAAAFwAAAAkAAACJgAsAAACGAQAAAImAGgAAAIUJAAAAcBYAAACHAgAAABcAAAAJAAAAiYUJAAAAcBgAAACGAQAAAImAGwAAAIUOAAAAcBYAAACFCQAAAHAWAAAAhwMAAAAXAAAADgAAAAkAAACJhQ4AAABwGAAAAIAcAAAAhQkAAABwGAAAAIYDAAAAiYAdAAAAhRIAAABwFgAAAIUQAAAAcBYAAACHAwAAABcAAAASAAAAEAAAAImAEQAAAIUSAAAAcBgAAACAHgAAAIUQAAAAcBgAAACGBAAAAImAHwAAAIUUAAAAcBYAAACHAgAAABcAAAAUAAAAiYUUAAAAcBgAAACGAQAAAIlgAAAAAIyKFwAAAIsVAAAAigkAAAATCQAAAIGMjIUJAAAAcBgAAACGAQAAAIlgAAAAAIyQAgAAAAEAAAAYAAAAIAAAACAAAAAJAAAA/////wCMhQkAAABwGAAAAIYBAAAAiWABAAAAjIoXAAAAixkAAACKCQAAAI0BjIAKAAAAhgEAAACJYAEAAACMkAEAAAAAAAAAGAAAAAoAAACMgAoAAACGAQAAAIlgAgAAAIyKFwAAAIsZAAAAigkAAACNAIyACwAAAIYBAAAAiWACAAAAjJABAAAAAAAAABgAAAALAAAAjIALAAAAhgEAAACJYAMAAACMihcAAACLGgAAAIoJAAAAEwkAAACBjIyFCQAAAHAYAAAAhgEAAACJYAMAAACMkAIAAAABAAAAGAAAACAAAAAgAAAACQAAAP////8AjIUJAAAAcBgAAACGAQAAAIlgBQAAAIyKFwAAAIsbAAAAig4AAAATDgAAAIGMigkAAABxIQAAABYAAAATCQAAAIGMjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBQAAAIyQAwAAAAIAAAAYAAAAIAAAABwAAAAgAAAADgAAAP////8ACQAAACEAAAAAjIUOAAAAcBgAAACAHAAAAIUJAAAAcBgAAACGAwAAAIlgBgAAAIyKFwAAAIsdAAAAihIAAAATEgAAAIGMihAAAABxIgAAABYAAAATEAAAAIGMjIARAAAAhRIAAABwGAAAAIAeAAAAhRAAAABwGAAAAIYEAAAAiWAGAAAAjJADAAAAAgAAABgAAAARAAAAHgAAACAAAAASAAAA/////wAQAAAAIgAAAAGMgBEAAACFEgAAAHAYAAAAgB4AAACFEAAAAHAYAAAAhgQAAACJYAcAAACMihcAAACLHwAAAIoUAAAAcSMAAAAWAAAAExQAAACBjIyFFAAAAHAYAAAAhgEAAACJYAcAAACMkAIAAAABAAAAGAAAACAAAAAgAAAAFAAAACMAAAABjIUUAAAAcBgAAACGAQAAAIk=";
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
