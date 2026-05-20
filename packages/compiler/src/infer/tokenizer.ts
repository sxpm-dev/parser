import type { SchemaDef, SpanClass } from '@parser2/parser';
import type { NodeTypeInfo, TokenClassUsage } from '../model.ts';

// Pass 6: derive tokenizer program inputs.
//
//   - All literal terminal texts (from spans + .repeats({sep}) + operators
//     + declared punctuators) form the literal recognition set. Each gets a
//     token TYPE (named from `punctuators: {...}` if declared, otherwise
//     the literal text itself).
//   - Every classed span contributes a class usage (with refinements unioned).
//
// The emitter consumes these to generate inlined recognition code with
// longest-match-wins ordering.

export type LiteralDecl = {
  readonly literal: string;
  readonly type: string;
};

export type TokenizerProgram = {
  readonly literals: ReadonlyArray<LiteralDecl>;
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly classes: ReadonlyArray<TokenClassUsage>;
};

export function buildTokenizerProgram(
  schemas: ReadonlyArray<SchemaDef>,
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): TokenizerProgram {
  // Start with declared punctuators so their named types win over any
  // implicit literal-as-type inference from spans.
  const literalToType = new Map<string, string>();
  for (const schema of schemas) {
    for (const decl of schema.punctuators) {
      literalToType.set(decl.literal, decl.type);
    }
    for (const layer of Object.values(schema.operators)) {
      for (const op of layer) {
        if (!literalToType.has(op)) literalToType.set(op, op);
      }
    }
  }

  const classRefinements = new Map<SpanClass, Map<string, ReadonlyArray<unknown> | undefined>>();

  // Tokens declared at schema level are unconditionally added (they often
  // appear inside .until() captures even when no span uses them directly).
  for (const schema of schemas) {
    for (const decl of schema.tokens) {
      const map = classRefinements.get(decl.class) ?? new Map();
      for (const refinement of decl.refinements ?? []) {
        map.set(refinement.name, refinement.args);
      }
      classRefinements.set(decl.class, map);
    }
  }

  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      for (const span of production.spans) {
        const isUntil = span.modifiers.some((m) => m.kind === 'until');
        // .until() spans use text only as an anchor; the captured value is
        // arbitrary input, not a fixed literal. Don't register the anchor
        // text as a punctuator. Recursive spans also use text only as an
        // example anchor.
        if (span.class === 'literal' && span.text && span.recursiveRoles.length === 0 && !isUntil) {
          if (!literalToType.has(span.text)) literalToType.set(span.text, span.text);
        }
        if (span.class !== 'literal') {
          const map = classRefinements.get(span.class) ?? new Map();
          for (const refinement of span.refinements) {
            map.set(refinement.name, refinement.args);
          }
          classRefinements.set(span.class, map);
        }
        for (const modifier of span.modifiers) {
          if (modifier.kind === 'repeats' && modifier.sep) {
            if (!literalToType.has(modifier.sep)) literalToType.set(modifier.sep, modifier.sep);
          }
        }
      }
    }
  }

  const literals = [...literalToType]
    .map(([literal, type]) => ({ literal, type }))
    .sort((a, b) => b.literal.length - a.literal.length || (a.literal < b.literal ? -1 : 1));

  const classes: TokenClassUsage[] = [];
  for (const [cls, refsMap] of classRefinements) {
    classes.push({
      class: cls,
      refinements: [...refsMap].map(([name, args]) => ({ name, args })),
    });
  }

  return { literals, literalTypeByText: literalToType, classes };
}
