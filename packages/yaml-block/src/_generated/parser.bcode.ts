// Auto-generated from packages/yaml-block/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"YamlScalar#0\",\"YamlMappingEntry#0\",\"YamlMapping#0\",\"YamlSequenceItem#0\",\"YamlSequence#0\",\"YamlNode#0\",\"YamlBlock#0\",\"\\n\",\"value\",\"css\",\"key\",\":\",\" \",\"entries\",\"- \",\"items\",\"node\",\"root\",\"ast\",\"source\",\"entry\",\"type\",\": \",\"mapping\",\"item\",\"sequence\",\"\",\"YamlMapping|YamlScalar|YamlSequence\",\"YamlMappingEntry\",\"YamlSequenceItem\",\"YamlNode\"],\"numberPool\":[],\"productionOffsets\":[[\"YamlScalar#0\",0],[\"YamlMappingEntry#0\",33],[\"YamlMapping#0\",143],[\"YamlSequenceItem#0\",208],[\"YamlSequence#0\",292],[\"YamlNode#0\",357],[\"YamlBlock#0\",433]],\"renderOffsets\":[[\"YamlScalar#0:ast\",467],[\"YamlScalar#0:source\",478],[\"YamlMappingEntry#0:ast\",494],[\"YamlMappingEntry#0:source\",537],[\"YamlMapping#0:ast\",568],[\"YamlMapping#0:source\",597],[\"YamlSequenceItem#0:ast\",613],[\"YamlSequenceItem#0:source\",642],[\"YamlSequence#0:ast\",663],[\"YamlSequence#0:source\",692],[\"YamlNode#0:ast\",708],[\"YamlNode#0:source\",719],[\"YamlBlock#0:ast\",735],[\"YamlBlock#0:source\",746]],\"stringifyOffsets\":[[\"YamlScalar#0:ast\",762],[\"YamlScalar#0:source\",791],[\"YamlMappingEntry#0:ast\",844],[\"YamlMappingEntry#0:source\",925],[\"YamlMapping#0:ast\",1006],[\"YamlMapping#0:source\",1060],[\"YamlSequenceItem#0:ast\",1113],[\"YamlSequenceItem#0:source\",1172],[\"YamlSequence#0:ast\",1230],[\"YamlSequence#0:source\",1284],[\"YamlNode#0:ast\",1337],[\"YamlNode#0:source\",1375],[\"YamlBlock#0:ast\",1428],[\"YamlBlock#0:source\",1466]],\"stringifyOffsetsByNodeType\":[[\"YamlScalar:ast\",[762]],[\"YamlScalar:source\",[791]],[\"YamlMappingEntry:ast\",[844]],[\"YamlMappingEntry:source\",[925]],[\"YamlMapping:ast\",[1006]],[\"YamlMapping:source\",[1060]],[\"YamlSequenceItem:ast\",[1113]],[\"YamlSequenceItem:source\",[1172]],[\"YamlSequence:ast\",[1230]],[\"YamlSequence:source\",[1284]],[\"YamlNode:ast\",[1337]],[\"YamlNode:source\",[1375]],[\"YamlBlock:ast\",[1428]],[\"YamlBlock:source\",[1466]],[\"YamlMapping|YamlScalar|YamlSequence:ast\",[1006,762,1230]],[\"YamlMapping|YamlScalar|YamlSequence:source\",[1060,791,1284]]],\"stringifyDispatcherOffsets\":[[\"YamlScalar:ast\",762],[\"YamlScalar:source\",791],[\"YamlMappingEntry:ast\",844],[\"YamlMappingEntry:source\",925],[\"YamlMapping:ast\",1006],[\"YamlMapping:source\",1060],[\"YamlSequenceItem:ast\",1113],[\"YamlSequenceItem:source\",1172],[\"YamlSequence:ast\",1230],[\"YamlSequence:source\",1284],[\"YamlNode:ast\",1337],[\"YamlNode:source\",1375],[\"YamlBlock:ast\",1428],[\"YamlBlock:source\",1466]],\"rootProductionKey\":\"YamlBlock#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
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
