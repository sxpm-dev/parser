import type { InferredSchema } from '../model.ts';
import { emitDirectFastPath } from './direct-fast.ts';
import { emitNodeFunctions, parseFnName } from './parse.ts';
import { PARSE_RUNTIME } from './runtime.ts';
import { emitTokenizer } from './tokenize.ts';
import { jsString } from './strings.ts';

// Top-level emitter. Produces a single TypeScript file that, when imported,
// exports the parse / tokenize / stringify API for the schema.

export function emitParser(schema: InferredSchema): string {
  const header = emitHeader(schema);
  const tokenizer = emitTokenizer(schema);
  const runtime = PARSE_RUNTIME;
  const parsers = emitNodeFunctions(schema);
  const directFast = emitDirectFastPath(schema);
  const api = emitPublicApi(schema, directFast !== null);
  return [header, tokenizer, runtime, parsers, directFast, api].filter((part) => part !== null).join('\n\n') + '\n';
}

function emitHeader(schema: InferredSchema): string {
  const imports = emitValidationImports(schema);
  return `// Auto-generated from packages/${schema.rootSchemaName}/src/schema.ts
// Do not edit by hand. Re-run \`npm run generate\` to refresh.
/* eslint-disable */
// @ts-nocheck

${imports}`;
}

function emitPublicApi(schema: InferredSchema, hasDirectFast: boolean): string {
  const rootFn = parseFnName(schema.rootType);
  const fastRootFn = parseFnName(schema.rootType, 'fast');
  const validateRootFn = parseFnName(schema.rootType, 'validate');
  const hasValidation = (schema.validation?.rules.length ?? 0) > 0;
  const directFastDispatch = hasDirectFast
    ? hasValidation
      ? `  if (mode === 'fast') {
    const result = parseDirectFast(input);
    if (options.validate === true) validateParsedProperties(input, result);
    return result;
  }
`
      : `  if (mode === 'fast') return parseDirectFast(input);\n`
    : '';
  const validateAfterParse = hasValidation
    ? `  if (options.validate === true) validateParsedProperties(input, result);\n`
    : '';
  const validationRuntime = hasValidation ? `\n${emitPropertyValidation(schema)}\n` : '';
  return `export function parse(input: string, options: ParseOptions = {}): unknown {
  const mode = options.mode ?? 'fast';
${directFastDispatch}  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const lineStarts = mode === 'raws' ? computeLineStarts(input) : [];
  const hasComments = tokens.hasComments === true;
  const state: State = {
    tokens,
    pos: 0,
    input,
    lineStarts,
    mode,
    hasComments,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    const result = mode === 'raws' ? ${rootFn}(state) : ${fastRootFn}(state);
    if (state.pos !== state.tokens.length) {
      throw syntaxErrorWithFrame(input, \`unexpected trailing token at position \${state.pos}\`, tokenOffset(tokens, state.pos, input.length));
    }
${validateAfterParse}    return result;
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, tokens, state.pos);
    }
    throw error;
  }
}

export function validate(input: string, options: ParseOptions = {}): void {
  if (options.validate === true${hasValidation ? '' : ' && false'}) {
    parse(input, options);
    return;
  }
${hasDirectFast ? `  validateDirectFast(input);
  return;
` : ''}  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const state: State = {
    tokens,
    pos: 0,
    input,
    lineStarts: [],
    mode: 'fast',
    hasComments: tokens.hasComments === true,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    ${validateRootFn}(state);
    if (state.pos !== state.tokens.length) {
      throw syntaxErrorWithFrame(input, \`unexpected trailing token at position \${state.pos}\`, tokenOffset(tokens, state.pos, input.length));
    }
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, tokens, state.pos);
    }
    throw error;
  }
}

// Attach package identity so another package's validation metadata can refer
// to this generated validator while codegen still emits static imports.
(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: ${jsString(`@parser2/${schema.rootSchemaName}`)},
  exportName: 'validate',
};

export function countTokens(input: string): number {
  return tokenize(input).length;
}

${validationRuntime}
export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}`;
}

