import type {
  PunctuatorDecl,
  PunctuatorMap,
  SchemaDef,
  SchemaInput,
  SpanClass,
  TokenDecl,
} from './types.ts';

export function defineSchema(input: SchemaInput): SchemaDef {
  return {
    rootType: input.rootType,
    uses: input.uses ?? [],
    operators: input.operators ?? {},
    punctuators: normalizePunctuators(input.punctuators),
    tokens: normalizeTokens(input.tokens),
    whitespace: input.whitespace ?? 'standard',
    unknownChars: input.unknownChars ?? 'reject',
    examples: input.examples,
  };
}

function normalizePunctuators(
  input: SchemaInput['punctuators'],
): ReadonlyArray<PunctuatorDecl> {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((literal) => ({ literal, type: literal }));
  }
  const map = input as PunctuatorMap;
  const out: PunctuatorDecl[] = [];
  for (const [type, value] of Object.entries(map)) {
    if (Array.isArray(value)) {
      for (const literal of value) out.push({ literal, type });
    } else if (typeof value === 'string') {
      out.push({ literal: value, type });
    }
  }
  return out;
}

function normalizeTokens(input: SchemaInput['tokens']): ReadonlyArray<TokenDecl> {
  if (!input) return [];
  return input.map((t) => (typeof t === 'string' ? { class: t as SpanClass } : t));
}
