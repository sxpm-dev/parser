// Phase 9 spike — prototype the `relation(...)` DSL and prove it produces
// ExampleDef values deep-equal to today's `ex(...)` for three representative
// productions from the markdown schema:
//   1. MarkdownHeading h1  — literal + named-capture + .until() + 3 renders
//   2. MarkdownDocument    — recursive children via .of(...).repeats()
//   3. Thematic break ***  — pure-literal single span, no captures
//
// If all three pass, the IR translation is sound and the rest of the compiler
// remains untouched — the generated parser will be byte-identical.
//
// This file is intentionally self-contained: the new builder lives inside the
// test, not in src/, so the spike can be discarded if the design needs to
// change. The Phase 9 plan will lift the proven shape into src/relation.ts.

import assert from 'node:assert/strict';
import test from 'node:test';
import { $, ex, tpl } from '../src/index.ts';
import type {
  ExampleDef,
  Refinement,
  RenderTargetDef,
  SpanClass,
  SpanDef,
  SpanModifier,
  Template,
  TrailingPolicy,
} from '../src/index.ts';

// ---------- Immutable span node -------------------------------------------

type SpanData = {
  readonly name?: string;
  readonly text?: string;
  readonly recursiveRoles: ReadonlyArray<string>;
  readonly class: SpanClass;
  readonly refinements: ReadonlyArray<Refinement>;
  readonly modifiers: ReadonlyArray<SpanModifier>;
};

class SpanNode {
  constructor(readonly data: SpanData) {}

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
    // Preserve property ORDER expected by today's ExampleBuilder ->
    // SpanDef construction so deep-equal against ex() succeeds.
    // (deepEqual is property-order-insensitive, but we keep the literal
    // shape for readability.)
    return {
      name: this.data.name,
      text: this.data.text,
      recursiveRoles: this.data.recursiveRoles,
      class: this.data.class,
      refinements: this.data.refinements,
      modifiers: this.data.modifiers,
    } as SpanDef;
  }
}

function span(name: string, text?: string): SpanNode {
  return new SpanNode({
    name,
    text,
    recursiveRoles: [],
    class: 'literal',
    refinements: [],
    modifiers: [],
  });
}

function literal(text: string): SpanNode {
  return new SpanNode({
    name: undefined,
    text,
    recursiveRoles: [],
    class: 'literal',
    refinements: [],
    modifiers: [],
  });
}

// ---------- Parse program -------------------------------------------------

type ParseProgram = { readonly __parse: true; readonly items: ReadonlyArray<SpanNode> };

function parse(items: ReadonlyArray<SpanNode>): ParseProgram {
  return { __parse: true, items };
}

function isParseProgram(v: unknown): v is ParseProgram {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { __parse?: unknown }).__parse === true &&
    Array.isArray((v as { items?: unknown }).items)
  );
}

// ---------- relation() ----------------------------------------------------

type RelationBody = {
  readonly input: string;
  readonly encodings: Readonly<Record<string, unknown>>;
  // status omitted for spike — default valid.
};

function relation(nodeType: string, body: RelationBody): ExampleDef {
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
    renders.push({ target, body: value as Template | object });
  }
  if (parseProgram === undefined) {
    throw new Error(`relation '${nodeType}': missing parse-program encoding`);
  }
  // Note: cross-validation that `body.input` is consistent with the parse
  // program (concatenated literal + named-span example texts, modulo
  // schema-level whitespace policy) is the real implementation's job. The
  // spike trusts the author.
  return {
    input: body.input,
    nodeType,
    spans: parseProgram.items.map((s) => s.toSpanDef()),
    status: { kind: 'valid' },
    renders,
  };
}

// ==========================================================================
// Spike test cases
// ==========================================================================

test('spike: relation() ≡ ex() for MarkdownHeading h1', () => {
  const HEADING_LINE_STOPS = ['\n'] as const;

  const viaEx = ex('# Release notes')
    .as('MarkdownLeaf')
    .span('#')
    .span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false })
    .render('ast', { type: 'heading', depth: 1, text: $.text })
    .render('html', tpl`<h1>${$.text}</h1>`)
    .render('source', tpl`# ${$.text}`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '# Release notes',
    encodings: {
      md: parse([
        literal('#'),
        span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false }),
      ]),
      ast: { type: 'heading', depth: 1, text: $.text },
      html: tpl`<h1>${$.text}</h1>`,
      source: tpl`# ${$.text}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('spike: relation() ≡ ex() for MarkdownDocument (recursive .of() + .repeats())', () => {
  const viaEx = ex('# Release notes\nPlain paragraph')
    .as('MarkdownDocument')
    .span('children', '# Release notes\nPlain paragraph', ['MarkdownLeaf', 'MarkdownParagraph'])
      .repeats({ min: 0 })
    .render('ast', { type: 'document', children: $.children })
    .render('html', tpl`${$.children}`)
    .render('source', tpl`${$.children}`)
    .build();

  const viaRelation = relation('MarkdownDocument', {
    input: '# Release notes\nPlain paragraph',
    encodings: {
      md: parse([
        span('children', '# Release notes\nPlain paragraph')
          .of('MarkdownLeaf', 'MarkdownParagraph')
          .repeats({ min: 0 }),
      ]),
      ast: { type: 'document', children: $.children },
      html: tpl`${$.children}`,
      source: tpl`${$.children}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('spike: relation() ≡ ex() for italic *italic* (punctuator hugs text)', () => {
  const viaEx = ex('*italic*')
    .as('MarkdownLeaf')
    .span('*')
    .span('text', 'italic').until('*', { balanced: false })
    .span('*')
    .render('ast', { type: 'italic', text: $.text })
    .render('html', tpl`<em>${$.text}</em>`)
    .render('source', tpl`*${$.text}*`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '*italic*',
    encodings: {
      md: parse([
        literal('*'),
        span('text', 'italic').until('*', { balanced: false }),
        literal('*'),
      ]),
      ast: { type: 'italic', text: $.text },
      html: tpl`<em>${$.text}</em>`,
      source: tpl`*${$.text}*`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('spike: relation() ≡ ex() for thematic break *** (pure literal)', () => {
  const viaEx = ex('***')
    .as('MarkdownLeaf')
    .span('***')
    .render('ast', { type: 'thematic-break', marker: '*' })
    .render('html', tpl`<hr>`)
    .render('source', tpl`***`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '***',
    encodings: {
      md: parse([literal('***')]),
      ast: { type: 'thematic-break', marker: '*' },
      html: tpl`<hr>`,
      source: tpl`***`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});
