// Bytecode opcode set for the Phase 6 bytecode backend.
//
// Single-byte opcodes; operands follow inline. Variable-length operands use
// fixed-width encoding for now (32-bit pool indices, 8-bit slot numbers).
// A future tightening pass (Task 6.7) may swap pool indices for ULEB128 if
// the budget is tight.
//
// Execution model (interpreted by Task 6.3's runtime):
//   The interpreter operates on a RuntimeState containing the input string,
//   a byte cursor `off`, a program counter `pc`, and a value stack. Each
//   opcode either advances `off`, pushes a value onto the stack, branches
//   `pc`, or returns from the current production frame. RETURN_OK pops the
//   top captures payload and returns it; RETURN_NULL restores the entry
//   offset and returns null.
//
// Task 6.2 only emits a structurally correct stream. Some opcodes below are
// defined for completeness (so the encoder vocabulary matches the runtime
// it will eventually drive) but are not yet emitted because cron's
// primitives don't require them. They are explicitly tagged in comments.
export enum Op {
  // --- Position primitives -------------------------------------------------
  // operand: stringPool index (u32) → require input.startsWith(s) at off;
  // advance off+=s.length; on miss: fail.
  CONSUME_LITERAL = 0x01,
  // operand: 256-bit bitset (32 bytes inline) → require input[off] in set;
  // advance off. Reserved for Task 6.3; encoder currently doesn't emit this.
  CONSUME_BYTE_IN_SET = 0x02,
  // No operands — skip 0x20 / 0x09 / 0x0a / 0x0d.
  SKIP_WS = 0x03,

  // --- Capture primitives --------------------------------------------------
  // operand: u8 slot → save current off into local slot.
  SAVE_OFF = 0x10,
  // operand: u8 slot → restore off from local slot (used on failure paths).
  RESTORE_OFF = 0x11,
  // operands: u8 startSlot, u8 endSlot, u32 stringPool index (capture name)
  // → push captures[name] = input.slice(start, end).
  CAPTURE_SLICE = 0x12,

  // --- Scan primitives -----------------------------------------------------
  // operands: u8 class-kind enum, u32 refinement-key stringPool index
  // → advance off through the class scanner. Class-kind enum values mirror
  // ScanClassKind below (see end of file). The refinement key is a packed
  // string ('int' / 'css' / etc.) the runtime decodes to pick a refinement
  // variant.
  SCAN_CLASS = 0x20,
  // operands: u32 stop-count, then `count` × u32 stringPool indices, u32
  // token-class bitmask → advance off until any stop matches or fail.
  // Reserved for Task 6.3; encoder currently doesn't emit this.
  SCAN_UNTIL = 0x21,
  // operand: u32 AC-table reference (stored in a scanTable pool built at
  // encode time) → AC-driven scan. Reserved for Task 6.3.
  SCAN_UNTIL_AC = 0x22,

  // --- Control flow --------------------------------------------------------
  // operand: u32 productionOffset → recursive call into another production's
  // bytecode block. Forward references are resolved by an end-of-encode
  // fixup pass.
  CALL_PRODUCTION = 0x30,
  // No operands — pop captures stack frame, set state.pos, return captures.
  RETURN_OK = 0x40,
  // No operands — set state.pos = entryOff, return null.
  RETURN_NULL = 0x41,

  // operand: i32 relative offset (from end of operand).
  JUMP = 0x50,
  // operands: u8 byte value, i32 relative offset → if input[off] === byte,
  // jump. Reserved; encoder currently doesn't emit this.
  JUMP_IF_PEEK_BYTE = 0x51,
  // operand: i32 relative offset → if top-of-stack is null, jump.
  JUMP_IF_NULL = 0x52,

  // --- Captures construction ----------------------------------------------
  // operand: u32 stringPool index (production routing key) → push {} with
  // __production: key onto the value stack.
  PUSH_NEW_CAPTURES = 0x60,
  // operands: u32 stringPool field name, u32 stringPool value
  // → captures[name] = value (constant string).
  PUSH_LITERAL_FIELD = 0x61,
  // operands: u32 stringPool field name, u32 numberPool index
  // → captures[name] = number. Reserved; cron doesn't bake number
  // constants into captures, only captures numeric input slices.
  PUSH_NUMBER_FIELD = 0x62,
  // operands: u32 stringPool field name, u8 bool → captures[name] = bool.
  // Reserved; cron doesn't use this either.
  PUSH_BOOL_FIELD = 0x63,

  // --- Render dispatch (for stringify and inverse — Task 6.4 / 6.5) -------
  // operand: u32 target stringPool index → dispatch top-of-stack captures
  // through __dispatchRender_<target>. Reserved; encoder currently doesn't
  // emit this — Task 6.4 will wire it in.
  RENDER_DISPATCH = 0x70,
  // operand: u32 target stringPool index → ditto for stringify. Reserved.
  STRINGIFY_DISPATCH = 0x71,
}

// Class-kind enum values for SCAN_CLASS's first operand byte. Kept small
// (u8) so the operand fits in a single byte. The runtime maps these to its
// existing class scanners (ident / number / hex / string / comment).
export enum ScanClassKind {
  IDENT = 1,
  NUMBER = 2,
  HEX = 3,
  STRING = 4,
  COMMENT = 5,
  KEYWORD = 6,
}

// Per-opcode operand-byte widths. Each entry is the list of operand sizes in
// declaration order. The runtime steps through the same table to advance
// `pc` past operands when iterating opcodes. Variable-length operands (e.g.
// SCAN_UNTIL's stop list) are represented as a leading u32 count followed by
// `count × u32` indices — encoded by the encoder as the count first, then
// inlined indices; the runtime decodes the count to know how many u32s
// follow.
//
// Sizes:
//   u8  = 1 byte
//   u32 = 4 bytes (fixed)
//   i32 = 4 bytes (fixed, signed jump offsets)
//   bitset256 = 32 bytes (CONSUME_BYTE_IN_SET)
//
// For SCAN_UNTIL the first u32 is the stop-count; the actual stream contains
// `count` more u32 indices + one u32 token-class bitmask. OPERAND_SIZES
// records only the FIXED operands — the encoder/runtime both know to read
// `count` extra u32s after the first.
export const OPERAND_SIZES: Readonly<Record<Op, ReadonlyArray<number>>> = {
  [Op.CONSUME_LITERAL]: [4],
  [Op.CONSUME_BYTE_IN_SET]: [32],
  [Op.SKIP_WS]: [],

  [Op.SAVE_OFF]: [1],
  [Op.RESTORE_OFF]: [1],
  [Op.CAPTURE_SLICE]: [1, 1, 4],

  [Op.SCAN_CLASS]: [1, 4],
  [Op.SCAN_UNTIL]: [4, 4], // count + token-class bitmask (variable u32s follow)
  [Op.SCAN_UNTIL_AC]: [4],

  [Op.CALL_PRODUCTION]: [4],
  [Op.RETURN_OK]: [],
  [Op.RETURN_NULL]: [],

  [Op.JUMP]: [4],
  [Op.JUMP_IF_PEEK_BYTE]: [1, 4],
  [Op.JUMP_IF_NULL]: [4],

  [Op.PUSH_NEW_CAPTURES]: [4],
  [Op.PUSH_LITERAL_FIELD]: [4, 4],
  [Op.PUSH_NUMBER_FIELD]: [4, 4],
  [Op.PUSH_BOOL_FIELD]: [4, 1],

  [Op.RENDER_DISPATCH]: [4],
  [Op.STRINGIFY_DISPATCH]: [4],
};
