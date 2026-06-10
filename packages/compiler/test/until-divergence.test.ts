import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal as litB, parse, relation, span } from '@parser2/parser';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../src/model.ts';
import { detectUntilDivergence } from '../src/emit/v2/detect-until-divergence.ts';
import { compileToModule } from './helpers/compile.ts';

function lit(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [], recursiveRoles: [] };
}
function untilSpan(
  name: string,
  stops: string[],
  extra: Partial<{ rejectSuffix: string[]; nonEmpty: boolean; requireStop: boolean }> = {},
): ResolvedSpan {
  return {
    name,
    class: 'literal',
    text: name,
    refinements: [],
    modifiers: [{ kind: 'until', stops, balanced: true, trim: true, ...extra }],
    recursiveRoles: [],
  };
}
function identSpan(name: string): ResolvedSpan {
  return {
    name,
    class: 'ident',
    text: name,
    refinements: [{ name: 'css', args: [] }],
    modifiers: [],
    recursiveRoles: [],
  };
}
function optLit(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [{ kind: 'optional' }], recursiveRoles: [] };
}
function prod(spans: ResolvedSpan[]): Production {
  return { nodeType: 'X', source: { input: '' } as Production['source'], spans, renders: new Map() };
}

// The declaration-like pair:
//   A = p until[:;}]  ':'  v until[;}!]  '!'  kw  ';'?
//   B = p until[:;}]  ':'  v until[;}]   ';'?
function declPair(): NodeTypeInfo {
  return {
    name: 'X',
    productions: [
      prod([untilSpan('p', [':', ';', '}']), lit(':'), untilSpan('v', [';', '}', '!']), lit('!'), identSpan('kw'), optLit(';')]),
      prod([untilSpan('p', [':', ';', '}']), lit(':'), untilSpan('v', [';', '}']), optLit(';')]),
    ],
  };
}

test('detects the until-divergence pair shape', () => {
  const d = detectUntilDivergence(declPair());
  assert.ok(d);
  assert.equal(d.scanIdx, 2);
  assert.equal(d.extraStop, '!');
  assert.equal(d.longAltIdx, 0);
  assert.equal(d.shortAltIdx, 1);
});

test('detects when the long alt is declared second', () => {
  const info = declPair();
  info.productions = [info.productions[1]!, info.productions[0]!];
  const d = detectUntilDivergence(info);
  assert.ok(d);
  assert.equal(d.longAltIdx, 1);
  assert.equal(d.shortAltIdx, 0);
});

test('returns null when stop sets differ by more than one char', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!', '?']);
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the extra stop is multi-char', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!!']);
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the long alt does not follow with literal(extraStop)', () => {
  const info = declPair();
  info.productions[0]!.spans[3] = lit('?');
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the follow literal is optional', () => {
  const info = declPair();
  info.productions[0]!.spans[3] = optLit('!');
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging spans disagree on rejectSuffix', () => {
  const info = declPair();
  info.productions[1]!.spans[2] = untilSpan('v', [';', '}'], { rejectSuffix: [':'] });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging span carries nonEmpty (semantics diverge on the extra-stop path)', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!'], { nonEmpty: true });
  info.productions[1]!.spans[2] = untilSpan('v', [';', '}'], { nonEmpty: true });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging span carries rejectSuffix on both alts', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!'], { rejectSuffix: [','] });
  info.productions[1]!.spans[2] = untilSpan('v', [';', '}'], { rejectSuffix: [','] });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when either until has requireStop', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!'], { requireStop: true });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging spans have different capture names', () => {
  const info = declPair();
  info.productions[1]!.spans[2] = untilSpan('w', [';', '}']);
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when a shared-prefix span has a different capture name', () => {
  const info = declPair();
  info.productions[1]!.spans[0] = untilSpan('q', [':', ';', '}']);
  // spansMatchExactly ignores `name`, so the prefix walk alone would accept
  // this — the detector must reject it because merged emission binds prefix
  // captures under one name that both alt bodies reference.
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when shared prefix differs structurally', () => {
  const info = declPair();
  info.productions[1]!.spans[0] = untilSpan('p', [':', ';']);
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null for 1 or 3+ productions', () => {
  const one: NodeTypeInfo = { name: 'X', productions: [declPair().productions[0]!] };
  assert.equal(detectUntilDivergence(one), null);
  const three = declPair();
  three.productions = [...three.productions, prod([lit('z')])];
  assert.equal(detectUntilDivergence(three), null);
});

