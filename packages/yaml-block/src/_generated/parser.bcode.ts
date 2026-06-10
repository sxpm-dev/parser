// Auto-generated from packages/yaml-block/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"YamlScalar#0\",\"YamlMappingEntry#0\",\"YamlMapping#0\",\"YamlSequenceItem#0\",\"YamlSequence#0\",\"YamlNode#0\",\"YamlBlock#0\",\"\\n\",\"value\",\"css\",\"key\",\":\",\" \",\"entries\",\"- \",\"items\",\"node\",\"root\",\"ast\",\"source\",\"entry\",\"type\",\": \",\"mapping\",\"item\",\"sequence\",\"\",\"YamlMapping|YamlScalar|YamlSequence\",\"YamlMappingEntry\",\"YamlSequenceItem\",\"YamlNode\"],\"numberPool\":[],\"productionOffsets\":[[\"YamlScalar#0\",0],[\"YamlMappingEntry#0\",33],[\"YamlMapping#0\",143],[\"YamlSequenceItem#0\",194],[\"YamlSequence#0\",278],[\"YamlNode#0\",329],[\"YamlBlock#0\",405]],\"renderOffsets\":[[\"YamlScalar#0:ast\",439],[\"YamlScalar#0:source\",450],[\"YamlMappingEntry#0:ast\",466],[\"YamlMappingEntry#0:source\",509],[\"YamlMapping#0:ast\",540],[\"YamlMapping#0:source\",569],[\"YamlSequenceItem#0:ast\",585],[\"YamlSequenceItem#0:source\",614],[\"YamlSequence#0:ast\",635],[\"YamlSequence#0:source\",664],[\"YamlNode#0:ast\",680],[\"YamlNode#0:source\",691],[\"YamlBlock#0:ast\",707],[\"YamlBlock#0:source\",718]],\"stringifyOffsets\":[[\"YamlScalar#0:ast\",734],[\"YamlScalar#0:source\",763],[\"YamlMappingEntry#0:ast\",816],[\"YamlMappingEntry#0:source\",897],[\"YamlMapping#0:ast\",978],[\"YamlMapping#0:source\",1032],[\"YamlSequenceItem#0:ast\",1085],[\"YamlSequenceItem#0:source\",1144],[\"YamlSequence#0:ast\",1202],[\"YamlSequence#0:source\",1256],[\"YamlNode#0:ast\",1309],[\"YamlNode#0:source\",1347],[\"YamlBlock#0:ast\",1400],[\"YamlBlock#0:source\",1438]],\"stringifyOffsetsByNodeType\":[[\"YamlScalar:ast\",[734]],[\"YamlScalar:source\",[763]],[\"YamlMappingEntry:ast\",[816]],[\"YamlMappingEntry:source\",[897]],[\"YamlMapping:ast\",[978]],[\"YamlMapping:source\",[1032]],[\"YamlSequenceItem:ast\",[1085]],[\"YamlSequenceItem:source\",[1144]],[\"YamlSequence:ast\",[1202]],[\"YamlSequence:source\",[1256]],[\"YamlNode:ast\",[1309]],[\"YamlNode:source\",[1347]],[\"YamlBlock:ast\",[1400]],[\"YamlBlock:source\",[1438]],[\"YamlMapping|YamlScalar|YamlSequence:ast\",[978,734,1202]],[\"YamlMapping|YamlScalar|YamlSequence:source\",[1032,763,1256]]],\"stringifyDispatcherOffsets\":[[\"YamlScalar:ast\",734],[\"YamlScalar:source\",763],[\"YamlMappingEntry:ast\",816],[\"YamlMappingEntry:source\",897],[\"YamlMapping:ast\",978],[\"YamlMapping:source\",1032],[\"YamlSequenceItem:ast\",1085],[\"YamlSequenceItem:source\",1144],[\"YamlSequence:ast\",1202],[\"YamlSequence:source\",1256],[\"YamlNode:ast\",1309],[\"YamlNode:source\",1347],[\"YamlBlock:ast\",1400],[\"YamlBlock:source\",1438]],\"rootProductionKey\":\"YamlBlock#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASEBAAAAAQAAAAcAAAAQAhYBAggAAABAEAADYAEAAAAQASABCQAAABACEgECCgAAAAMQAwELAAAAAxAEAQwAAAADEAUwjwAAAFIKAAAAEwgAAABQAQAAAEEwFgEAAFIKAAAAEwgAAABQAQAAAEEwAAAAAFIKAAAAEwgAAABQAQAAAEEQBkAQAANgAgAAABABMCEAAABSCwAAABQNAAAAA1Dr////hQ0AAABSBgAAAIxQAQAAAEEQAkAQAANgAwAAABABAQ4AAAADEAIwjwAAAFIKAAAAEwgAAABQAQAAAEEwFgEAAFIKAAAAEwgAAABQAQAAAEEwAAAAAFIKAAAAEwgAAABQAQAAAEEQA0AQAANgBAAAABABMMIAAABSCwAAABQPAAAAA1Dr////hQ8AAABSBgAAAIxQAQAAAEEQAkAQAANgBQAAABABMI8AAABSCgAAABMQAAAAUAEAAABBMBYBAABSCgAAABMQAAAAUAEAAABBMAAAAABSCgAAABMQAAAAUAEAAABBEAJAEAADYAYAAAAQATBJAQAAUgoAAAATEQAAAFABAAAAQRACQIUIAAAAcBIAAACJhQgAAABwEwAAAIYBAAAAiYAUAAAAhQoAAABwEgAAAIUIAAAAcBIAAACHAwAAABUAAAAKAAAACAAAAImFCgAAAHATAAAAgBYAAACFCAAAAHATAAAAhgMAAACJgBcAAACFDQAAAHASAAAAhwIAAAAVAAAADQAAAImFDQAAAHATAAAAhgEAAACJgBgAAACFCAAAAHASAAAAhwIAAAAVAAAACAAAAImADgAAAIUIAAAAcBMAAACGAgAAAImAGQAAAIUPAAAAcBIAAACHAgAAABUAAAAPAAAAiYUPAAAAcBMAAACGAQAAAImFEAAAAHASAAAAiYUQAAAAcBMAAACGAQAAAImFEQAAAHASAAAAiYURAAAAcBMAAACGAQAAAIlgAAAAAIwTCAAAAIGMhQgAAABwEwAAAIYBAAAAiWAAAAAAjJACAAAAAQAAABMAAAAaAAAAGgAAAAgAAAD/////AIyFCAAAAHATAAAAhgEAAACJYAEAAACMihUAAACLFAAAAIoKAAAAEwoAAACBjIoIAAAAcRsAAAASAAAAEwgAAACBjIyFCgAAAHATAAAAgBYAAACFCAAAAHATAAAAhgMAAACJYAEAAACMkAMAAAACAAAAEwAAABoAAAAWAAAAGgAAAAoAAAD/////AAgAAAAbAAAAAIyFCgAAAHATAAAAgBYAAACFCAAAAHATAAAAhgMAAACJYAIAAACMihUAAACLFwAAAIoNAAAAcRwAAAASAAAAEw0AAACBjIyFDQAAAHATAAAAhgEAAACJYAIAAACMkAIAAAABAAAAEwAAABoAAAAaAAAADQAAABwAAAAAjIUNAAAAcBMAAACGAQAAAIlgAwAAAIyKFQAAAIsYAAAAiggAAABxGwAAABIAAAATCAAAAIGMjIAOAAAAhQgAAABwEwAAAIYCAAAAiWADAAAAjJACAAAAAQAAABMAAAAOAAAAGgAAAAgAAAAbAAAAAIyADgAAAIUIAAAAcBMAAACGAgAAAIlgBAAAAIyKFQAAAIsZAAAAig8AAABxHQAAABIAAAATDwAAAIGMjIUPAAAAcBMAAACGAQAAAIlgBAAAAIyQAgAAAAEAAAATAAAAGgAAABoAAAAPAAAAHQAAAACMhQ8AAABwEwAAAIYBAAAAiWAFAAAAjHEbAAAAEgAAABMQAAAAgYyFEAAAAHATAAAAhgEAAACJYAUAAACMkAIAAAABAAAAEwAAABoAAAAaAAAAEAAAABsAAAAAjIUQAAAAcBMAAACGAQAAAIlgBgAAAIxxHgAAABIAAAATEQAAAIGMhREAAABwEwAAAIYBAAAAiWAGAAAAjJACAAAAAQAAABMAAAAaAAAAGgAAABEAAAAeAAAAAIyFEQAAAHATAAAAhgEAAACJ";
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
