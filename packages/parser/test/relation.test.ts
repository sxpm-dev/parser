import assert from 'node:assert/strict';
import test from 'node:test';
import { $, literal, parse, relation, span, tpl, withInverse } from '../src/index.ts';

test('relation: minimal heading produces ExampleDef with one literal + one named span', () => {
  const def = relation('MarkdownLeaf', {
    input: '# Release notes',
    encodings: {
      md: parse([
        literal('#'),
        span('text', 'Release notes').until('\n', { balanced: false }),
      ]),
      ast: { type: 'heading', depth: 1, text: $.text },
      html: tpl`<h1>${$.text}</h1>`,
      source: tpl`# ${$.text}`,
    },
  });

  assert.equal(def.input, '# Release notes');
  assert.equal(def.nodeType, 'MarkdownLeaf');
  assert.equal(def.spans.length, 2);
  assert.equal(def.spans[0]!.text, '#');
  assert.equal(def.spans[1]!.name, 'text');
  assert.equal(def.spans[1]!.text, 'Release notes');
  assert.equal(def.status.kind, 'valid');
  assert.equal(def.renders.length, 3);
  assert.deepEqual(def.renders.map((r) => r.target), ['ast', 'html', 'source']);
});

test('relation: span chain accepts class, refinement, modifier', () => {
  const def = relation('Decl', {
    input: 'color: red',
    encodings: {
      src: parse([
        span('prop', 'color').ident().css(),
        literal(':'),
        span('value', 'red').ident().css(),
        literal(';').optional(),
      ]),
      ast: { prop: $.prop, value: $.value },
    },
  });
  assert.equal(def.spans.length, 4);
  const [prop, colon, value, semi] = def.spans;
  assert.equal(prop!.class, 'ident');
  assert.deepEqual(prop!.refinements, [{ name: 'css' }]);
  assert.equal(colon!.class, 'literal');
  assert.equal(colon!.text, ':');
  assert.equal(value!.class, 'ident');
  assert.equal(semi!.modifiers[0]?.kind, 'optional');
});

test('relation: repeats modifier captures options', () => {
  const def = relation('Decls', {
    input: 'a;b',
    encodings: {
      src: parse([
        span('items', 'a;b').of('Item').repeats({ sep: ';', trailing: 'allowed' }),
      ]),
      ast: { items: $.items },
    },
  });
  const sp = def.spans[0]!;
  const mod = sp.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.sep, ';');
  assert.equal(mod.trailing, 'allowed');
});

test('relation: .of() carries multiple recursive roles', () => {
  const def = relation('Container', {
    input: 'x',
    encodings: {
      src: parse([span('child', 'x').of('Rule', 'AtRule')]),
      ast: { child: $.child },
    },
  });
  assert.deepEqual(def.spans[0]!.recursiveRoles, ['Rule', 'AtRule']);
});

// --- Class methods ---

test('relation: span.literal() sets class', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').literal()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'literal');
});

test('relation: span.ident() sets class', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').ident()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'ident');
});

