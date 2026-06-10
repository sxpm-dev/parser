// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"Comment#0\",\"Declaration#0\",\"Declaration#1\",\"Declaration#dispatch\",\"Rule#0\",\"AtRule#0\",\"AtRule#1\",\"AtRule#dispatch\",\"Stylesheet#0\",\"\",\"text\",\":\",\";\",\"}\",\"prop\",\"!\",\"value\",\"css\",\"important\",\"{\",\"selector\",\"nodes\",\"@\",\"name\",\"params\",\"comment\",\"ast\",\"type\",\"/* \",\"source\",\" */\",\"decl\",\"_important\",\": \",\" !\",\"json\",\"__dynKey\",\"key\",\"rule\",\"__merge\",\"array\",\" {\",\"atrule\",\" \",\"root\",\"AtRule|Comment|Declaration|Rule\"],\"numberPool\":[],\"productionOffsets\":[[\"Comment#0\",0],[\"Declaration#0\",26],[\"Declaration#1\",142],[\"Declaration#dispatch\",228],[\"Rule#0\",255],[\"AtRule#0\",397],[\"AtRule#1\",565],[\"AtRule#dispatch\",640],[\"Stylesheet#0\",667]],\"renderOffsets\":[[\"Comment#0:ast\",764],[\"Comment#0:json\",793],[\"Comment#0:source\",795],[\"Declaration#0:ast\",821],[\"Declaration#0:json\",883],[\"Declaration#0:source\",885],[\"Declaration#1:ast\",936],[\"Declaration#1:json\",979],[\"Declaration#1:source\",1018],[\"Rule#0:ast\",1054],[\"Rule#0:json\",1097],[\"Rule#0:source\",1150],[\"AtRule#0:ast\",1186],[\"AtRule#0:json\",1243],[\"AtRule#0:source\",1245],[\"AtRule#1:ast\",1301],[\"AtRule#1:json\",1344],[\"AtRule#1:source\",1346],[\"Stylesheet#0:ast\",1387],[\"Stylesheet#0:json\",1416],[\"Stylesheet#0:source\",1441]],\"stringifyOffsets\":[[\"Comment#0:ast\",1457],[\"Comment#0:source\",1512],[\"Declaration#0:source\",1575],[\"Declaration#1:ast\",1689],[\"Declaration#1:source\",1766],[\"Rule#0:ast\",1852],[\"Rule#0:source\",1938],[\"AtRule#0:ast\",2024],[\"AtRule#0:source\",2142],[\"AtRule#1:ast\",2261],[\"AtRule#1:source\",2343],[\"Stylesheet#0:ast\",2434],[\"Stylesheet#0:source\",2488]],\"stringifyOffsetsByNodeType\":[[\"Comment:ast\",[1457]],[\"Comment:source\",[1512]],[\"Declaration:source\",[1575,1766]],[\"Declaration:ast\",[1689]],[\"Rule:ast\",[1852]],[\"Rule:source\",[1938]],[\"AtRule:ast\",[2024,2261]],[\"AtRule:source\",[2142,2343]],[\"Stylesheet:ast\",[2434]],[\"Stylesheet:source\",[2488]],[\"AtRule|Comment|Declaration|Rule:ast\",[2024,2261,1457,1689,1852]],[\"AtRule|Comment|Declaration|Rule:source\",[2142,2343,1512,1575,1766,1938]]],\"stringifyDispatcherOffsets\":[[\"Comment:ast\",1457],[\"Comment:source\",1512],[\"Declaration:ast\",1689],[\"Declaration:source\",1575],[\"Rule:ast\",1852],[\"Rule:source\",1938],[\"AtRule:ast\",2024],[\"AtRule:source\",2142],[\"Stylesheet:ast\",2434],[\"Stylesheet:source\",2488]],\"rootProductionKey\":\"Stylesheet#0\",\"targets\":[\"ast\",\"json\",\"source\"],\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASAFCQAAABACFQECCgAAAEAQAANgAQAAABABIQMAAAAHAAAACwAAAAwAAAANAAAAEAIWAQIOAAAAAxADAQsAAAADEAQhAwAAAAcAAAAMAAAADQAAAA8AAAAQBRYEBRAAAAADEAYBDwAAAAMQByABEQAAABAIEgcIEgAAAAMQCQEMAAAAQBAAA2ACAAAAEAEhAwAAAAcAAAALAAAADAAAAA0AAAAQAhYBAg4AAAADEAMBCwAAAAMQBCECAAAABwAAAAwAAAANAAAAEAUWBAUQAAAAAxAGAQwAAABAEAAwGgAAAFIBAAAAQBAAMI4AAABSAQAAAEBBEAADYAQAAAAQASECAAAABwAAABMAAAAMAAAAEAIWAQIUAAAAAxADARMAAAADEAQwAAAAAFILAAAAFBUAAAADUOv///8wgAIAAFILAAAAFBUAAAADUOv///8w/wAAAFILAAAAFBUAAAADUOv///8w5AAAAFILAAAAFBUAAAADUOv///8QBQMQBgENAAAAQBAAA2AFAAAAEAEBFgAAAAMQAiABEQAAABADEgIDFwAAAAMQBCECAAAABwAAAAwAAAATAAAAEAUWBAUYAAAAAxAGARMAAAADEAcwAAAAAFILAAAAFBUAAAADUOv///8wgAIAAFILAAAAFBUAAAADUOv///8w/wAAAFILAAAAFBUAAAADUOv///8w5AAAAFILAAAAFBUAAAADUOv///8QCAMQCQENAAAAQBAAA2AGAAAAEAEBFgAAAAMQAiABEQAAABADEgIDFwAAAAMQBCEDAAAABwAAAAwAAAATAAAADQAAABAFFgQFGAAAAAMQBgEMAAAAQBAAMI0BAABSAQAAAEAQADA1AgAAUgEAAABAQRAAA2AIAAAAEAEwAAAAAFILAAAAFBUAAAADUOv///8wgAIAAFILAAAAFBUAAAADUOv///8w/wAAAFILAAAAFBUAAAADUOv///8w5AAAAFILAAAAFBUAAAADUOv///8QAkCAGQAAAIUKAAAAcBoAAACHAgAAABsAAAAKAAAAiYGJgBwAAACFCgAAAHAdAAAAgB4AAACGAwAAAImAHwAAAIUOAAAAcBoAAACFEAAAAHAaAAAAgoUSAAAAcBoAAACHBQAAABsAAAAOAAAAEAAAABIAAAAgAAAAiYGJhQ4AAABwHQAAAIAhAAAA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";
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
