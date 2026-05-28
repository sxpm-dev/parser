import type {
  ExampleDef,
  ExampleStatus,
  Refinement,
  RenderBody,
  RenderTargetDef,
  SpanClass,
  SpanDef,
  SpanModifier,
  Template,
  TrailingPolicy,
} from './types.ts';

// ---------- Immutable span node -------------------------------------------

type SpanData = {
  readonly name?: string;
  readonly text?: string;
  readonly recursiveRoles: ReadonlyArray<string>;
  readonly class: SpanClass;
  readonly refinements: ReadonlyArray<Refinement>;
  readonly modifiers: ReadonlyArray<SpanModifier>;
};

export class SpanNode {
  constructor(private readonly data: SpanData) {}

  private withData(patch: Partial<SpanData>): SpanNode {
    return new SpanNode({ ...this.data, ...patch });
  }

  private setClass(cls: SpanClass): SpanNode {
    return this.withData({ class: cls });
  }

  // Classes
  literal(): SpanNode { return this.setClass('literal'); }
  ident(): SpanNode { return this.setClass('ident'); }
  number(): SpanNode { return this.setClass('number'); }
  string(): SpanNode { return this.setClass('string'); }
  hex(): SpanNode { return this.setClass('hex'); }
  regex(): SpanNode { return this.setClass('regex'); }
  template(): SpanNode { return this.setClass('template'); }
  comment(): SpanNode { return this.setClass('comment'); }
  whitespace(): SpanNode { return this.setClass('whitespace'); }
  keyword(text: string): SpanNode {
    return this.withData({
      class: 'keyword',
      text: this.data.text === undefined ? text : this.data.text,
    });
  }
  operator(alts?: ReadonlyArray<string>): SpanNode {
    const next = this.withData({ class: 'operator' });
    return alts ? next.refine('alts', [alts]) : next;
  }

  // Refinements (additive)
  private refine(name: string, args?: ReadonlyArray<unknown>): SpanNode {
    const next: Refinement = args === undefined ? { name } : { name, args };
    return this.withData({ refinements: [...this.data.refinements, next] });
  }
  int(): SpanNode { return this.refine('int'); }
  float(): SpanNode { return this.refine('float'); }
  bigint(): SpanNode { return this.refine('bigint'); }
  binary(): SpanNode { return this.refine('binary'); }
  octal(): SpanNode { return this.refine('octal'); }
  scientific(): SpanNode { return this.refine('scientific'); }
  separator(ch: string): SpanNode { return this.refine('separator', [ch]); }
  singleQuoted(): SpanNode { return this.refine('singleQuoted'); }
  doubleQuoted(): SpanNode { return this.refine('doubleQuoted'); }
  backtick(): SpanNode { return this.refine('backtick'); }
  hexString(): SpanNode { return this.refine('hexString'); }
  lengths(values: ReadonlyArray<number>): SpanNode { return this.refine('lengths', [values]); }
  urlString(): SpanNode { return this.refine('urlString'); }
  css(): SpanNode { return this.refine('css'); }
  js(): SpanNode { return this.refine('js'); }
  html(): SpanNode { return this.refine('html'); }
  oneOf(values: ReadonlyArray<string>): SpanNode { return this.refine('oneOf', [values]); }
  line(marker: string): SpanNode { return this.refine('line', [marker]); }
  block(open: string, close: string): SpanNode { return this.refine('block', [open, close]); }

