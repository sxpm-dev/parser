import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { emitParser } from './emit/index.ts';
import type { InferredSchema } from './model.ts';

export type { InferredSchema } from './model.ts';

export function inferSchema(root: SchemaDef, validation?: ValidationDef): InferredSchema {
  const schemas = resolveCompositionGraph(root);
  const nodeTypes = buildProductions(schemas);
  resolveRecursiveRoles(nodeTypes, root.rootType);
  validate(nodeTypes);
  const { literals, literalTypeByText, classes } = buildTokenizerProgram(schemas, nodeTypes);
  return {
    rootSchemaName: root.name,
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    classes,
    whitespace: root.whitespace,
    validation,
  };
}

export function generateParser(root: SchemaDef, validation?: ValidationDef): string {
  return emitParser(inferSchema(root, validation));
}
