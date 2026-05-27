// Bytecode backend skeleton. Task 6.5 turns the placeholder emit into a real
// generated artifact (runtime import + parse/render/stringify wrappers); for
// Task 6.2 we just register the backend and run the encoder so the rest of
// the pipeline can compose against it without crashing.

import type { Backend } from '../backend.ts';
import type { InferredSchema } from '../../model.ts';
import { encodeSchema } from './encoder.ts';

export { encodeSchema } from './encoder.ts';
export type { EncodedSchema } from './encoder.ts';
export { Op, OPERAND_SIZES, ScanClassKind } from './ops.ts';
export type { RuntimeState } from './runtime.ts';
export { runParse } from './runtime.ts';

export const BYTECODE_BACKEND: Backend = {
  name: 'bytecode',
  fileExtension: '.bcode.ts',
  emit(schema: InferredSchema): string {
    // Encoder runs here so any structural problem in the schema shows up
    // at emit time, not at CLI-driven write time. We discard the encoded
    // bytes for now — Task 6.5 will serialize them into the generated file.
    encodeSchema(schema);
    return `// Bytecode-backend stub for ${schema.rootType} — Task 6.5 will flesh this out.\nexport {};\n`;
  },
};
