// Auto-generated from packages/yaml-block/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"YamlScalar#0\",\"YamlMappingEntry#0\",\"YamlMapping#0\",\"YamlSequenceItem#0\",\"YamlSequence#0\",\"YamlNode#0\",\"YamlBlock#0\",\"\\n\",\"value\",\"css\",\"key\",\":\",\" \",\"entries\",\"- \",\"items\",\"node\",\"root\",\"ast\",\"source\",\"entry\",\"type\",\": \",\"mapping\",\"item\",\"sequence\",\"\",\"YamlMapping|YamlScalar|YamlSequence\",\"YamlMappingEntry\",\"YamlSequenceItem\",\"YamlNode\"],\"numberPool\":[],\"productionOffsets\":[[\"YamlScalar#0\",0],[\"YamlMappingEntry#0\",33],[\"YamlMapping#0\",143],[\"YamlSequenceItem#0\",203],[\"YamlSequence#0\",287],[\"YamlNode#0\",347],[\"YamlBlock#0\",423]],\"renderOffsets\":[[\"YamlScalar#0:ast\",457],[\"YamlScalar#0:source\",468],[\"YamlMappingEntry#0:ast\",484],[\"YamlMappingEntry#0:source\",527],[\"YamlMapping#0:ast\",558],[\"YamlMapping#0:source\",587],[\"YamlSequenceItem#0:ast\",603],[\"YamlSequenceItem#0:source\",632],[\"YamlSequence#0:ast\",653],[\"YamlSequence#0:source\",682],[\"YamlNode#0:ast\",698],[\"YamlNode#0:source\",709],[\"YamlBlock#0:ast\",725],[\"YamlBlock#0:source\",736]],\"stringifyOffsets\":[[\"YamlScalar#0:ast\",752],[\"YamlScalar#0:source\",781],[\"YamlMappingEntry#0:ast\",834],[\"YamlMappingEntry#0:source\",915],[\"YamlMapping#0:ast\",996],[\"YamlMapping#0:source\",1050],[\"YamlSequenceItem#0:ast\",1103],[\"YamlSequenceItem#0:source\",1162],[\"YamlSequence#0:ast\",1220],[\"YamlSequence#0:source\",1274],[\"YamlNode#0:ast\",1327],[\"YamlNode#0:source\",1365],[\"YamlBlock#0:ast\",1418],[\"YamlBlock#0:source\",1456]],\"stringifyOffsetsByNodeType\":[[\"YamlScalar:ast\",[752]],[\"YamlScalar:source\",[781]],[\"YamlMappingEntry:ast\",[834]],[\"YamlMappingEntry:source\",[915]],[\"YamlMapping:ast\",[996]],[\"YamlMapping:source\",[1050]],[\"YamlSequenceItem:ast\",[1103]],[\"YamlSequenceItem:source\",[1162]],[\"YamlSequence:ast\",[1220]],[\"YamlSequence:source\",[1274]],[\"YamlNode:ast\",[1327]],[\"YamlNode:source\",[1365]],[\"YamlBlock:ast\",[1418]],[\"YamlBlock:source\",[1456]],[\"YamlMapping|YamlScalar|YamlSequence:ast\",[996,752,1220]],[\"YamlMapping|YamlScalar|YamlSequence:source\",[1050,781,1274]]],\"stringifyDispatcherOffsets\":[[\"YamlScalar:ast\",752],[\"YamlScalar:source\",781],[\"YamlMappingEntry:ast\",834],[\"YamlMappingEntry:source\",915],[\"YamlMapping:ast\",996],[\"YamlMapping:source\",1050],[\"YamlSequenceItem:ast\",1103],[\"YamlSequenceItem:source\",1162],[\"YamlSequence:ast\",1220],[\"YamlSequence:source\",1274],[\"YamlNode:ast\",1327],[\"YamlNode:source\",1365],[\"YamlBlock:ast\",1418],[\"YamlBlock:source\",1456]],\"rootProductionKey\":\"YamlBlock#0\",\"targets\":[\"ast\",\"source\"],\"operatorLiterals\":[]}";
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
