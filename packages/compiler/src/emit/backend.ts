// Backend interface for the compiler's code-emission stage.
//
// A Backend turns an InferredSchema (the result of all inference/validation/
// theorem checks) into a single source-string artifact, plus the file
// extension that artifact should be written under. Multiple backends can
// coexist behind the same CLI/API surface — see emit/ts.ts for the default
// TS backend and (forthcoming) emit/bytecode for the bytecode backend.

import type { InferredSchema } from '../model.ts';

export interface Backend {
  readonly name: string;
  readonly fileExtension: string;
  emit(schema: InferredSchema): string;
}
