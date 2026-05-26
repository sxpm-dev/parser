import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { attachRenderTargets } from './infer/render-targets.ts';
import { deriveInverses } from './infer/invert.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { checkRoundTrip } from './check/round-trip.ts';
import { emitV2Parser } from './emit/v2/index.ts';
import type { InferredSchema } from './model.ts';

export type { InferredSchema } from './model.ts';

export type GenerateOptions = {
  // Identifier used in the generated file header and as the package name
  // in the validator's __parser2Validator metadata. Has NO effect on parser
  // behavior. Defaults to 'parser' if not supplied — keep it explicit at
  // CLI / package-build level.
  readonly packageName?: string;
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
  return inferred;
}

export function generateParser(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): string {
  const schema = inferSchema(root, validation, options);
  return emitV2Parser(schema);
}
