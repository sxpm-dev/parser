// Auto-generated from packages/iso-duration/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"DateUnit#0\",\"DateUnit#1\",\"DateUnit#2\",\"DateUnit#3\",\"DateUnit#dispatch\",\"TimeUnit#0\",\"TimeUnit#1\",\"TimeUnit#2\",\"TimeUnit#dispatch\",\"Duration#0\",\"Duration#1\",\"Duration#dispatch\",\"int\",\"value\",\"Y\",\"M\",\"W\",\"D\",\"H\",\"S\",\"P\",\"date\",\"T\",\"time\",\"years\",\"ast\",\"type\",\"source\",\"months\",\"weeks\",\"days\",\"hours\",\"minutes\",\"seconds\",\"duration\",\"\",\"DateUnit\",\"TimeUnit\"],\"numberPool\":[],\"productionOffsets\":[[\"DateUnit#0\",0],[\"DateUnit#1\",34],[\"DateUnit#2\",68],[\"DateUnit#3\",102],[\"DateUnit#dispatch\",136],[\"TimeUnit#0\",189],[\"TimeUnit#1\",223],[\"TimeUnit#2\",257],[\"TimeUnit#dispatch\",291],[\"Duration#0\",331],[\"Duration#1\",398],[\"Duration#dispatch\",512]],\"renderOffsets\":[[\"DateUnit#0:ast\",539],[\"DateUnit#0:source\",568],[\"DateUnit#1:ast\",589],[\"DateUnit#1:source\",618],[\"DateUnit#2:ast\",639],[\"DateUnit#2:source\",668],[\"DateUnit#3:ast\",689],[\"DateUnit#3:source\",718],[\"TimeUnit#0:ast\",739],[\"TimeUnit#0:source\",768],[\"TimeUnit#1:ast\",789],[\"TimeUnit#1:source\",818],[\"TimeUnit#2:ast\",839],[\"TimeUnit#2:source\",868],[\"Duration#0:ast\",889],[\"Duration#0:source\",918],[\"Duration#1:ast\",939],[\"Duration#1:source\",982]],\"stringifyOffsets\":[[\"DateUnit#0:ast\",1018],[\"DateUnit#0:source\",1068],[\"DateUnit#1:ast\",1126],[\"DateUnit#1:source\",1176],[\"DateUnit#2:ast\",1234],[\"DateUnit#2:source\",1284],[\"DateUnit#3:ast\",1342],[\"DateUnit#3:source\",1392],[\"TimeUnit#0:ast\",1450],[\"TimeUnit#0:source\",1500],[\"TimeUnit#1:ast\",1558],[\"TimeUnit#1:source\",1608],[\"TimeUnit#2:ast\",1666],[\"TimeUnit#2:source\",1716],[\"Duration#0:ast\",1774],[\"Duration#0:source\",1839],[\"Duration#1:ast\",1897],[\"Duration#1:source\",1998]],\"stringifyOffsetsByNodeType\":[[\"DateUnit:ast\",[1018,1126,1234,1342]],[\"DateUnit:source\",[1068,1176,1284,1392]],[\"TimeUnit:ast\",[1450,1558,1666]],[\"TimeUnit:source\",[1500,1608,1716]],[\"Duration:ast\",[1774,1897]],[\"Duration:source\",[1839,1998]]],\"stringifyDispatcherOffsets\":[[\"DateUnit:ast\",1018],[\"DateUnit:source\",1068],[\"TimeUnit:ast\",1450],[\"TimeUnit:source\",1500],[\"Duration:ast\",1774],[\"Duration:source\",1839]],\"rootProductionKey\":\"Duration#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
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
