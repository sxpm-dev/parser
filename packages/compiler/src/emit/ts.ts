// TS backend — the existing scannerless emit (emit/v2) wrapped as a Backend.
//
// This is the default backend. It must remain byte-identical to calling
// emitV2Parser directly so existing callers of generateParser(...) see no
// behavior change when the Backend abstraction is introduced.

import type { InferredSchema } from '../model.ts';
import { emitV2Parser } from './v2/index.ts';
import type { Backend } from './backend.ts';

export const TS_BACKEND: Backend = {
  name: 'ts',
  fileExtension: '.ts',
  emit(schema: InferredSchema): string {
    return emitV2Parser(schema);
  },
};
