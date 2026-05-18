import type { CodegenInput } from '@parser2/parser';

export function generateJsParser(_schema: CodegenInput): string {
  return `import type { Token } from '@parser2/parser';

export type JsNode = { type: 'Program'; source: string; tokens: Token[] };

const punct = new Set(['{','}','(',')','[',']',';',',','.',':','?','+','-','*','/','%','=','!','<','>','&','|','^','~']);

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const start = i;
    const c = input.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      i++;
      while (i < input.length) { const d = input.charCodeAt(i); if (d !== 32 && d !== 9 && d !== 10 && d !== 13) break; i++; }
      out.push({ type: 'whitespace', value: input.slice(start, i), start, end: i });
    } else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36) {
      i++;
      while (i < input.length) { const d = input.charCodeAt(i); if (!((d >= 65 && d <= 90) || (d >= 97 && d <= 122) || (d >= 48 && d <= 57) || d === 95 || d === 36)) break; i++; }
      out.push({ type: 'ident', value: input.slice(start, i), start, end: i });
    } else if (c >= 48 && c <= 57) {
      i++;
      while (i < input.length) { const d = input.charCodeAt(i); if (!((d >= 48 && d <= 57) || d === 46)) break; i++; }
      out.push({ type: 'number', value: input.slice(start, i), start, end: i });
    } else if (c === 34 || c === 39 || c === 96) {
      const quote = c; i++;
      while (i < input.length) { const d = input.charCodeAt(i++); if (d === 92) i++; else if (d === quote) break; }
      out.push({ type: 'string', value: input.slice(start, i), start, end: i });
    } else {
      i++;
      out.push({ type: punct.has(input[start]) ? 'punct' : 'unknown', value: input.slice(start, i), start, end: i });
    }
  }
  return out;
}

export function parse(input: string): JsNode {
  return { type: 'Program', source: input, tokens: tokenize(input) };
}

export function stringify(ast: JsNode): string {
  return ast.source;
}
`;
}
