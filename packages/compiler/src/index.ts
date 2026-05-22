import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { emitParser } from './emit/index.ts';
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
  const { literals, literalTypeByText, classes } = buildTokenizerProgram(schemas, nodeTypes);
  return {
    packageName: options.packageName ?? 'parser',
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    classes,
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
  return emitParser(inferSchema(root, validation, options));
}
