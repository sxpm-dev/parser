import type {
  ExampleDef,
  ExampleStatus,
  RecoveryPolicy,
  Refinement,
  SpanClass,
  SpanDef,
  SpanModifier,
  StructureValue,
  TrailingPolicy,
} from './types.ts';

// Builders mutate their internal state. The data they produce (ExampleDef,
// SpanDef) is consumed as immutable by the compiler.

type MutableSpanDef = {
  name?: string;
  text?: string;
  recursiveRoles: string[];
  class: SpanClass;
  refinements: Refinement[];
  modifiers: SpanModifier[];
};

class SpanBuilder {
  private readonly def: MutableSpanDef;

  constructor(
    private readonly parent: ExampleBuilder,
    name: string | undefined,
    text: string | undefined,
    recursiveRoles: ReadonlyArray<string>,
  ) {
    this.def = {
      name,
      text,
      recursiveRoles: [...recursiveRoles],
      class: 'literal',
      refinements: [],
      modifiers: [],
    };
    parent._registerSpan(this.def);
  }

  // --- Classes -----------------------------------------------------------

  private setClass(cls: SpanClass): this {
    this.def.class = cls;
    return this;
  }

  literal(): this { return this.setClass('literal'); }
  ident(): this { return this.setClass('ident'); }
  number(): this { return this.setClass('number'); }
  string(): this { return this.setClass('string'); }
  hex(): this { return this.setClass('hex'); }
  regex(): this { return this.setClass('regex'); }
  template(): this { return this.setClass('template'); }
  comment(): this { return this.setClass('comment'); }
  whitespace(): this { return this.setClass('whitespace'); }
  keyword(text: string): this {
    this.def.class = 'keyword';
    if (this.def.text === undefined) this.def.text = text;
    return this;
  }
  operator(alts?: ReadonlyArray<string>): this {
    this.def.class = 'operator';
    if (alts) this.refine('alts', [alts]);
    return this;
  }

  // --- Refinements -------------------------------------------------------

  private refine(name: string, args?: ReadonlyArray<unknown>): this {
    const next: Refinement = args === undefined ? { name } : { name, args };
    this.def.refinements.push(next);
    return this;
  }

  // number refinements
  int(): this { return this.refine('int'); }
  float(): this { return this.refine('float'); }
  bigint(): this { return this.refine('bigint'); }
  binary(): this { return this.refine('binary'); }
  octal(): this { return this.refine('octal'); }
  scientific(): this { return this.refine('scientific'); }
  separator(ch: string): this { return this.refine('separator', [ch]); }
  // string refinements
  singleQuoted(): this { return this.refine('singleQuoted'); }
  doubleQuoted(): this { return this.refine('doubleQuoted'); }
  backtick(): this { return this.refine('backtick'); }
  hexString(): this { return this.refine('hexString'); }
  urlString(): this { return this.refine('urlString'); }
  // ident refinements
  css(): this { return this.refine('css'); }
  js(): this { return this.refine('js'); }
  // comment refinements
  line(marker: string): this { return this.refine('line', [marker]); }
  block(open: string, close: string): this { return this.refine('block', [open, close]); }

  // --- Modifiers ---------------------------------------------------------

  private addModifier(mod: SpanModifier): this {
    this.def.modifiers.push(mod);
    return this;
  }

  optional(): this {
    return this.addModifier({ kind: 'optional' });
  }

  repeats(opts: {
    readonly sep?: string;
    readonly trailing?: TrailingPolicy;
    readonly min?: number;
    readonly max?: number;
  } = {}): this {
    return this.addModifier({
      kind: 'repeats',
      sep: opts.sep,
      trailing: opts.trailing,
      min: opts.min,
      max: opts.max,
    });
  }

  until(
    stops: string | ReadonlyArray<string>,
    opts: {
      readonly balanced?: boolean;
      readonly trim?: boolean;
      readonly rejectSuffix?: string;
    } = {},
  ): this {
    const stopArr = Array.isArray(stops) ? [...stops] : [stops as string];
    return this.addModifier({
      kind: 'until',
      stops: stopArr,
      balanced: opts.balanced ?? true,
      trim: opts.trim ?? true,
      rejectSuffix: opts.rejectSuffix,
    });
  }

  noLineTerminatorAfter(): this {
    return this.addModifier({ kind: 'noLineTerminatorAfter' });
  }

  noWhitespaceAfter(): this {
    return this.addModifier({ kind: 'noWhitespaceAfter' });
  }

  requireSpaceAfter(): this {
    return this.addModifier({ kind: 'requireSpaceAfter' });
  }

  // --- Continuation onto the parent chain --------------------------------
  //
  // Note: the method name `span` does not collide with any property on this
  // class, so the SpanBuilder can transparently continue chains into the
  // ExampleBuilder.

  span(...args: SpanArgs): SpanBuilder { return this.parent.span(...args); }
  as(nodeType: string): ExampleBuilder { return this.parent.as(nodeType); }
  structure(value: StructureValue): ExampleBuilder {
    return this.parent.structure(value);
  }
  recovers(policy: RecoveryPolicy): ExampleBuilder {
    return this.parent.recovers(policy);
  }
  rejects(): ExampleBuilder { return this.parent.rejects(); }
  build(): ExampleDef { return this.parent.build(); }
}

type SpanArgs =
  | []
  | [name: string]
  | [name: string, text: string]
  | [name: string, text: string, recursiveRole: string | ReadonlyArray<string>];

class ExampleBuilder {
  private nodeType: string | undefined;
  private spans: MutableSpanDef[] = [];
  private structureValue: StructureValue | undefined;
  private status: ExampleStatus = { kind: 'valid' };

  constructor(private readonly input: string) {}

  as(nodeType: string): ExampleBuilder {
    this.nodeType = nodeType;
    return this;
  }

  span(...args: SpanArgs): SpanBuilder {
    const [name, text, recursiveRoles] = normalizeSpanArgs(args);
    return new SpanBuilder(this, name, text, recursiveRoles);
  }

  _registerSpan(span: MutableSpanDef): void {
    this.spans.push(span);
  }

  structure(value: StructureValue): ExampleBuilder {
    this.structureValue = value;
    return this;
  }

  recovers(recovery: RecoveryPolicy): ExampleBuilder {
    this.status = { kind: 'recovered', recovery };
    return this;
  }

  rejects(): ExampleBuilder {
    this.status = { kind: 'rejected' };
    return this;
  }

  build(): ExampleDef {
    return {
      input: this.input,
      nodeType: this.nodeType,
      spans: this.spans as ReadonlyArray<SpanDef>,
      structure: this.structureValue,
      status: this.status,
    };
  }
}

function normalizeSpanArgs(
  args: SpanArgs,
): [string | undefined, string | undefined, ReadonlyArray<string>] {
  // Calling shapes:
  //   .span(text)                                       unnamed literal
  //   .span(name, text)                                 named literal/classed
  //   .span(name, text, role)                           named recursive (single)
  //   .span(name, text, [role1, role2, ...])            named recursive (multi)
  if (args.length === 0) return [undefined, undefined, []];
  if (args.length === 1) return [undefined, args[0], []];
  if (args.length === 2) return [args[0], args[1], []];
  const third = args[2];
  const roles = typeof third === 'string' ? [third] : [...third];
  return [args[0], args[1], roles];
}

export function ex(input: string): ExampleBuilder {
  return new ExampleBuilder(input);
}

export type { ExampleBuilder, SpanBuilder };
