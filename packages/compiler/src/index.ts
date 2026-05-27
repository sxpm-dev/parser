import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { attachRenderTargets } from './infer/render-targets.ts';
import { deriveInverses } from './infer/invert.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { checkRoundTrip } from './check/round-trip.ts';
import { checkDispatch } from './check/dispatch.ts';
import type { Backend } from './emit/backend.ts';
import { TS_BACKEND } from './emit/ts.ts';
import type { InferredSchema } from './model.ts';

export type { InferredSchema } from './model.ts';
export type { Backend } from './emit/backend.ts';
export { TS_BACKEND } from './emit/ts.ts';

export type GenerateOptions = {
  // Identifier used in the generated file header and as the package name
  // in the validator's __parser2Validator metadata. Has NO effect on parser
  // behavior. Defaults to 'parser' if not supplied — keep it explicit at
  // CLI / package-build level.
  readonly packageName?: string;
  // Code-emission backend. Defaults to the TS backend (emit/v2), which
  // preserves byte-identical output for existing callers. The bytecode
  // backend (forthcoming) is selected by passing BYTECODE_BACKEND here or
  // via the CLI's --backend bytecode flag.
  readonly backend?: Backend;
};

export function inferSchema(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): InferredSchema {
  const schemas = resolveCompositionGraph(root);
  const nodeTypes = buildProductions(schemas);
  resolveRecursiveRoles(nodeTypes, root.rootType);
  validate(nodeTypes);
  attachRenderTargets(nodeTypes);
  deriveInverses(nodeTypes);
  const { literals, literalTypeByText, classes, tokenTypeIds } = buildTokenizerProgram(schemas, nodeTypes);
  const inferred: InferredSchema = {
    packageName: options.packageName ?? 'parser',
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    classes,
    tokenTypeIds,
    whitespace: root.whitespace,
    unknownChars: root.unknownChars,
    defaultTarget: root.defaultTarget,
    validation,
  };
  // Theorem check: the schema must encode a round-trippable language. Done
  // after deriveInverses so the inverse IR is in place. See
  // check/round-trip.ts for the property statement.
  checkRoundTrip(inferred);
  // Theorem check: every multi-production node-type's productions must be
  // statically distinguishable by the parse-time dispatcher (either by
  // disjoint first-byte signatures or by bounded peek/longest-prefix
  // discriminators), and the root node's dispatch must be total. See
  // check/dispatch.ts for the property statement.
  checkDispatch(inferred);
  return inferred;
}

export function generateParser(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): string {
  const schema = inferSchema(root, validation, options);
  const backend = options.backend ?? TS_BACKEND;
  return backend.emit(schema);
}
