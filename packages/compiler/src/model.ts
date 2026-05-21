// The InferredSchema is the intermediate representation produced by the
// inference passes and consumed by the emitter. It contains only generic
// shape — no language-specific knowledge.

import type {
  ExampleDef,
  Refinement,
  SpanClass,
  SpanDef,
  SpanModifier,
  StructureValue,
  ValidationDef,
  WhitespacePolicy,
} from '@parser2/parser';

export type ResolvedSpan = {
  readonly name?: string;
  readonly text?: string;
  readonly class: SpanClass;
  readonly refinements: ReadonlyArray<Refinement>;
  readonly modifiers: ReadonlyArray<SpanModifier>;
  readonly recursiveRoles: ReadonlyArray<string>; // resolved against the composition graph
};

export type Production = {
  readonly nodeType: string;
  readonly source: ExampleDef;
  readonly spans: ReadonlyArray<ResolvedSpan>;
  readonly structure: StructureValue;
};

export type NodeTypeInfo = {
  readonly name: string;
  readonly productions: ReadonlyArray<Production>;
};

export type TokenClassUsage = {
  readonly class: SpanClass;
  // Refinements applied across all uses of this class. For v1 we union them;
  // the emitter inlines a predicate that admits any value matching any
  // refinement.
  readonly refinements: ReadonlyArray<Refinement>;
};

export type LiteralDecl = {
  readonly literal: string;
  readonly type: string;
};

export type InferredSchema = {
  readonly rootSchemaName: string;
  readonly rootType: string;
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  // All literal terminal texts that appear in spans, declared punctuators,
  // operator layers, and separator modifiers. Sorted by literal length
  // descending for longest-match emission. Each carries its assigned token
  // type (named if declared via punctuators: {...}, otherwise == literal).
  readonly literals: ReadonlyArray<LiteralDecl>;
  // Lookup from literal text to its assigned token type. The parser uses
  // this to translate `.span(text)` into expectLiteral(type, value).
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly classes: ReadonlyArray<TokenClassUsage>;
  readonly whitespace: WhitespacePolicy;
  readonly validation?: ValidationDef;
};

// --- Validation result -----------------------------------------------------

export type ValidationIssue = {
  readonly message: string;
  readonly nodeType?: string;
  readonly span?: SpanDef;
};

export class CompilerError extends Error {
  constructor(message: string, public readonly issues: ReadonlyArray<ValidationIssue> = []) {
    super(message);
    this.name = 'CompilerError';
  }
}
