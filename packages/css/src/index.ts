import { parse, tokenize } from './_generated/parser.ts';

export { parse, tokenize } from './_generated/parser.ts';
export type { ParseMode, ParseOptions, Token } from './_generated/parser.ts';

export function countTokens(input: string): number {
  return tokenize(input).length;
}

export function stringify(value: unknown): string {
  return stringifyNode(value);
}

function stringifyNode(value: unknown): string {
  if (!value || typeof value !== 'object') throw new TypeError('stringify: expected CSS AST node');
  const node = value as {
    readonly type?: string;
    readonly nodes?: readonly unknown[];
    readonly selector?: string;
    readonly prop?: string;
    readonly value?: string;
    readonly important?: boolean;
    readonly name?: string;
    readonly params?: string;
    readonly text?: string;
  };

  if (node.type === 'root') return stringifyChildren(node.nodes);
  if (node.type === 'rule') return `${node.selector ?? ''} { ${stringifyChildren(node.nodes)} }`;
  if (node.type === 'decl') return `${node.prop ?? ''}: ${node.value ?? ''}${node.important ? ' !important' : ''};`;
  if (node.type === 'atrule') {
    const head = `@${node.name ?? ''}${node.params ? ` ${node.params}` : ''}`;
    return node.nodes ? `${head} { ${stringifyChildren(node.nodes)} }` : `${head};`;
  }
  if (node.type === 'comment') return `/* ${node.text ?? ''} */`;
  throw new TypeError(`stringify: unsupported CSS AST node '${node.type ?? 'unknown'}'`);
}

function stringifyChildren(nodes: readonly unknown[] | undefined): string {
  return (nodes ?? []).map(stringifyNode).join(' ');
}
