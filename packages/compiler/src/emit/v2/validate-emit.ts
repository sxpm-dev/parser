// Validator-hook codegen module.
//
// Emits the public validate() function and its per-validator import block.
// Returns { imports, body } so the caller can place imports at file head
// and the function body in the public-api section.
//
// Strategy: when {validate: true} is passed, parse in 'raws' mode to get
// source offsets on every node. Walk the raws AST looking for nodes whose
// __production matches a validation rule's nodeType. For each match, check
// if the node's matchField is in the rule's matchValues, then call the
// validator on the node's field value.

import type { InferredSchema } from '../../model.ts';
import { jsString } from '../strings.ts';

export function emitValidate(
  schema: InferredSchema,
  rootFn: string,
): { imports: string; body: string } {
  const rules = schema.validation?.rules ?? [];
  if (rules.length === 0) {
    return {
      imports: '',
      body: emitValidateStub(rootFn, schema.packageName),
    };
  }

  // Collect unique (module, exportName) pairs, assign stable local aliases.
  // Key is "module::exportName" → local alias "__validator_N".
  const importMap = new Map<string, string>(); // key -> alias
  for (const r of rules) {
    const key = `${r.validator.module}::${r.validator.exportName}`;
    if (!importMap.has(key)) {
      const alias = `__validator_${importMap.size}`;
      importMap.set(key, alias);
    }
  }

  const importLines: string[] = [];
  for (const [key, alias] of importMap) {
    const colonIdx = key.indexOf('::');
    const mod = key.slice(0, colonIdx);
    const name = key.slice(colonIdx + 2);
    importLines.push(`import { ${name} as ${alias} } from ${jsString(mod)};`);
  }

  // Group rules by nodeType for the dispatch switch.
  const byNode = new Map<string, typeof rules[number][]>();
  for (const r of rules) {
    const list = byNode.get(r.nodeType) ?? [];
    list.push(r);
    byNode.set(r.nodeType, list);
  }

  // Build the per-nodeType case bodies.
  // In raws mode, nodes have __production like "Declaration#0", "Declaration#1", etc.
  // We match via startsWith(nodeType + '#') or === nodeType.
  // Fields like prop and value are directly on the captures object.
  const switchCases: string[] = [];
  for (const [nodeType, nodeRules] of byNode) {
    const inner: string[] = [];
    for (const r of nodeRules) {
      const valuesArr = '[' + r.matchValues.map((v) => jsString(v)).join(', ') + ']';
      const alias = importMap.get(`${r.validator.module}::${r.validator.exportName}`)!;
      inner.push(
        `    if (${valuesArr}.includes(__n[${jsString(r.matchField)}])) {`,
        `      try { ${alias}(String(__n[${jsString(r.field)}] ?? '')); }`,
        `      catch (__e) {`,
        `        const __off = (__n.source && __n.source.start && typeof __n.source.start.offset === 'number')`,
        `          ? __n.source.start.offset : 0;`,
        `        throw validatorErrorAt(input, __off, __e);`,
        `      }`,
        `    }`,
      );
    }
    // nodeType matches when __production === "NodeType#N"
    // We use a prefix check: __production.startsWith(nodeType + '#') || __production === nodeType
    switchCases.push(
      `  if (__prod === ${jsString(nodeType)} || __prod.startsWith(${jsString(nodeType + '#')})) {`,
      ...inner,
      `  }`,
    );
  }

  const body = `export function validate(input: string, options?: ParseOptions): void {
  // Syntax check: parse in fast mode first (will throw SyntaxError on bad syntax).
  __parse(input, { mode: 'fast' });
  // Validation check: only runs when opt-in.
  if (!options?.validate) return;
  // Parse in raws mode to get source offsets for error reporting.
  const __rawsAst = __parse(input, { mode: 'raws' });
  __walkAndValidate(input, __rawsAst);
}

function __walkAndValidate(input: string, node: unknown): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const child of node) __walkAndValidate(input, child);
    return;
  }
  if (typeof node !== 'object') return;
  const __n = node as Record<string, unknown>;
  const __prod = typeof __n['__production'] === 'string' ? __n['__production'] : '';
${switchCases.join('\n')}
  // Recurse into all object-valued children.
  for (const __key in __n) {
    const __child = __n[__key];
    if (__child !== null && typeof __child === 'object') __walkAndValidate(input, __child);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: ${jsString(`@parser2/${schema.packageName}`)},
  exportName: 'validate',
};`;

  return { imports: importLines.join('\n'), body };
}

function emitValidateStub(rootFn: string, packageName: string): string {
  return `export function validate(input: string, options?: ParseOptions): void {
  const __state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
  };
  const __result = ${rootFn}(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: ${jsString(`@parser2/${packageName}`)},
  exportName: 'validate',
};`;
}
