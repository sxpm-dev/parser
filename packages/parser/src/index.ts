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
  readonly structure?: unknown;
  readonly invalid?: InvalidExample;
  readonly recovery?: RecoveryExample;
};

export type InvalidExample = {
  readonly reason: string;
};

export type RecoveryAction = 'drop' | 'close' | 'throw';

export type RecoveryExample = {
  readonly context?: string;
  readonly on?: string;
  readonly skipUntil?: readonly string[];
  readonly action: RecoveryAction;
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

export type CodegenInput = {
  readonly name: string;
  readonly tokens: readonly string[];
  readonly nodes: readonly string[];
  readonly fields: readonly string[];
  readonly examples: number;
  readonly structure: InferredStructure;
  /** @deprecated Use structure. */
  readonly ast: InferredAst;
  readonly recoveries: readonly InferredRecovery[];
  readonly grammar?: GrammarSchema;
  readonly runtime?: RuntimeSchema;
};

export type InferredStructure = {
  readonly rootType: string;
  readonly rootAlias: string;
  readonly nodeUnionAlias: string;
  readonly nodes: readonly InferredStructureNode[];
  readonly typeSource: string;
  readonly exampleOutputs: readonly unknown[];
};

/** @deprecated Use InferredStructure. */
export type InferredAst = InferredStructure;

export type InferredStructureNode = {
  readonly type: string;
  readonly alias: string;
  readonly isRoot: boolean;
  readonly fields: readonly InferredStructureField[];
  readonly nodesField?: InferredStructureNodesField;
};

/** @deprecated Use InferredStructureNode. */
export type InferredAstNode = InferredStructureNode;

export type InferredStructureNodesField = {
  readonly optional: boolean;
};

/** @deprecated Use InferredStructureNodesField. */
export type InferredAstNodesField = InferredStructureNodesField;

export type InferredStructureField = {
  readonly name: string;
  readonly typeSource: string;
  readonly optional: boolean;
};

/** @deprecated Use InferredStructureField. */
export type InferredAstField = InferredStructureField;

export type InferredRecovery = {
  readonly input: string;
  readonly reason: string;
  readonly context?: string;
  readonly on?: string;
  readonly skipUntil: readonly string[];
  readonly action: RecoveryAction;
};

export type ParserSchema = {
  readonly name: string;
  readonly examples: readonly ParserExample[];
  readonly rules?: readonly PatternRule[];
  readonly runtime?: RuntimeSchema;
};

export type RuntimeSchema = {
  readonly tokenize?: RuntimeTokenizer;
  readonly parse?: RuntimeParser;
  readonly stringify?: RuntimeStringify;
};

export type RuntimeTokenizer = RuntimeStandardTokenizer | RuntimeBlockStyleTokenizer | RuntimeStatementListTokenizer;

export type RuntimeStandardTokenizer = {
  readonly kind: 'standard';
  readonly whitespace?: RuntimeWhitespaceToken;
  readonly string?: RuntimeStringToken;
  readonly number?: RuntimeNumberToken;
  readonly keywords?: readonly RuntimeKeywordToken[];
  readonly punctuators?: readonly RuntimePunctuatorToken[];
};

export type RuntimeBlockStyleTokenizer = {
  readonly kind: 'block-style';
};

export type RuntimeStatementListTokenizer = {
  readonly kind: 'statement-list';
  readonly keywords: readonly string[];
};

export type RuntimeWhitespaceToken = {
  readonly token: string;
  readonly emit: boolean;
  readonly chars: string;
};

export type RuntimeStringToken = {
  readonly token: string;
  readonly quote: string;
  readonly escapes: boolean;
  readonly unicodeEscape?: RuntimeUnicodeEscape;
};

export type RuntimeUnicodeEscape = {
  readonly prefix: string;
  readonly digits: number;
};

export type RuntimeNumberToken = {
  readonly token: string;
  readonly minus: boolean;
  readonly fraction: boolean;
  readonly exponent: boolean;
  readonly leadingZero: 'reject' | 'allow';
};

export type RuntimeKeywordToken = {
  readonly token: string;
  readonly text: string;
  readonly value?: unknown;
};

export type RuntimePunctuatorToken = {
  readonly token: string;
  readonly text: string;
};

export type RuntimeParser = RuntimeValueDocumentParser | RuntimeBlockStyleParser | RuntimeStatementListParser;

export type RuntimeValueDocumentParser = {
  readonly kind: 'value-document';
  readonly engine?: 'generated' | 'native-json';
  readonly documentType: string;
  readonly valueField: string;
  readonly object: {
    readonly open: string;
    readonly close: string;
    readonly keyToken: string;
    readonly pairSeparator: string;
    readonly separator: string;
  };
  readonly array: {
    readonly open: string;
    readonly close: string;
    readonly separator: string;
  };
  readonly stringToken: string;
  readonly numberToken: string;
  readonly primitiveTokens: readonly RuntimeKeywordToken[];
  readonly parseTree?: boolean;
};

export type RuntimeBlockStyleParser = {
  readonly kind: 'block-style';
};

export type RuntimeStatementListParser = {
  readonly kind: 'statement-list';
  readonly programAlias: string;
  readonly statementAlias: string;
  readonly sourceTypeField: string;
  readonly bodyField: string;
  readonly moduleSourceType: string;
  readonly scriptSourceType: string;
  readonly scriptIfStatementType: string;
  readonly statements: readonly RuntimeStatementRule[];
  readonly blockStartKeywords: readonly string[];
  readonly noLineTerminatorAfter?: readonly string[];
  readonly numberLiteral?: RuntimeNumberLiteralRule;
};

export type RuntimeStatementRule = {
  readonly type: string;
  readonly startsWith: readonly string[];
};

export type RuntimeNumberLiteralRule = {
  readonly separator?: string;
  readonly bigintSuffix?: string;
  readonly rejectIdentifierAfter?: boolean;
  readonly prefixes?: readonly RuntimeNumberRadixPrefix[];
};

export type RuntimeNumberRadixPrefix = {
  readonly prefixes: readonly string[];
  readonly digits: string;
};

export type RuntimeStringify = RuntimeNativeJsonStringify | RuntimeBlockStyleStringify | RuntimeStatementListStringify;

export type RuntimeNativeJsonStringify = {
  readonly kind: 'native-json';
  readonly valueField: string;
};

export type RuntimeBlockStyleStringify = {
  readonly kind: 'block-style';
};

export type RuntimeStatementListStringify = {
  readonly kind: 'statement-list';
  readonly bodyField: string;
};

export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type StructureNode = {
  readonly type: string;
  readonly [field: string]: unknown;
};

/** @deprecated Use StructureNode. */
export type AstNode = StructureNode;

export interface ParserApi<TStructure = StructureNode> {
  parse(input: string): TStructure;
  tokenize(input: string): Token[];
  stringify(structure: TStructure): string;
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
  private invalidExample?: InvalidExample;
  private recoveryExample?: RecoveryExample;
  private structureExample?: unknown;

  constructor(readonly input: string) {
    super();
  }

  token(type: string, value: string): this {
    this.steps.push({ kind: 'token', type, value });
    return this;
  }

  invalid(reason: string): this {
    this.invalidExample = { reason };
    return this;
  }

  recover(build: (recovery: RecoveryBuilder) => RecoveryBuilder): this {
    this.recoveryExample = build(new RecoveryBuilder()).build();
    return this;
  }

  structure(value: unknown): this {
    this.structureExample = value;
    return this;
  }

  build(): ParserExample {
    return {
      input: this.input,
      steps: this.steps,
      structure: this.structureExample,
      invalid: this.invalidExample,
      recovery: this.recoveryExample,
    };
  }
}

export class RecoveryBuilder {
  private context?: string;
  private trigger?: string;
  private boundaries: string[] = [];
  private recoveryAction: RecoveryAction = 'drop';

  at(context: string): this {
    this.context = context;
    return this;
  }

  onFail(): this {
    this.trigger = 'fail';
    return this;
  }

  onUnexpected(token: string): this {
    this.trigger = `unexpected:${token}`;
    return this;
  }

  skipUntil(...tokens: string[]): this {
    this.boundaries = tokens;
    return this;
  }

  drop(): this {
    this.recoveryAction = 'drop';
    return this;
  }

  close(): this {
    this.recoveryAction = 'close';
    return this;
  }

  throw(): this {
    this.recoveryAction = 'throw';
    return this;
  }

  build(): RecoveryExample {
    return {
      context: this.context,
      on: this.trigger,
      skipUntil: this.boundaries,
      action: this.recoveryAction,
    };
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