function emitValidationImports(schema: InferredSchema): string {
  const rules = schema.validation?.rules ?? [];
  if (rules.length === 0) return '';
  const imports: string[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const key = `${rule.validator.module}\0${rule.validator.exportName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    imports.push(`import { ${rule.validator.exportName} as ${validatorImportName(imports.length)} } from ${jsString(rule.validator.module)};`);
  }
  return `${imports.join('\n')}\n\n`;
}

function emitPropertyValidation(schema: InferredSchema): string {
  const rules = schema.validation?.rules ?? [];
  const imports = new Map<string, number>();
  const getImportId = (module: string, exportName: string): number => {
    const key = `${module}\0${exportName}`;
    let id = imports.get(key);
    if (id === undefined) {
      id = imports.size;
      imports.set(key, id);
    }
    return id;
  };

  const setDecls: string[] = [];
  const ruleBranches: string[] = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!;
    const importId = getImportId(rule.validator.module, rule.validator.exportName);
    const setName = `__validationSet${i}`;
    const values = [...new Set(rule.matchValues.map((value) => value.toLowerCase()))].sort();
    setDecls.push(`const ${setName} = new Set<string>([${values.map(jsString).join(', ')}]);`);
    const nodeTypeValue = structureTypeForNode(schema, rule.nodeType);
    ruleBranches.push(`if (record.type === ${jsString(nodeTypeValue)}) {
    const matchValue = record[${jsString(rule.matchField)}];
    const value = record[${jsString(rule.field)}];
    if (typeof matchValue === 'string' && typeof value === 'string') {
      const normalized = matchValue.toLowerCase();
      if (!normalized.startsWith('--') && ${setName}.has(normalized)) {
        validateCachedProperty(cache, input, ${importId}, value, ${validatorImportName(importId)}, matchValue);
      }
    }
  }`);
  }

  return `${setDecls.join('\n')}
function validateCachedProperty(
  cache: Map<string, true>,
  input: string,
  validatorId: number,
  value: string,
  validator: (input: string) => void,
  prop: string,
): void {
  const cacheKey = validatorId + '\\0' + value;
  if (cache.has(cacheKey)) return;
  try {
    validator(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const valueOffset = findPropertyValueOffset(input, prop, value);
      const nestedOffset = offsetFromMessage(error.message, 0);
      const nestedMessage = stripPositionSuffix(error.message.split('\\n')[0] ?? error.message);
      throw syntaxErrorWithFrame(input, nestedMessage, valueOffset + nestedOffset);
    }
    throw error;
  }
  cache.set(cacheKey, true);
}

function validateParsedProperties(input: string, node: unknown): void {
  const cache = new Map<string, true>();
  visitValidationNode(input, node, cache);
}

function visitValidationNode(input: string, node: unknown, cache: Map<string, true>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) visitValidationNode(input, child, cache);
    return;
  }
  const record = node as Record<string, unknown>;
${ruleBranches.map((branch) => branch.split('\n').map((line) => `  ${line}`).join('\n')).join('\n')}
  const children = record.nodes;
  if (Array.isArray(children)) {
    for (const child of children) visitValidationNode(input, child, cache);
  }
}

function findPropertyValueOffset(input: string, prop: string, value: string): number {
  const valueIndex = input.indexOf(value);
  if (valueIndex >= 0) return valueIndex;
  const propIndex = input.indexOf(prop);
  if (propIndex < 0) return 0;
  const colonIndex = input.indexOf(':', propIndex + prop.length);
  if (colonIndex < 0) return propIndex;
  let pos = colonIndex + 1;
  while (pos < input.length && isAsciiWs(input.charCodeAt(pos))) pos++;
  return pos;
}`;
}

function structureTypeForNode(schema: InferredSchema, nodeType: string): string {
  const info = schema.nodeTypes.get(nodeType);
  const production = info?.productions[0];
  const structure = production?.structure;
  if (structure && typeof structure === 'object' && !Array.isArray(structure) && !('__ref' in structure)) {
    const typeValue = (structure as Record<string, unknown>).type;
    if (typeof typeValue === 'string') return typeValue;
  }
  return nodeType;
}

function validatorImportName(id: number): string {
  return `__propertyValidator${id}`;
}
