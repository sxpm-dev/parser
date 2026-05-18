export type TokenExample = {
  readonly kind: 'token';
  readonly type: string;
  readonly value: string;
};

export type FieldExample = {
  readonly kind: 'field';
  readonly name: string;
  readonly value: unknown;
};

export type NodeExample = {
  readonly kind: 'node';
  readonly type: string;
  readonly children: readonly ExampleStep[];
};

export type ExampleStep = TokenExample | FieldExample | NodeExample;

export type ParserExample = {
  readonly input: string;
  readonly steps: readonly ExampleStep[];
};

export type PatternAlternative = {
  readonly pattern: string;
  readonly steps: readonly ExampleStep[];
};

export type PatternRule = {
  readonly name: string;
  readonly alternatives: readonly PatternAlternative[];
};

export type GrammarExpr =
  | { readonly kind: 'ref'; readonly name: string }
  | { readonly kind: 'token'; readonly type: string }
  | { readonly kind: 'literal'; readonly value: unknown }
  | { readonly kind: 'seq'; readonly items: readonly GrammarExpr[] }
  | { readonly kind: 'choice'; readonly options: readonly GrammarExpr[] }
  | { readonly kind: 'repeat'; readonly item: GrammarExpr; readonly separator?: GrammarExpr };

export type GrammarRule = {
  readonly name: string;
  readonly expr: GrammarExpr;
};

export type GrammarSchema = {
  readonly root: string;
  readonly rules: readonly GrammarRule[];
};

export type StandardSchema = {
  readonly name: string;
  readonly version?: string;
  readonly url: string;
  readonly conformanceSuite?: string;
};

export type CodegenInput = {
  readonly name: string;
  readonly tokens: readonly string[];
  readonly nodes: readonly string[];
  readonly fields: readonly string[];
  readonly examples: number;
  readonly grammar?: GrammarSchema;
  readonly standard?: StandardSchema;
};

export type ParserSchema = {
  readonly name: string;
  readonly examples: readonly ParserExample[];
  readonly rules?: readonly PatternRule[];
  readonly standard?: StandardSchema;
};

export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type AstNode = {
  readonly type: string;
  readonly [field: string]: unknown;
};

export interface ParserApi<TNode = AstNode> {
  parse(input: string): TNode;
  tokenize(input: string): Token[];
  stringify(ast: TNode): string;
}

export class NodeBuilder {
  readonly steps: ExampleStep[] = [];

  field(name: string, value: unknown): this {
    this.steps.push({ kind: 'field', name, value });
    return this;
  }

  node(type: string, build?: (node: NodeBuilder) => NodeBuilder): this {
    const child = new NodeBuilder();
    this.steps.push({ kind: 'node', type, children: build ? build(child).steps : child.steps });
    return this;
  }
}

export class ExampleBuilder extends NodeBuilder {
  constructor(readonly input: string) {
    super();
  }

  token(type: string, value: string): this {
    this.steps.push({ kind: 'token', type, value });
    return this;
  }

  build(): ParserExample {
    return { input: this.input, steps: this.steps };
  }
}

export class PatternRuleBuilder {
  readonly alternatives: PatternAlternative[] = [];

  constructor(readonly name: string) {}

  from(pattern: string): PatternAlternativeBuilder {
    return new PatternAlternativeBuilder(this, pattern);
  }
}

export class PatternAlternativeBuilder {
  readonly steps: ExampleStep[] = [];

  constructor(
    private readonly rule: PatternRuleBuilder,
    readonly pattern: string,
  ) {}

  field(name: string, value: unknown): PatternRuleBuilder {
    this.steps.push({ kind: 'field', name, value });
    return this.commit();
  }

  node(type: string, build?: (node: NodeBuilder) => NodeBuilder): PatternRuleBuilder {
    const child = new NodeBuilder();
    this.steps.push({ kind: 'node', type, children: build ? build(child).steps : child.steps });
    return this.commit();
  }

  token(type: string, value: string): PatternRuleBuilder {
    this.steps.push({ kind: 'token', type, value });
    return this.commit();
  }

  private commit(): PatternRuleBuilder {
    this.rule.alternatives.push({ pattern: this.pattern, steps: this.steps });
    return this.rule;
  }
}

export type ExampleFactory = {
  (input: string): ExampleBuilder;
  rule(name: string): PatternRuleBuilder;
};

export const ex: ExampleFactory = Object.assign(
  (input: string) => new ExampleBuilder(input),
  { rule: (name: string) => new PatternRuleBuilder(name) },
);

export function defineSchema(schema: ParserSchema): ParserSchema {
  return schema;
}
