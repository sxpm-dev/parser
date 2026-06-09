import type {
  ExampleDef,
  ExampleStatus,
  Refinement,
  RenderBody,
  RenderTargetDef,
  SpanClass,
  SpanDef,
  SpanModifier,
  SpanValueRef,
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
  coerce(): SpanNode { return this.refine('coerce'); }
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

// Phase 7 sugar: a multi-production node-type whose every production is just
// a literal token. The common shape — `relation(NodeType, { input: 'X',
// encodings: { parse: parse([literal('X')]), ast: 'X', source: tpl`X` } })`
// repeated N times — collapses to one call:
//
//   ...litEnum('Weekday', ['SU','MO','TU','WE','TH','FR','SA'])
//
// Default targets are 'ast' (scalar literal) and 'source' (Template body).
// Custom target sets are supplied via `options.targets`; bodies are derived
// the same way (scalar for `'ast'`, Template for everything else). This is
// pure desugaring — the returned array is byte-equivalent to writing each
// `relation(...)` call by hand.
export function litEnum(
  nodeType: string,
  literals: ReadonlyArray<string>,
  options: { readonly targets?: ReadonlyArray<string> } = {},
): ReadonlyArray<ExampleDef> {
  const targets = options.targets ?? ['ast', 'source'];
  return literals.map((lit) => {
    const encodings: Record<string, unknown> = {
      parse: parse([literal(lit)]),
    };
    for (const target of targets) {
      encodings[target] = target === 'ast' ? lit : asTemplate(lit);
    }
    return relation(nodeType, { input: lit, encodings });
  });
}

// Build a Template with no slots — equivalent to `tpl\`<text>\`` but
// callable from non-template-literal contexts. Keeps the closed Template
// shape (`__tpl: true`, `parts`, `slots`) the codegen walks.
function asTemplate(text: string): Template {
  return { __tpl: true, parts: [text], slots: [] };
}

// Phase 7 sugar: a production of shape `KEY<sep>value`, where `value` is a
// captured span and the AST is a tagged single-field object. Collapses the
// common shape:
//
//   relation('Part', {
//     input: 'FREQ=DAILY',
//     encodings: {
//       parse: parse([literal('FREQ'), literal('='), span('value', 'DAILY').of('FreqValue')]),
//       ast: { type: 'freq', value: $.value },
//       source: tpl`FREQ=${$.value}`,
//     },
//   })
//
// to one call:
//
//   keyword('Part', 'FREQ', '=', span('value', 'DAILY').of('FreqValue'), 'freq')
//
// The valueSpan carries the AST field name (via its `name`) and the example
// text (via its `text`). Modifiers on the valueSpan (`.of(...)`, `.repeats()`,
// `.number().int()`, etc.) are passed through unchanged — the helper is a
// shape-only desugaring with no runtime behavior of its own.
//
// Default targets are 'ast' (`{ type: astType, [field]: $.<field> }`) and
// 'source' (`tpl`${key}${sep}${$.<field>}``). Custom target sets are not
// supported here — write a hand-rolled `relation()` if you need them.
export function keyword(
  nodeType: string,
  key: string,
  sep: string,
  valueSpan: SpanNode,
  astType: string,
): ExampleDef {
  const def = valueSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `keyword('${nodeType}', '${key}'): valueSpan must be a named span (use span('<field>', '<example>'))`,
    );
  }
  if (def.text === undefined) {
    throw new Error(
      `keyword('${nodeType}', '${key}'): valueSpan must have an example text`,
    );
  }
  const fieldName = def.name;
  const valueRef: SpanValueRef = { __ref: 'span-value', name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [key + sep, ''],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input: key + sep + def.text,
    encodings: {
      parse: parse([literal(key), literal(sep), valueSpan]),
      ast: { type: astType, [fieldName]: valueRef },
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production of shape `value<suffix>`, where `value` is a
// captured span followed by a fixed literal terminator. Collapses the
// common iso-duration / time-unit shape:
//
//   relation('DateUnit', {
//     input: '1Y',
//     encodings: {
//       parse: parse([span('value', '1').number().int(), literal('Y')]),
//       ast: { type: 'years', value: $.value },
//       source: tpl`${$.value}Y`,
//     },
//   })
//
// to one call:
//
//   suffixed('DateUnit', span('value', '1').number().int(), 'Y', 'years')
//
// Same authoring contract as keyword(): the valueSpan carries the AST
// field name (via `.name`) and example text (via `.text`); modifiers on
// the span pass through unchanged.
export function suffixed(
  nodeType: string,
  valueSpan: SpanNode,
  suffix: string,
  astType: string,
): ExampleDef {
  const def = valueSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `suffixed('${nodeType}', ..., '${suffix}'): valueSpan must be a named span (use span('<field>', '<example>'))`,
    );
  }
  if (def.text === undefined) {
    throw new Error(
      `suffixed('${nodeType}', ..., '${suffix}'): valueSpan must have an example text`,
    );
  }
  const fieldName = def.name;
  const valueRef: SpanValueRef = { __ref: 'span-value', name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: ['', suffix],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input: def.text + suffix,
    encodings: {
      parse: parse([valueSpan, literal(suffix)]),
      ast: { type: astType, [fieldName]: valueRef },
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production of shape `<prefix>value`, where `value` is a
// captured span preceded by a fixed literal head. Mirror of suffixed().
// Collapses the yaml-block sequence-item pattern:
//
//   relation('YamlSequenceItem', {
//     input: '- foo',
//     encodings: {
//       parse: parse([literal('- '), span('value', 'foo').of('YamlNode')]),
//       ast: { type: 'item', value: $.value },
//       source: tpl`- ${$.value}`,
//     },
//   })
//
// to one call:
//
//   prefixed('YamlSequenceItem', '- ', span('value', 'foo').of('YamlNode'), 'item')
//
// Same authoring contract as suffixed(): the valueSpan carries the AST
// field name (via `.name`) and example text (via `.text`); modifiers on
// the span pass through unchanged.
export function prefixed(
  nodeType: string,
  prefix: string,
  valueSpan: SpanNode,
  astType: string,
  options: { readonly input?: string } = {},
): ExampleDef {
  const def = valueSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `prefixed('${nodeType}', '${prefix}', ...): valueSpan must be a named span (use span('<field>', '<example>'))`,
    );
  }
  const exampleText = options.input !== undefined
    ? options.input.startsWith(prefix)
      ? options.input.slice(prefix.length)
      : def.text
    : def.text;
  if (exampleText === undefined) {
    throw new Error(
      `prefixed('${nodeType}', '${prefix}', ...): valueSpan must have an example text or options.input must be provided`,
    );
  }
  const fieldName = def.name;
  const valueRef: SpanValueRef = { __ref: 'span-value', name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [prefix, ''],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input: prefix + exampleText,
    encodings: {
      parse: parse([literal(prefix), valueSpan]),
      ast: { type: astType, [fieldName]: valueRef },
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production wrapping a single captured span in a
// type-tagged single-field object. Collapses the toml / cron Value
// pattern:
//
//   relation('Value', {
//     input: '"hello"',
//     encodings: {
//       parse: parse([span('value', '"hello"').string().doubleQuoted()]),
//       ast: { type: 'string', value: $.value },
//       source: tpl`${$.value}`,
//     },
//   })
//
// to one call:
//
//   valueTagged('Value', span('value', '"hello"').string().doubleQuoted(), 'string')
//
// The valueSpan carries the AST field name (via `.name`) and example
// text (via `.text`); modifiers pass through unchanged.
export function valueTagged(
  nodeType: string,
  valueSpan: SpanNode,
  astType: string,
  options: { readonly input?: string } = {},
): ExampleDef {
  const def = valueSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `valueTagged('${nodeType}'): valueSpan must be a named span (use span('<field>', '<example>'))`,
    );
  }
  const input = options.input ?? def.text;
  if (input === undefined) {
    throw new Error(
      `valueTagged('${nodeType}'): valueSpan must have an example text or options.input must be provided`,
    );
  }
  const fieldName = def.name;
  const valueRef: SpanValueRef = { __ref: 'span-value', name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: ['', ''],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input,
    encodings: {
      parse: parse([valueSpan]),
      ast: { type: astType, [fieldName]: valueRef },
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production that captures a single span and emits the
// capture as the AST verbatim (no type tag). Collapses the rrule
// NumValue / cron CommandWord pattern:
//
//   relation('NumValue', {
//     input: '6',
//     encodings: {
//       parse: parse([span('n', '6').number().int()]),
//       ast: $.n,
//       source: tpl`${$.n}`,
//     },
//   })
//
// to one call:
//
//   passthrough('NumValue', span('n', '6').number().int())
//
// Same authoring contract — valueSpan carries name + example text;
// modifiers pass through unchanged.
export function passthrough(
  nodeType: string,
  valueSpan: SpanNode,
  options: { readonly input?: string } = {},
): ExampleDef {
  const def = valueSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `passthrough('${nodeType}'): valueSpan must be a named span (use span('<field>', '<example>'))`,
    );
  }
  const input = options.input ?? def.text;
  if (input === undefined) {
    throw new Error(
      `passthrough('${nodeType}'): valueSpan must have an example text or options.input must be provided`,
    );
  }
  const fieldName = def.name;
  const valueRef: SpanValueRef = { __ref: 'span-value', name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: ['', ''],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input,
    encodings: {
      parse: parse([valueSpan]),
      ast: valueRef,
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production that's a single literal token mapped to a
// hardcoded AST shape (no captured values). Collapses the cron '*'
// wildcard / toml 'true'/'false' boolean pattern:
//
//   relation('CronField', {
//     input: '*',
//     encodings: {
//       parse: parse([literal('*')]),
//       ast: { type: 'wildcard' },
//       source: tpl`*`,
//     },
//   })
//
// to one call:
//
//   litTagged('CronField', '*', { type: 'wildcard' })
//
// The `ast` argument is any RenderBody — literal scalar, object, array,
// $.name ref, etc. The source template is the literal text verbatim
// (no slots).
export function litTagged(
  nodeType: string,
  lit: string,
  ast: RenderBody,
): ExampleDef {
  return relation(nodeType, {
    input: lit,
    encodings: {
      parse: parse([literal(lit)]),
      ast,
      source: asTemplate(lit),
    },
  });
}

// Phase 7 sugar: `<prefix>span1<sep>span2` — a prefixed range. Collapses
// the iso-duration date+time pattern:
//
//   relation('Duration', {
//     input: 'P1DT1H',
//     encodings: {
//       parse: parse([
//         literal('P'),
//         span('date', '1D').of('DateUnit').repeats({ min: 0 }),
//         literal('T'),
//         span('time', '1H').of('TimeUnit').repeats({ min: 1 }),
//       ]),
//       ast: { type: 'duration', date: $.date, time: $.time },
//       source: tpl`P${$.date}T${$.time}`,
//     },
//   })
//
// to one call:
//
//   prefixedRange('Duration', 'P',
//     span('date', '1D').of('DateUnit').repeats({ min: 0 }),
//     'T',
//     span('time', '1H').of('TimeUnit').repeats({ min: 1 }),
//     'duration')
//
// Same authoring contract as range(): both spans carry their field names
// (via `.name`) and example texts (via `.text`); modifiers pass through
// unchanged. The prefix and sep appear verbatim in the source template
// (no extra whitespace). Pass `options.input` when either span has no
// example text (typical for `.of(...).repeats()` shapes).
export function prefixedRange(
  nodeType: string,
  prefix: string,
  leftSpan: SpanNode,
  sep: string,
  rightSpan: SpanNode,
  astType: string,
  options: { readonly input?: string } = {},
): ExampleDef {
  const leftDef = leftSpan.toSpanDef();
  const rightDef = rightSpan.toSpanDef();
  if (!leftDef.name) {
    throw new Error(`prefixedRange('${nodeType}'): leftSpan must be a named span`);
  }
  if (!rightDef.name) {
    throw new Error(`prefixedRange('${nodeType}'): rightSpan must be a named span`);
  }
  const leftText = leftDef.text;
  const rightText = rightDef.text;
  const input = options.input
    ?? (leftText !== undefined && rightText !== undefined
      ? prefix + leftText + sep + rightText
      : undefined);
  if (input === undefined) {
    throw new Error(
      `prefixedRange('${nodeType}'): both spans must have example text or options.input must be provided`,
    );
  }
  const leftField = leftDef.name;
  const rightField = rightDef.name;
  const leftRef: SpanValueRef = { __ref: 'span-value', name: leftField };
  const rightRef: SpanValueRef = { __ref: 'span-value', name: rightField };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [prefix, sep, ''],
    slots: [
      { kind: 'capture', ref: leftField },
      { kind: 'capture', ref: rightField },
    ],
  };
  return relation(nodeType, {
    input,
    encodings: {
      parse: parse([literal(prefix), leftSpan, literal(sep), rightSpan]),
      ast: { type: astType, [leftField]: leftRef, [rightField]: rightRef },
      source: sourceTpl,
    },
  });
}

// Phase 7 sugar: a production capturing two spans separated by a fixed
// literal — typical "range" or "binary" shape. Collapses the cron range
// pattern:
//
//   relation('CronField', {
//     input: '1-5',
//     encodings: {
//       parse: parse([
//         span('start', '1').number().int(),
//         literal('-'),
//         span('end', '5').number().int(),
//       ]),
//       ast: { type: 'range', start: $.start, end: $.end },
//       source: tpl`${$.start}-${$.end}`,
//     },
//   })
//
// to one call:
//
//   range('CronField', span('start', '1').number().int(), '-', span('end', '5').number().int(), 'range')
//
// Both spans carry their field names (via `.name`) and example texts
// (via `.text`); modifiers pass through unchanged. The sep literal
// appears verbatim in the source template (no extra whitespace).
//
// When the source-form separator differs from the parse-form separator —
// typically because the canonical source has whitespace around the sep
// while the parse tolerates either form via standard-whitespace policy —
// pass `options.sourceSep`. The parse-side still sees a single
// `literal(sep)`; the source template's middle part becomes sourceSep
// verbatim. Example: toml's `key = value` parses on `=` but the canonical
// source has surrounding spaces, so `range('Pair', key, '=', value, 'pair',
// { sourceSep: ' = ' })` desugars to the original `tpl`${$.key} = ${$.value}``
// shape. The example input also switches to the sourceSep form so the
// schema's `input` string is the canonical source.
export function range(
  nodeType: string,
  leftSpan: SpanNode,
  sep: string,
  rightSpan: SpanNode,
  astType: string,
  options: { readonly sourceSep?: string } = {},
): ExampleDef {
  const leftDef = leftSpan.toSpanDef();
  const rightDef = rightSpan.toSpanDef();
  if (!leftDef.name) {
    throw new Error(`range('${nodeType}'): leftSpan must be a named span`);
  }
  if (!rightDef.name) {
    throw new Error(`range('${nodeType}'): rightSpan must be a named span`);
  }
  if (leftDef.text === undefined) {
    throw new Error(`range('${nodeType}'): leftSpan must have an example text`);
  }
  if (rightDef.text === undefined) {
    throw new Error(`range('${nodeType}'): rightSpan must have an example text`);
  }
  const leftField = leftDef.name;
  const rightField = rightDef.name;
  const leftRef: SpanValueRef = { __ref: 'span-value', name: leftField };
  const rightRef: SpanValueRef = { __ref: 'span-value', name: rightField };
  const sourceSep = options.sourceSep ?? sep;
  const sourceTpl: Template = {
    __tpl: true,
    parts: ['', sourceSep, ''],
    slots: [
      { kind: 'capture', ref: leftField },
      { kind: 'capture', ref: rightField },
    ],
  };
  return relation(nodeType, {
    input: leftDef.text + sourceSep + rightDef.text,
    encodings: {
      parse: parse([leftSpan, literal(sep), rightSpan]),
      ast: { type: astType, [leftField]: leftRef, [rightField]: rightRef },
      source: sourceTpl,
    },
  });
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