test('returns null when the diverging span is recursive', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = { ...untilSpan('v', [';', '}', '!']), recursiveRoles: ['Y'] };
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging span is unbalanced', () => {
  const info = declPair();
  const unbalanced = untilSpan('v', [';', '}', '!']);
  (unbalanced.modifiers[0] as { balanced: boolean }).balanced = false;
  info.productions[0]!.spans[2] = unbalanced;
  assert.equal(detectUntilDivergence(info), null);
});

// ---------------------------------------------------------------------------
// End-to-end: merged dispatcher behavior + shape pins. The schema is shaped
// like the divergence pattern (NOT named after any language): Entry has a
// marked variant `k : v !kw ;?` and a plain variant `k : v ;?`.
// ---------------------------------------------------------------------------

function divergentSchema() {
  return defineSchema({
    rootType: 'Doc',
    punctuators: {
      colon: ':',
      semicolon: ';',
      bang: '!',
      lbrace: '{',
      rbrace: '}',
      lparen: '(',
      rparen: ')',
    },
    tokens: ['string', 'comment'],
    examples: [
      relation('Entry', {
        input: 'a: b !k;',
        encodings: {
          parse: parse([
            span('p', 'a').until([':', ';', '}']),
            litB(':'),
            span('v', 'b').until([';', '}', '!']),
            litB('!'),
            span('kw', 'k').ident().css(),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v, marked: true, kw: $.kw },
        },
      }),
      relation('Entry', {
        input: 'a: b;',
        encodings: {
          parse: parse([
            span('p', 'a').until([':', ';', '}']),
            litB(':'),
            span('v', 'b').until([';', '}']),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v },
        },
      }),
      relation('Doc', {
        input: 'a: b;',
        encodings: {
          parse: parse([
            span('nodes', 'a: b;').of('Entry').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
          ]),
          ast: { type: 'doc', nodes: $.nodes },
        },
      }),
    ],
  });
}

test('merged dispatcher: plain entry parses identically and the probe chain is gone', async () => {
  const { render, source, cleanup } = await compileToModule(divergentSchema(), 'udiv-');
  try {
    assert.deepEqual(render('x: y;', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y' }],
    });
    // Shape pin: the Entry/ast dispatcher no longer probes alt 0 then alt 1.
    const dispatcher = source.match(
      /function __fusedRenderStructuredDispatch_Entry_ast\(state: State\): unknown \{[\s\S]*?\n\}/,
    );
    assert.ok(dispatcher, 'Entry/ast dispatcher should exist');
    assert.ok(
      !/__fusedRenderStructured_Entry_0_ast\(state\)/.test(dispatcher[0]),
      'dispatcher should not call the per-production probe chain',
    );
  } finally {
    cleanup();
  }
});

test('merged dispatcher: marked entry routes to long tail', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'udiv-');
  try {
    assert.deepEqual(render('x: y !k;', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y', marked: true, kw: 'k' }],
    });
  } finally {
    cleanup();
  }
});

test('merged dispatcher rescue: depth-0 extra-stop whose tail fails falls back to short alt', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'udiv-');
  try {
    // '!' followed by a non-ident (':' is a declared punctuator but not an
    // ident start): long tail fails, so the short alt must re-scan and
    // capture the bang inside v.
    assert.deepEqual(render('x: y ! :;', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y ! :' }],
    });
  } finally {
    cleanup();
  }
});

test('merged dispatcher: bracketed extra-stop is not a stop (balanced)', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'udiv-');
  try {
    assert.deepEqual(render('x: (a!b);', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: '(a!b)' }],
    });
  } finally {
    cleanup();
  }
});

test('merged dispatcher: multiple entries, mixed variants', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'udiv-');
  try {
    assert.deepEqual(render('a: b; c: d !k; e: f', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [
        { type: 'entry', p: 'a', v: 'b' },
        { type: 'entry', p: 'c', v: 'd', marked: true, kw: 'k' },
        { type: 'entry', p: 'e', v: 'f' },
      ],
    });
  } finally {
    cleanup();
  }
});