  // Modifiers (additive)
  private addModifier(mod: SpanModifier): SpanNode {
    return this.withData({ modifiers: [...this.data.modifiers, mod] });
  }
  optional(): SpanNode {
    return this.addModifier({ kind: 'optional' });
  }
  repeats(opts: {
    readonly sep?: string;
    readonly trailing?: TrailingPolicy;
    readonly min?: number;
    readonly max?: number;
    readonly stopBefore?: ReadonlyArray<string>;
  } = {}): SpanNode {
    return this.addModifier({
      kind: 'repeats',
      sep: opts.sep,
      trailing: opts.trailing,
      min: opts.min,
      max: opts.max,
      stopBefore: opts.stopBefore ? [...opts.stopBefore] : undefined,
    });
  }
  until(
    stops: string | ReadonlyArray<string>,
    opts: {
      readonly balanced?: boolean;
      readonly trim?: boolean;
      readonly rejectSuffix?: string | ReadonlyArray<string>;
      readonly nonEmpty?: boolean;
      readonly requireStop?: boolean;
    } = {},
  ): SpanNode {
    const stopArr = Array.isArray(stops) ? [...stops] : [stops as string];
    const rs = opts.rejectSuffix;
    const rejectSuffix =
      rs === undefined ? undefined : typeof rs === 'string' ? [rs] : [...rs];
    const nonEmpty = opts.nonEmpty ?? false;
    const requireStop = opts.requireStop ?? false;
    return this.addModifier({
      kind: 'until',
      stops: stopArr,
      balanced: opts.balanced ?? true,
      trim: opts.trim ?? true,
      ...(rejectSuffix ? { rejectSuffix } : {}),
      ...(nonEmpty ? { nonEmpty: true } : {}),
      ...(requireStop ? { requireStop: true } : {}),
    });
  }
  rawUntil(
    stops: string | ReadonlyArray<string>,
    opts: {
      readonly caseInsensitive?: boolean;
      readonly requireStop?: boolean;
      readonly nonEmpty?: boolean;
    } = {},
  ): SpanNode {
    const stopArr = Array.isArray(stops) ? [...stops] : [stops as string];
    const requireStop = opts.requireStop ?? false;
    const nonEmpty = opts.nonEmpty ?? false;
    return this.addModifier({
      kind: 'rawUntil',
      stops: stopArr,
      caseInsensitive: opts.caseInsensitive ?? false,
      ...(requireStop ? { requireStop: true } : {}),
      ...(nonEmpty ? { nonEmpty: true } : {}),
    });
  }
  noLineTerminatorAfter(): SpanNode {
    return this.addModifier({ kind: 'noLineTerminatorAfter' });
  }
  noWhitespaceAfter(): SpanNode {
    return this.addModifier({ kind: 'noWhitespaceAfter' });
  }
  requireSpaceAfter(): SpanNode {
    return this.addModifier({ kind: 'requireSpaceAfter' });
  }
  indent(): SpanNode {
    return this.addModifier({ kind: 'indent' });
  }
  of(...roles: ReadonlyArray<string>): SpanNode {
    return this.withData({
      recursiveRoles: [...this.data.recursiveRoles, ...roles],
    });
  }

  toSpanDef(): SpanDef {
    return {
      name: this.data.name,
      text: this.data.text,
      recursiveRoles: this.data.recursiveRoles,
      class: this.data.class,
      refinements: this.data.refinements,
      modifiers: this.data.modifiers,
    } as SpanDef;
  }

  static validateInputAgainstProgram(
    nodeType: string,
    input: string,
    items: ReadonlyArray<SpanNode>,
  ): void {
    let cursor = 0;
    for (const item of items) {
      const text = item.data.text;
      if (text === undefined || text === '') continue;
      // Skip optional spans entirely — their text need not appear in the input.
      if (item.data.modifiers.some((m) => m.kind === 'optional')) continue;
      // Skip any leading whitespace at cursor (standard policy: inter-span
      // whitespace is optional), UNLESS the span's own example text starts
      // with whitespace (e.g. a whitespace-class span, or a span like
      // ' hello ' whose leading space is meaningful to its .until() capture).
      if (!/^\s/.test(text)) {
        while (cursor < input.length && /\s/.test(input[cursor]!)) cursor++;
      }
      let idx = input.indexOf(text, cursor);
      if (idx < 0) {
        // Fallback: Unicode-normalization mismatch. Schemas using
        // unicode: 'NFC' or 'NFD' often write inputs in one form and span
        // example texts in another (or vice-versa). The runtime preamble
        // normalizes before parsing, so the strict byte-comparison here
        // produces false positives. Try the NFC-equivalent before failing.
        const nfcIdx = input.normalize('NFC').indexOf(text.normalize('NFC'), cursor);
        if (nfcIdx < 0) {
          const label =
            item.data.name === undefined
              ? `literal '${text}'`
              : `span '${item.data.name}' example '${text}'`;
          throw new Error(
            `relation('${nodeType}'): ${label} not found in input starting at offset ${cursor}`,
          );
        }
        idx = nfcIdx;
      }
      // idx may be > cursor when the gap is covered by a previous .until(...) span;
      // the compiler's IR-layer validation is the final word on ordering.
      cursor = idx + text.length;
    }
  }
}

