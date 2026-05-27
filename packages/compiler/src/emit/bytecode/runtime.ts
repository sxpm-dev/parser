// Bytecode runtime — Task 6.3 fills this in. Type-only skeleton for now so
// the bytecode backend (Task 6.5) can reference RuntimeState / runParse at
// type-check time without pulling in a half-baked interpreter. Calling
// runParse at runtime intentionally throws — Task 6.2's encoder produces
// a structurally valid opcode stream but the interpreter that executes it
// doesn't exist yet.

export type RuntimeState = {
  readonly input: string;
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  off: number;
  pc: number;
  maxOff: number;
  valueStack: unknown[];
};

export function runParse(_state: RuntimeState, _startOffset: number): unknown {
  throw new Error('bytecode runtime: not yet implemented (Task 6.3)');
}
