// Input-normalization preamble code generator.
//
// Returns the code string that backends inject at parse entry to apply the
// four schema-level dials (BOM, unicode, newlines, caseSensitive) once to
// the input, before opcode dispatch / state construction. Mirrors
// `applyPreamble` in src/interp/parse.ts step-for-step so generated parsers
// produce the same AST as the reference interpreter for any (schema, input)
// pair.
//
// Lives in a neutral location (not inside any specific backend) so multiple
// backends can share without cross-backend coupling. Today consumed by v2
// (`emit/v2/index.ts`) and bytecode (`emit/bytecode/index.ts`).
//
// IMPORTANT: we intentionally do NOT short-circuit at "all defaults". The
// default `bom: 'allow'` actively strips a leading U+FEFF — if the emit
// path skipped the BOM block at default the generated parser would fail
// the literal match on BOM-prefixed input while the interpreter strips it
// and parses successfully. That divergence breaks the differential-fuzzing
// invariant Phase 2 established. Each per-dial block below emits NO code
// for `'LF'` / `'none'` / `caseSensitive: true`, so non-BOM dials at
// default carry zero overhead.

import type { InferredSchema } from '../model.ts';

export function emitPreamble(schema: InferredSchema): string {
  const blocks: string[] = [];
  // 1. BOM handling.
  switch (schema.bom) {
    case 'allow':
      blocks.push(`if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);`);
      break;
    case 'reject':
      blocks.push(
        `if (input.charCodeAt(0) === 0xfeff) throw new SyntaxError('parse: schema rejects BOM; input begins with U+FEFF');`,
      );
      break;
    case 'require':
      blocks.push(
        `if (input.charCodeAt(0) !== 0xfeff) throw new SyntaxError('parse: schema requires BOM; input does not begin with U+FEFF');`,
      );
      blocks.push(`input = input.slice(1);`);
      break;
  }
  // 2. Unicode normalization.
  if (schema.unicode !== 'none') {
    blocks.push(`input = input.normalize(${JSON.stringify(schema.unicode)});`);
  }
  // 3. Newline canonicalization.
  switch (schema.newlines) {
    case 'LF':
      break;
    case 'CRLF':
      blocks.push(`input = input.replace(/\\r\\n/g, '\\n');`);
      break;
    case 'either-preserve':
      blocks.push(`input = input.replace(/\\r\\n?/g, '\\n');`);
      break;
  }
  // 4. Case fold. ASCII-correctness only — non-ASCII case folding has
  // documented edge cases (see Phase 8 closeout follow-ups).
  if (!schema.caseSensitive) {
    blocks.push(`input = input.toLowerCase();`);
  }
  return blocks.length === 0 ? '' : '  ' + blocks.join('\n  ') + '\n';
}