// ---------- Type brands (compile-time only) --------------------------------

// A Literal is a SpanNode created via literal(text) — unnamed, text set.
// The __literal brand is type-only (no runtime cost).
export type Literal = SpanNode & { readonly __literal: true };

// A Span is a named SpanNode created via span(name, text?).
export type Span = SpanNode;

// ---------- Parse program ---------------------------------------------------

export type ParseProgram = { readonly __parse: true; readonly items: ReadonlyArray<SpanNode> };

// ---------- Invertible encoding ---------------------------------------------

export type InvertibleEncoding = {
  readonly __invertible: true;
  readonly body: Template | object;
  readonly inverse: Template;
};

export function withInverse(body: Template | object, inverse: Template): InvertibleEncoding {
  return { __invertible: true, body, inverse };
}

function isInvertibleEncoding(v: unknown): v is InvertibleEncoding {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { __invertible?: unknown }).__invertible === true
  );
}

function isParseProgram(v: unknown): v is ParseProgram {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { __parse?: unknown }).__parse === true &&
    Array.isArray((v as { items?: unknown }).items)
  );
}

// ---------- RelationBody ----------------------------------------------------

export type RelationBody = {
  readonly input: string;
  readonly encodings: Readonly<Record<string, unknown>>;
  readonly status?: ExampleStatus;
};

// ---------- DSL factory functions ------------------------------------------

export function span(name: string, exampleText?: string): SpanNode {
  return new SpanNode({
    name,
    text: exampleText,
    recursiveRoles: [],
    class: 'literal',
    refinements: [],
    modifiers: [],
  });
}

export function literal(text: string): Literal {
  return new SpanNode({
    name: undefined,
    text,
    recursiveRoles: [],
    class: 'literal',
    refinements: [],
    modifiers: [],
  }) as Literal;
}

export function parse(items: ReadonlyArray<Span | Literal>): ParseProgram {
  return { __parse: true, items };
}

export function relation(nodeType: string, body: RelationBody): ExampleDef {
  let parseProgram: ParseProgram | undefined;
  const renders: RenderTargetDef[] = [];

  for (const [target, value] of Object.entries(body.encodings)) {
    if (isParseProgram(value)) {
      if (parseProgram !== undefined) {
        throw new Error(`relation '${nodeType}': multiple parse-program encodings`);
      }
      parseProgram = value;
      continue;
    }
    if (isInvertibleEncoding(value)) {
      renders.push({ target, body: value.body as RenderBody, inverse: value.inverse });
      continue;
    }
    renders.push({ target, body: value as RenderBody });
  }

  if (parseProgram === undefined) {
    throw new Error(`relation '${nodeType}': missing parse-program encoding`);
  }

  SpanNode.validateInputAgainstProgram(nodeType, body.input, parseProgram.items);

  const status: ExampleStatus = body.status ?? { kind: 'valid' };

  return {
    input: body.input,
    nodeType,
    spans: parseProgram.items.map((s) => s.toSpanDef()),
    status,
    renders,
  };
}
