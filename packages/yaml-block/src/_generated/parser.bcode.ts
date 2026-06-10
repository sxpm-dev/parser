// Auto-generated from packages/yaml-block/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"YamlScalar#0\",\"YamlMappingEntry#0\",\"YamlMapping#0\",\"YamlSequenceItem#0\",\"YamlSequence#0\",\"YamlNode#0\",\"YamlBlock#0\",\"\\n\",\"value\",\"css\",\"key\",\":\",\" \",\"entries\",\"- \",\"items\",\"node\",\"root\",\"ast\",\"source\",\"entry\",\"type\",\": \",\"mapping\",\"item\",\"sequence\",\"\",\"YamlMapping|YamlScalar|YamlSequence\",\"YamlMappingEntry\",\"YamlSequenceItem\",\"YamlNode\"],\"numberPool\":[],\"productionOffsets\":[[\"YamlScalar#0\",0],[\"YamlMappingEntry#0\",33],[\"YamlMapping#0\",143],[\"YamlSequenceItem#0\",202],[\"YamlSequence#0\",286],[\"YamlNode#0\",345],[\"YamlBlock#0\",421]],\"renderOffsets\":[[\"YamlScalar#0:ast\",455],[\"YamlScalar#0:source\",466],[\"YamlMappingEntry#0:ast\",482],[\"YamlMappingEntry#0:source\",525],[\"YamlMapping#0:ast\",556],[\"YamlMapping#0:source\",585],[\"YamlSequenceItem#0:ast\",601],[\"YamlSequenceItem#0:source\",630],[\"YamlSequence#0:ast\",651],[\"YamlSequence#0:source\",680],[\"YamlNode#0:ast\",696],[\"YamlNode#0:source\",707],[\"YamlBlock#0:ast\",723],[\"YamlBlock#0:source\",734]],\"stringifyOffsets\":[[\"YamlScalar#0:ast\",750],[\"YamlScalar#0:source\",779],[\"YamlMappingEntry#0:ast\",832],[\"YamlMappingEntry#0:source\",913],[\"YamlMapping#0:ast\",994],[\"YamlMapping#0:source\",1048],[\"YamlSequenceItem#0:ast\",1101],[\"YamlSequenceItem#0:source\",1160],[\"YamlSequence#0:ast\",1218],[\"YamlSequence#0:source\",1272],[\"YamlNode#0:ast\",1325],[\"YamlNode#0:source\",1363],[\"YamlBlock#0:ast\",1416],[\"YamlBlock#0:source\",1454]],\"stringifyOffsetsByNodeType\":[[\"YamlScalar:ast\",[750]],[\"YamlScalar:source\",[779]],[\"YamlMappingEntry:ast\",[832]],[\"YamlMappingEntry:source\",[913]],[\"YamlMapping:ast\",[994]],[\"YamlMapping:source\",[1048]],[\"YamlSequenceItem:ast\",[1101]],[\"YamlSequenceItem:source\",[1160]],[\"YamlSequence:ast\",[1218]],[\"YamlSequence:source\",[1272]],[\"YamlNode:ast\",[1325]],[\"YamlNode:source\",[1363]],[\"YamlBlock:ast\",[1416]],[\"YamlBlock:source\",[1454]],[\"YamlMapping|YamlScalar|YamlSequence:ast\",[994,750,1218]],[\"YamlMapping|YamlScalar|YamlSequence:source\",[1048,779,1272]]],\"stringifyDispatcherOffsets\":[[\"YamlScalar:ast\",750],[\"YamlScalar:source\",779],[\"YamlMappingEntry:ast\",832],[\"YamlMappingEntry:source\",913],[\"YamlMapping:ast\",994],[\"YamlMapping:source\",1048],[\"YamlSequenceItem:ast\",1101],[\"YamlSequenceItem:source\",1160],[\"YamlSequence:ast\",1218],[\"YamlSequence:source\",1272],[\"YamlNode:ast\",1325],[\"YamlNode:source\",1363],[\"YamlBlock:ast\",1416],[\"YamlBlock:source\",1454]],\"rootProductionKey\":\"YamlBlock#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
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
