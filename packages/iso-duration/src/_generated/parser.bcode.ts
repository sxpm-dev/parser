// Auto-generated from packages/iso-duration/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"DateUnit#0\",\"DateUnit#1\",\"DateUnit#2\",\"DateUnit#3\",\"DateUnit#dispatch\",\"TimeUnit#0\",\"TimeUnit#1\",\"TimeUnit#2\",\"TimeUnit#dispatch\",\"Duration#0\",\"Duration#1\",\"Duration#dispatch\",\"int\",\"value\",\"Y\",\"M\",\"W\",\"D\",\"H\",\"S\",\"P\",\"date\",\"T\",\"time\",\"years\",\"ast\",\"type\",\"source\",\"months\",\"weeks\",\"days\",\"hours\",\"minutes\",\"seconds\",\"duration\",\"\",\"DateUnit\",\"TimeUnit\"],\"numberPool\":[],\"productionOffsets\":[[\"DateUnit#0\",0],[\"DateUnit#1\",34],[\"DateUnit#2\",68],[\"DateUnit#3\",102],[\"DateUnit#dispatch\",136],[\"TimeUnit#0\",189],[\"TimeUnit#1\",223],[\"TimeUnit#2\",257],[\"TimeUnit#dispatch\",291],[\"Duration#0\",331],[\"Duration#1\",399],[\"Duration#dispatch\",515]],\"renderOffsets\":[[\"DateUnit#0:ast\",542],[\"DateUnit#0:source\",571],[\"DateUnit#1:ast\",592],[\"DateUnit#1:source\",621],[\"DateUnit#2:ast\",642],[\"DateUnit#2:source\",671],[\"DateUnit#3:ast\",692],[\"DateUnit#3:source\",721],[\"TimeUnit#0:ast\",742],[\"TimeUnit#0:source\",771],[\"TimeUnit#1:ast\",792],[\"TimeUnit#1:source\",821],[\"TimeUnit#2:ast\",842],[\"TimeUnit#2:source\",871],[\"Duration#0:ast\",892],[\"Duration#0:source\",921],[\"Duration#1:ast\",942],[\"Duration#1:source\",985]],\"stringifyOffsets\":[[\"DateUnit#0:ast\",1021],[\"DateUnit#0:source\",1071],[\"DateUnit#1:ast\",1129],[\"DateUnit#1:source\",1179],[\"DateUnit#2:ast\",1237],[\"DateUnit#2:source\",1287],[\"DateUnit#3:ast\",1345],[\"DateUnit#3:source\",1395],[\"TimeUnit#0:ast\",1453],[\"TimeUnit#0:source\",1503],[\"TimeUnit#1:ast\",1561],[\"TimeUnit#1:source\",1611],[\"TimeUnit#2:ast\",1669],[\"TimeUnit#2:source\",1719],[\"Duration#0:ast\",1777],[\"Duration#0:source\",1842],[\"Duration#1:ast\",1900],[\"Duration#1:source\",2001]],\"stringifyOffsetsByNodeType\":[[\"DateUnit:ast\",[1021,1129,1237,1345]],[\"DateUnit:source\",[1071,1179,1287,1395]],[\"TimeUnit:ast\",[1453,1561,1669]],[\"TimeUnit:source\",[1503,1611,1719]],[\"Duration:ast\",[1777,1900]],[\"Duration:source\",[1842,2001]]],\"stringifyDispatcherOffsets\":[[\"DateUnit:ast\",1021],[\"DateUnit:source\",1071],[\"TimeUnit:ast\",1453],[\"TimeUnit:source\",1503],[\"Duration:ast\",1777],[\"Duration:source\",1842]],\"rootProductionKey\":\"Duration#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
