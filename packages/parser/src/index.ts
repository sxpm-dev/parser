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

export type CodegenInput = {
  readonly name: string;
  readonly tokens: readonly string[];
  readonly nodes: readonly string[];
  readonly fields: readonly string[];
  readonly examples: number;
};

export type ParserSchema = {
  readonly name: string;
  readonly examples: readonly ParserExample[];
  readonly generate: (input: CodegenInput) => string;
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

export function ex(input: string): ExampleBuilder {
  return new ExampleBuilder(input);
}

export function defineSchema(schema: ParserSchema): ParserSchema {
  return schema;
}
