import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { attachAuthorTemplates } from './infer/templates.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { emitScannerlessParser } from './emit/scannerless/index.ts';
import { emitV2Parser } from './emit/v2/index.ts';
import type { InferredSchema } from './model.ts';

export type { InferredSchema } from './model.ts';

export type GenerateOptions = {
  // Identifier used in the generated file header and as the package name
  // in the validator's __parser2Validator metadata. Has NO effect on parser
  // behavior. Defaults to 'parser' if not supplied — keep it explicit at
  // CLI / package-build level.
  readonly packageName?: string;
  // When true, emit using the v2 backend (see docs/scannerless-emit-v2.md).
  // Per-schema opt-in while v2 is rolled out.
  readonly v2?: boolean;
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
  attachAuthorTemplates(nodeTypes);
  const { literals, literalTypeByText, classes, tokenTypeIds } = buildTokenizerProgram(schemas, nodeTypes);
  return {
    packageName: options.packageName ?? 'parser',
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    classes,
    tokenTypeIds,
    whitespace: root.whitespace,
    unknownChars: root.unknownChars,
    validation,
  };
}

export function generateParser(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): string {
  const schema = inferSchema(root, validation, options);
  if (options.v2) return emitV2Parser(schema);
  return emitScannerlessParser(schema);
}