test('relation: span.number() sets class', () => {
  const def = relation('T', {
    input: '42',
    encodings: {
      src: parse([span('n', '42').number()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'number');
});

test('relation: span.string() sets class', () => {
  const def = relation('T', {
    input: '"hi"',
    encodings: {
      src: parse([span('s', '"hi"').string()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'string');
});

test('relation: span.hex() sets class', () => {
  const def = relation('T', {
    input: '0xff',
    encodings: {
      src: parse([span('h', '0xff').hex()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'hex');
});

test('relation: span.comment() sets class', () => {
  const def = relation('T', {
    input: '// hi',
    encodings: {
      src: parse([span('c', '// hi').comment()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'comment');
});

// Note: `.keyword(text)`, `.regex()`, `.template()`, and `.whitespace()`
// were removed from the DSL surface during Phase 1 cleanup — no shipped
// schema used them and the matrix policy ("remove when zero users")
// applied. The prior tests for each were removed alongside the methods.

test('relation: span.operator() sets class', () => {
  const def = relation('T', {
    input: '+',
    encodings: {
      src: parse([span('op', '+').operator()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.class, 'operator');
});

test('relation: span.operator(alts) sets class and alts refinement', () => {
  const def = relation('T', {
    input: '+',
    encodings: {
      src: parse([span('op', '+').operator(['+', '-'])]),
      ast: {},
    },
  });
  const s = def.spans[0]!;
  assert.equal(s.class, 'operator');
  assert.equal(s.refinements[0]!.name, 'alts');
});

// --- Refinement methods ---

test('relation: number refinements int, float, bigint, binary, octal, scientific', () => {
  const def = relation('T', {
    input: '1',
    encodings: {
      src: parse([span('n', '1').number().int().float().bigint().binary().octal().scientific()]),
      ast: {},
    },
  });
  const refs = def.spans[0]!.refinements.map((r) => r.name);
  assert.deepEqual(refs, ['int', 'float', 'bigint', 'binary', 'octal', 'scientific']);
});

test('relation: separator(ch) refinement', () => {
  const def = relation('T', {
    input: '1_000',
    encodings: {
      src: parse([span('n', '1_000').number().separator('_')]),
      ast: {},
    },
  });
  const r = def.spans[0]!.refinements[0]!;
  assert.equal(r.name, 'separator');
  assert.deepEqual(r.args, ['_']);
});

test('relation: string refinements singleQuoted, doubleQuoted, backtick, hexString, urlString', () => {
  const def = relation('T', {
    input: '"x"',
    encodings: {
      src: parse([span('s', '"x"').string().singleQuoted().doubleQuoted().backtick().hexString().urlString()]),
      ast: {},
    },
  });
  const refs = def.spans[0]!.refinements.map((r) => r.name);
  assert.deepEqual(refs, ['singleQuoted', 'doubleQuoted', 'backtick', 'hexString', 'urlString']);
});

test('relation: lengths([...]) refinement', () => {
  const def = relation('T', {
    input: 'aabbcc',
    encodings: {
      src: parse([span('h', 'aabbcc').hex().lengths([3, 6])]),
      ast: {},
    },
  });
  const r = def.spans[0]!.refinements[0]!;
  assert.equal(r.name, 'lengths');
  assert.deepEqual(r.args, [[3, 6]]);
});

test('relation: ident refinements css, js, html', () => {
  const def = relation('T', {
    input: 'foo',
    encodings: {
      src: parse([span('i', 'foo').ident().css().js().html()]),
      ast: {},
    },
  });
  const refs = def.spans[0]!.refinements.map((r) => r.name);
  assert.deepEqual(refs, ['css', 'js', 'html']);
});

test('relation: oneOf([...]) refinement', () => {
  const def = relation('T', {
    input: 'foo',
    encodings: {
      src: parse([span('i', 'foo').ident().oneOf(['foo', 'bar'])]),
      ast: {},
    },
  });
  const r = def.spans[0]!.refinements[0]!;
  assert.equal(r.name, 'oneOf');
  assert.deepEqual(r.args, [['foo', 'bar']]);
});

test('relation: line(marker) refinement', () => {
  const def = relation('T', {
    input: '// hi',
    encodings: {
      src: parse([span('c', '// hi').comment().line('//')]),
      ast: {},
    },
  });
  const r = def.spans[0]!.refinements[0]!;
  assert.equal(r.name, 'line');
  assert.deepEqual(r.args, ['//']);
});

test('relation: block(open, close) refinement', () => {
  const def = relation('T', {
    input: '/* hi */',
    encodings: {
      src: parse([span('c', '/* hi */').comment().block('/*', '*/')]),
      ast: {},
    },
  });
  const r = def.spans[0]!.refinements[0]!;
  assert.equal(r.name, 'block');
  assert.deepEqual(r.args, ['/*', '*/']);
});

// --- Modifier methods ---

test('relation: until() modifier with balanced:false', () => {
  const def = relation('T', {
    input: 'text\n',
    encodings: {
      src: parse([span('v', 'text').until('\n', { balanced: false })]),
      ast: {},
    },
  });
  const mod = def.spans[0]!.modifiers[0]!;
  assert.equal(mod.kind, 'until');
  if (mod.kind !== 'until') throw new Error('unreachable');
  assert.deepEqual(mod.stops, ['\n']);
  assert.equal(mod.balanced, false);
  assert.equal(mod.trim, true);
});

test('relation: until() with trim:false and rejectSuffix and nonEmpty and requireStop', () => {
  const def = relation('T', {
    input: 'a',
    encodings: {
      src: parse([span('v', 'a').until([';', '\n'], {
        trim: false,
        rejectSuffix: ':',
        nonEmpty: true,
        requireStop: true,
      })]),
      ast: {},
    },
  });
  const mod = def.spans[0]!.modifiers[0]!;
  assert.equal(mod.kind, 'until');
  if (mod.kind !== 'until') throw new Error('unreachable');
  assert.equal(mod.trim, false);
  assert.deepEqual(mod.rejectSuffix, [':']);
  assert.equal(mod.nonEmpty, true);
  assert.equal(mod.requireStop, true);
});

test('relation: rawUntil() modifier', () => {
  const def = relation('T', {
    input: 'foo</script>',
    encodings: {
      src: parse([span('body', 'foo').rawUntil('</script>', { caseInsensitive: true })]),
      ast: {},
    },
  });
  const mod = def.spans[0]!.modifiers[0]!;
  assert.equal(mod.kind, 'rawUntil');
  if (mod.kind !== 'rawUntil') throw new Error('unreachable');
  assert.deepEqual(mod.stops, ['</script>']);
  assert.equal(mod.caseInsensitive, true);
});

test('relation: rawUntil() with requireStop and nonEmpty', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('v', 'x').rawUntil('</style>', { requireStop: true, nonEmpty: true })]),
      ast: {},
    },
  });
  const mod = def.spans[0]!.modifiers[0]!;
  assert.equal(mod.kind, 'rawUntil');
  if (mod.kind !== 'rawUntil') throw new Error('unreachable');
  assert.equal(mod.requireStop, true);
  assert.equal(mod.nonEmpty, true);
});

test('relation: noLineTerminatorAfter() modifier', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').noLineTerminatorAfter()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.modifiers[0]?.kind, 'noLineTerminatorAfter');
});

test('relation: noWhitespaceAfter() modifier', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').noWhitespaceAfter()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.modifiers[0]?.kind, 'noWhitespaceAfter');
});

test('relation: requireSpaceAfter() modifier', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').requireSpaceAfter()]),
      ast: {},
    },
  });
  assert.equal(def.spans[0]!.modifiers[0]?.kind, 'requireSpaceAfter');
});

test('relation: indent() modifier', () => {
  const def = relation('T', {
    input: 'x',
    encodings: {
      src: parse([span('s', 'x').of('Child').indent().repeats({ min: 0 })]),
      ast: {},
    },
  });
  const mods = def.spans[0]!.modifiers;
  assert.equal(mods[0]?.kind, 'indent');
  assert.equal(mods[1]?.kind, 'repeats');
});

test('relation: repeats() with min, max, stopBefore options', () => {
  const def = relation('T', {
    input: 'abc',
    encodings: {
      src: parse([
        span('items', 'abc').of('Item').repeats({ min: 1, max: 5, stopBefore: ['}'] }),
      ]),
      ast: {},
    },
  });
  const mod = def.spans[0]!.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.min, 1);
  assert.equal(mod.max, 5);
  assert.deepEqual(mod.stopBefore, ['}']);
});

// --- Literal function ---

test('relation: literal() creates unnamed span with class=literal', () => {
  const def = relation('T', {
    input: ':',
    encodings: {
      src: parse([literal(':')]),
      ast: {},
    },
  });
  const s = def.spans[0]!;
  assert.equal(s.name, undefined);
  assert.equal(s.text, ':');
  assert.equal(s.class, 'literal');
  assert.deepEqual(s.recursiveRoles, []);
});

// --- Status and render edge cases ---

test('relation: throws on multiple parse-program encodings', () => {
  assert.throws(
    () =>
      relation('T', {
        input: 'x',
        encodings: {
          src1: parse([literal('x')]),
          src2: parse([literal('x')]),
        },
      }),
    /multiple parse-program encodings/,
  );
});

test('relation: throws when no parse-program encoding present', () => {
  assert.throws(
    () =>
      relation('T', {
        input: 'x',
        encodings: {
          ast: { val: 1 },
        },
      }),
    /missing parse-program encoding/,
  );
});

test('relation: immutable — chaining does not mutate the original SpanNode', () => {
  const base = span('s', 'x');
  const withIdent = base.ident();
  const withNumber = base.number();
  // base is unchanged
  assert.equal(base.toSpanDef().class, 'literal');
  assert.equal(withIdent.toSpanDef().class, 'ident');
  assert.equal(withNumber.toSpanDef().class, 'number');
});

test('relation: rejects when input is missing literal span text', () => {
  assert.throws(
    () =>
      relation('Bad', {
        input: 'foo',
        encodings: {
          src: parse([literal('#'), span('text', 'foo').until('\n')]),
          ast: { text: $.text },
        },
      }),
    /literal '#' not found in input/i,
  );
});

test('relation: rejects when named span example text not found in input', () => {
  assert.throws(
    () =>
      relation('Bad', {
        input: '# elsewhere',
        encodings: {
          src: parse([literal('#'), span('text', 'Release notes').until('\n')]),
          ast: { text: $.text },
        },
      }),
    /span 'text' example 'Release notes' not found in input/i,
  );
});

test('relation: accepts whitespace gaps between adjacent spans (standard policy)', () => {
  // input has two-space gap between '#' and 'foo' — standard whitespace
  // policy treats inter-span whitespace as optional, so validation must
  // tolerate a non-zero gap.
  const def = relation('Heading', {
    input: '#  foo',
    encodings: {
      src: parse([literal('#'), span('text', 'foo').until('\n')]),
      ast: { text: $.text },
    },
  });
  assert.equal(def.input, '#  foo');
});

test('relation: optional span absent from input does not trigger validation error', () => {
  // ';' is optional and absent from 'color: red'; validation must pass.
  assert.doesNotThrow(() =>
    relation('Decl', {
      input: 'color: red',
      encodings: {
        src: parse([
          span('prop', 'color').ident().css(),
          literal(':'),
          span('value', 'red').ident().css(),
          literal(';').optional(),
        ]),
        ast: { prop: $.prop, value: $.value },
      },
    }),
  );
});

// --- withInverse ---

test('relation: withInverse() emits RenderTargetDef with inverse field', () => {
  const def = relation('X', {
    input: 'x',
    encodings: {
      src: parse([span('v', 'x').ident()]),
      html: withInverse(tpl`<a>${$.v}</a>`, tpl`<A>${$.v}</A>`),
    },
  });
  assert.equal(def.renders.length, 1);
  const r = def.renders[0]!;
  assert.equal(r.target, 'html');
  assert.ok(r.inverse, 'inverse should be set');
});

test('relation: encodings without withInverse have undefined inverse', () => {
  const def = relation('Y', {
    input: 'y',
    encodings: {
      src: parse([span('v', 'y').ident()]),
      html: tpl`<a>${$.v}</a>`,
    },
  });
  assert.equal(def.renders[0]!.inverse, undefined);
});

test('relation: withInverse() body is preserved on RenderTargetDef', () => {
  const body = tpl`<a>${$.v}</a>`;
  const inverse = tpl`<A>${$.v}</A>`;
  const def = relation('Z', {
    input: 'z',
    encodings: {
      src: parse([span('v', 'z').ident()]),
      html: withInverse(body, inverse),
    },
  });
  const r = def.renders[0]!;
  assert.equal(r.body, body);
  assert.equal(r.inverse, inverse);
});

// ---- litEnum (Phase 7 sugar) -----------------------------------------------

import { litEnum } from '../src/index.ts';

test('litEnum: produces one relation per literal, with ast scalar + source tpl', () => {
  const defs = litEnum('Color', ['red', 'green', 'blue']);
  assert.equal(defs.length, 3);
  for (let i = 0; i < defs.length; i++) {
    const lit = ['red', 'green', 'blue'][i]!;
    const def = defs[i]!;
    assert.equal(def.input, lit);
    assert.equal(def.nodeType, 'Color');
    assert.equal(def.spans.length, 1);
    assert.equal(def.spans[0]!.text, lit);
    assert.equal(def.spans[0]!.class, 'literal');
    assert.deepEqual(def.renders.map((r) => r.target), ['ast', 'source']);
    assert.equal(def.renders[0]!.body, lit);
    const sourceBody = def.renders[1]!.body as { __tpl: true; parts: string[]; slots: unknown[] };
    assert.equal(sourceBody.__tpl, true);
    assert.deepEqual(sourceBody.parts, [lit]);
    assert.deepEqual(sourceBody.slots, []);
  }
});

test('litEnum: byte-identical to a manual relation chain', () => {
  // Pure-desugar contract: a hand-written `relation(...)` and the helper's
  // ExampleDef must compare deep-equal for the same literal.
  const manual = relation('Color', {
    input: 'red',
    encodings: { parse: parse([literal('red')]), ast: 'red', source: tpl`red` },
  });
  const sugared = litEnum('Color', ['red'])[0]!;
  assert.deepEqual(sugared, manual);
});

test('litEnum: targets option lets caller override the default ast + source pair', () => {
  const defs = litEnum('Color', ['red'], { targets: ['ast'] });
  assert.equal(defs[0]!.renders.length, 1);
  assert.equal(defs[0]!.renders[0]!.target, 'ast');
});

test('litEnum: empty input array returns empty array', () => {
  assert.deepEqual(litEnum('X', []), []);
});
