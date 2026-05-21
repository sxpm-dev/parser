import { parse as generatedParse, tokenize, validate as generatedValidate } from './_generated/parser.ts';
import type { ParseOptions as GeneratedParseOptions } from './_generated/parser.ts';

export { tokenize } from './_generated/parser.ts';
export type { ParseMode, Token } from './_generated/parser.ts';

export type ParseOptions = Omit<GeneratedParseOptions, 'validate'> & {
  readonly validateProperties?: boolean;
};

export function parse(input: string, options?: ParseOptions): unknown {
  if (options === undefined) return generatedParse(input);
  if (options.validateProperties !== true) return generatedParse(input, options as GeneratedParseOptions);
  return generatedParse(input, { mode: options.mode, validate: true });
}

export function validate(input: string, options?: ParseOptions): void {
  if (options?.validateProperties === true) {
    generatedValidate(input, { mode: options.mode, validate: true });
    return;
  }
  generatedValidate(input, options as GeneratedParseOptions | undefined);
}

export function countTokens(input: string): number {
  const len = input.length;
  let i = 0;
  let count = 0;
  while (i < len) {
    const c = input.charCodeAt(i);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      i++;
      continue;
    }
    if (c === 0x2f && i + 1 < len && input.charCodeAt(i + 1) === 0x2a) {
      i += 2;
      while (i < len && !(input.charCodeAt(i) === 0x2a && i + 1 < len && input.charCodeAt(i + 1) === 0x2f)) i++;
      if (i < len) i += 2;
      count++;
      continue;
    }
    if (isCssPunctuator(c)) {
      i++;
      count++;
      continue;
    }
    if (isDigit(c)) {
      i++;
      while (i < len && isDigit(input.charCodeAt(i))) i++;
      if (i < len && input.charCodeAt(i) === 0x2e && i + 1 < len && isDigit(input.charCodeAt(i + 1))) {
        i++;
        while (i < len && isDigit(input.charCodeAt(i))) i++;
      }
      const ec = i < len ? input.charCodeAt(i) : 0;
      if (ec === 0x65 || ec === 0x45) {
        let j = i + 1;
        if (j < len && (input.charCodeAt(j) === 0x2b || input.charCodeAt(j) === 0x2d)) j++;
        if (j < len && isDigit(input.charCodeAt(j))) {
          i = j + 1;
          while (i < len && isDigit(input.charCodeAt(i))) i++;
        }
      }
      count++;
      continue;
    }
    if (c === 0x22 || c === 0x27) {
      const quote = c;
      i++;
      while (i < len) {
        const ch = input.charCodeAt(i);
        if (ch === 0x5c) {
          i += 2;
          continue;
        }
        i++;
        if (ch === quote || ch === 0x0a || ch === 0x0d) break;
      }
      count++;
      continue;
    }
    if (isCssIdentStart(c) || c === 0x5c) {
      const start = i;
      while (i < len) {
        const c2 = input.charCodeAt(i);
        if (c2 === 0x5c) {
          i++;
          if (i < len && isHexDigit(input.charCodeAt(i))) {
            let n = 0;
            while (i < len && n < 6 && isHexDigit(input.charCodeAt(i))) {
              i++;
              n++;
            }
            if (i < len && isAsciiWs(input.charCodeAt(i))) i++;
          } else if (i < len) {
            i++;
          }
          continue;
        }
        if (!isCssIdentPart(c2)) break;
        i++;
      }
      if (
        i - start === 3 &&
        i < len &&
        input.charCodeAt(i) === 0x28 &&
        (input.charCodeAt(start) | 32) === 0x75 &&
        (input.charCodeAt(start + 1) | 32) === 0x72 &&
        (input.charCodeAt(start + 2) | 32) === 0x6c
      ) {
        i++;
        while (i < len) {
          const cu = input.charCodeAt(i);
          if (cu === 0x29) {
            i++;
            break;
          }
          if (cu === 0x5c && i + 1 < len) {
            i += 2;
            continue;
          }
          if (cu === 0x22 || cu === 0x27) {
            const quote = cu;
            i++;
            while (i < len) {
              const ch = input.charCodeAt(i);
              if (ch === 0x5c && i + 1 < len) {
                i += 2;
                continue;
              }
              i++;
              if (ch === quote || ch === 0x0a || ch === 0x0d) break;
            }
            continue;
          }
          i++;
        }
      }
      count++;
      continue;
    }
    throw new SyntaxError(`Unexpected character '${input[i]}' at position ${i}`);
  }
  return count;
}

function isCssPunctuator(c: number): boolean {
  return (
    c === 0x21 ||
    c === 0x23 ||
    c === 0x24 ||
    c === 0x25 ||
    c === 0x26 ||
    c === 0x28 ||
    c === 0x29 ||
    c === 0x2a ||
    c === 0x2b ||
    c === 0x2c ||
    c === 0x2e ||
    c === 0x2f ||
    c === 0x3a ||
    c === 0x3b ||
    c === 0x3d ||
    c === 0x3e ||
    c === 0x3f ||
    c === 0x40 ||
    c === 0x5b ||
    c === 0x5c ||
    c === 0x5d ||
    c === 0x5e ||
    c === 0x7b ||
    c === 0x7c ||
    c === 0x7d ||
    c === 0x7e
  );
}

function isCssIdentStart(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45;
}

function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || isDigit(c);
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

function isHexDigit(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}

function isAsciiWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
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
