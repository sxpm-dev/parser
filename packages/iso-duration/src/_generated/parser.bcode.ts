// Auto-generated from packages/iso-duration/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"DateUnit#0\",\"DateUnit#1\",\"DateUnit#2\",\"DateUnit#3\",\"DateUnit#dispatch\",\"TimeUnit#0\",\"TimeUnit#1\",\"TimeUnit#2\",\"TimeUnit#dispatch\",\"Duration#0\",\"Duration#1\",\"Duration#dispatch\",\"int\",\"value\",\"Y\",\"M\",\"W\",\"D\",\"H\",\"S\",\"P\",\"date\",\"T\",\"time\",\"years\",\"ast\",\"type\",\"source\",\"months\",\"weeks\",\"days\",\"hours\",\"minutes\",\"seconds\",\"duration\",\"\",\"DateUnit\",\"TimeUnit\"],\"numberPool\":[],\"productionOffsets\":[[\"DateUnit#0\",0],[\"DateUnit#1\",34],[\"DateUnit#2\",68],[\"DateUnit#3\",102],[\"DateUnit#dispatch\",136],[\"TimeUnit#0\",189],[\"TimeUnit#1\",223],[\"TimeUnit#2\",257],[\"TimeUnit#dispatch\",291],[\"Duration#0\",331],[\"Duration#1\",398],[\"Duration#dispatch\",507]],\"renderOffsets\":[[\"DateUnit#0:ast\",534],[\"DateUnit#0:source\",563],[\"DateUnit#1:ast\",584],[\"DateUnit#1:source\",613],[\"DateUnit#2:ast\",634],[\"DateUnit#2:source\",663],[\"DateUnit#3:ast\",684],[\"DateUnit#3:source\",713],[\"TimeUnit#0:ast\",734],[\"TimeUnit#0:source\",763],[\"TimeUnit#1:ast\",784],[\"TimeUnit#1:source\",813],[\"TimeUnit#2:ast\",834],[\"TimeUnit#2:source\",863],[\"Duration#0:ast\",884],[\"Duration#0:source\",913],[\"Duration#1:ast\",934],[\"Duration#1:source\",977]],\"stringifyOffsets\":[[\"DateUnit#0:ast\",1013],[\"DateUnit#0:source\",1063],[\"DateUnit#1:ast\",1121],[\"DateUnit#1:source\",1171],[\"DateUnit#2:ast\",1229],[\"DateUnit#2:source\",1279],[\"DateUnit#3:ast\",1337],[\"DateUnit#3:source\",1387],[\"TimeUnit#0:ast\",1445],[\"TimeUnit#0:source\",1495],[\"TimeUnit#1:ast\",1553],[\"TimeUnit#1:source\",1603],[\"TimeUnit#2:ast\",1661],[\"TimeUnit#2:source\",1711],[\"Duration#0:ast\",1769],[\"Duration#0:source\",1834],[\"Duration#1:ast\",1892],[\"Duration#1:source\",1993]],\"stringifyOffsetsByNodeType\":[[\"DateUnit:ast\",[1013,1121,1229,1337]],[\"DateUnit:source\",[1063,1171,1279,1387]],[\"TimeUnit:ast\",[1445,1553,1661]],[\"TimeUnit:source\",[1495,1603,1711]],[\"Duration:ast\",[1769,1892]],[\"Duration:source\",[1834,1993]]],\"stringifyDispatcherOffsets\":[[\"DateUnit:ast\",1013],[\"DateUnit:source\",1063],[\"TimeUnit:ast\",1445],[\"TimeUnit:source\",1495],[\"Duration:ast\",1769],[\"Duration:source\",1834]],\"rootProductionKey\":\"Duration#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "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";
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
