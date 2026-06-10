// Auto-generated from packages/iso-duration/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = "{\"stringPool\":[\"DateUnit#0\",\"DateUnit#1\",\"DateUnit#2\",\"DateUnit#3\",\"DateUnit#dispatch\",\"TimeUnit#0\",\"TimeUnit#1\",\"TimeUnit#2\",\"TimeUnit#dispatch\",\"Duration#0\",\"Duration#1\",\"Duration#dispatch\",\"int\",\"value\",\"Y\",\"M\",\"W\",\"D\",\"H\",\"S\",\"P\",\"date\",\"T\",\"time\",\"years\",\"ast\",\"type\",\"source\",\"months\",\"weeks\",\"days\",\"hours\",\"minutes\",\"seconds\",\"duration\",\"\",\"DateUnit\",\"TimeUnit\"],\"numberPool\":[],\"productionOffsets\":[[\"DateUnit#0\",0],[\"DateUnit#1\",34],[\"DateUnit#2\",68],[\"DateUnit#3\",102],[\"DateUnit#dispatch\",136],[\"TimeUnit#0\",189],[\"TimeUnit#1\",223],[\"TimeUnit#2\",257],[\"TimeUnit#dispatch\",291],[\"Duration#0\",331],[\"Duration#1\",390],[\"Duration#dispatch\",483]],\"renderOffsets\":[[\"DateUnit#0:ast\",510],[\"DateUnit#0:source\",539],[\"DateUnit#1:ast\",560],[\"DateUnit#1:source\",589],[\"DateUnit#2:ast\",610],[\"DateUnit#2:source\",639],[\"DateUnit#3:ast\",660],[\"DateUnit#3:source\",689],[\"TimeUnit#0:ast\",710],[\"TimeUnit#0:source\",739],[\"TimeUnit#1:ast\",760],[\"TimeUnit#1:source\",789],[\"TimeUnit#2:ast\",810],[\"TimeUnit#2:source\",839],[\"Duration#0:ast\",860],[\"Duration#0:source\",889],[\"Duration#1:ast\",910],[\"Duration#1:source\",953]],\"stringifyOffsets\":[[\"DateUnit#0:ast\",989],[\"DateUnit#0:source\",1039],[\"DateUnit#1:ast\",1097],[\"DateUnit#1:source\",1147],[\"DateUnit#2:ast\",1205],[\"DateUnit#2:source\",1255],[\"DateUnit#3:ast\",1313],[\"DateUnit#3:source\",1363],[\"TimeUnit#0:ast\",1421],[\"TimeUnit#0:source\",1471],[\"TimeUnit#1:ast\",1529],[\"TimeUnit#1:source\",1579],[\"TimeUnit#2:ast\",1637],[\"TimeUnit#2:source\",1687],[\"Duration#0:ast\",1745],[\"Duration#0:source\",1804],[\"Duration#1:ast\",1862],[\"Duration#1:source\",1957]],\"stringifyOffsetsByNodeType\":[[\"DateUnit:ast\",[989,1097,1205,1313]],[\"DateUnit:source\",[1039,1147,1255,1363]],[\"TimeUnit:ast\",[1421,1529,1637]],[\"TimeUnit:source\",[1471,1579,1687]],[\"Duration:ast\",[1745,1862]],[\"Duration:source\",[1804,1957]]],\"stringifyDispatcherOffsets\":[[\"DateUnit:ast\",989],[\"DateUnit:source\",1039],[\"TimeUnit:ast\",1421],[\"TimeUnit:source\",1471],[\"Duration:ast\",1745],[\"Duration:source\",1804]],\"rootProductionKey\":\"Duration#dispatch\",\"targets\":[\"ast\",\"source\"],\"defaultTarget\":\"ast\",\"operatorLiterals\":[]}";
const __OPS_B64: string = "EAADYAAAAAAQASACDAAAABACEgECDQAAAAMQAwEOAAAAQBAAA2ABAAAAEAEgAgwAAAAQAhIBAg0AAAADEAMBDwAAAEAQAANgAgAAABABIAIMAAAAEAISAQINAAAAAxADARAAAABAEAADYAMAAAAQASACDAAAABACEgECDQAAAAMQAwERAAAAQBAAMAAAAABSAQAAAEAQADAiAAAAUgEAAABAEAAwRAAAAFIBAAAAQBAAMGYAAABSAQAAAEBBEAADYAUAAAAQASACDAAAABACEgECDQAAAAMQAwESAAAAQBAAA2AGAAAAEAEgAgwAAAAQAhIBAg0AAAADEAMBDwAAAEAQAANgBwAAABABIAIMAAAAEAISAQINAAAAAxADARMAAABAEAAwvQAAAFIBAAAAQBAAMN8AAABSAQAAAEAQADABAQAAUgEAAABAQRAAA2AJAAAAEAEBFAAAAAMQAjCIAAAAUgsAAAAUFQAAAANQ6////4UVAAAAUgYAAACMUAEAAABBEANAEAADYAoAAAAQAQEUAAAAAxACMIgAAABSCwAAABQVAAAAA1Dr////EAMDEAQBFgAAAAMQBTAjAQAAUgsAAAAUFwAAAANQ6////4UXAAAAUgYAAACMUAEAAABBEAZAEAAwhgEAAFIBAAAAQBAAMEsBAABSAQAAAEBBgBgAAACFDQAAAHAZAAAAhwIAAAAaAAAADQAAAImFDQAAAHAbAAAAgA4AAACGAgAAAImAHAAAAIUNAAAAcBkAAACHAgAAABoAAAANAAAAiYUNAAAAcBsAAACADwAAAIYCAAAAiYAdAAAAhQ0AAABwGQAAAIcCAAAAGgAAAA0AAACJhQ0AAABwGwAAAIAQAAAAhgIAAACJgB4AAACFDQAAAHAZAAAAhwIAAAAaAAAADQAAAImFDQAAAHAbAAAAgBEAAACGAgAAAImAHwAAAIUNAAAAcBkAAACHAgAAABoAAAANAAAAiYUNAAAAcBsAAACAEgAAAIYCAAAAiYAgAAAAhQ0AAABwGQAAAIcCAAAAGgAAAA0AAACJhQ0AAABwGwAAAIAPAAAAhgIAAACJgCEAAACFDQAAAHAZAAAAhwIAAAAaAAAADQAAAImFDQAAAHAbAAAAgBMAAACGAgAAAImAIgAAAIUVAAAAcBkAAACHAgAAABoAAAAVAAAAiYAUAAAAhRUAAABwGwAAAIYCAAAAiYAiAAAAhRUAAABwGQAAAIUXAAAAcBkAAACHAwAAABoAAAAVAAAAFwAAAImAFAAAAIUVAAAAcBsAAACAFgAAAIUXAAAAcBsAAACGBAAAAIlgAAAAAIyKGgAAAIsYAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACADgAAAIYCAAAAiWAAAAAAjJACAAAAAQAAABsAAAAjAAAADgAAAA0AAAD/////AIyFDQAAAHAbAAAAgA4AAACGAgAAAIlgAQAAAIyKGgAAAIscAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACADwAAAIYCAAAAiWABAAAAjJACAAAAAQAAABsAAAAjAAAADwAAAA0AAAD/////AIyFDQAAAHAbAAAAgA8AAACGAgAAAIlgAgAAAIyKGgAAAIsdAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACAEAAAAIYCAAAAiWACAAAAjJACAAAAAQAAABsAAAAjAAAAEAAAAA0AAAD/////AIyFDQAAAHAbAAAAgBAAAACGAgAAAIlgAwAAAIyKGgAAAIseAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACAEQAAAIYCAAAAiWADAAAAjJACAAAAAQAAABsAAAAjAAAAEQAAAA0AAAD/////AIyFDQAAAHAbAAAAgBEAAACGAgAAAIlgBQAAAIyKGgAAAIsfAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACAEgAAAIYCAAAAiWAFAAAAjJACAAAAAQAAABsAAAAjAAAAEgAAAA0AAAD/////AIyFDQAAAHAbAAAAgBIAAACGAgAAAIlgBgAAAIyKGgAAAIsgAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACADwAAAIYCAAAAiWAGAAAAjJACAAAAAQAAABsAAAAjAAAADwAAAA0AAAD/////AIyFDQAAAHAbAAAAgA8AAACGAgAAAIlgBwAAAIyKGgAAAIshAAAAig0AAAATDQAAAIGMjIUNAAAAcBsAAACAEwAAAIYCAAAAiWAHAAAAjJACAAAAAQAAABsAAAAjAAAAEwAAAA0AAAD/////AIyFDQAAAHAbAAAAgBMAAACGAgAAAIlgCQAAAIyKGgAAAIsiAAAAihUAAABxJAAAABkAAAATFQAAAIGMjIAUAAAAhRUAAABwGwAAAIYCAAAAiWAJAAAAjJACAAAAAQAAABsAAAAUAAAAIwAAABUAAAAkAAAAAIyAFAAAAIUVAAAAcBsAAACGAgAAAIlgCgAAAIyKGgAAAIsiAAAAihUAAABxJAAAABkAAAATFQAAAIGMihcAAABxJQAAABkAAAATFwAAAIGMjIAUAAAAhRUAAABwGwAAAIAWAAAAhRcAAABwGwAAAIYEAAAAiWAKAAAAjJADAAAAAgAAABsAAAAUAAAAFgAAACMAAAAVAAAAJAAAAAEXAAAAJQAAAACMgBQAAACFFQAAAHAbAAAAgBYAAACFFwAAAHAbAAAAhgQAAACJ";
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
