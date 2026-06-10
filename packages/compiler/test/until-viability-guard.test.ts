import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal as litB, parse, relation, span } from '@parser2/parser';
import { compileToModule } from './helpers/compile.ts';

// Two until-led siblings in a union: Block = "sel { items }" vs Entry =
// "k : v". Without guards, every Entry pays a full failed Block attempt
// (selector scan to ';' then a missed '{'). The viability guard pre-scans
// to the first depth-0 terminator and skips Block when it isn't '{'.
function unionSchema() {
  return defineSchema({
    rootType: 'Doc',
    punctuators: {
      colon: ':',
      semicolon: ';',
      lbrace: '{',
      rbrace: '}',
      lparen: '(',
      rparen: ')',
    },
    tokens: ['ident', 'string', 'comment'],
    examples: [
      relation('Block', {
        input: 's { k: v }',
        encodings: {
          parse: parse([
            span('sel', 's').until(['{', ';'], { nonEmpty: true }),
            litB('{'),
            span('nodes', 'k: v').of('Block', 'Entry').repeats({ sep: ';', trailing: 'allowed' }),
            litB('}'),
          ]),
          ast: { type: 'block', sel: $.sel, nodes: $.nodes },
        },
      }),
      relation('Entry', {
        input: 'k: v',
        encodings: {
          parse: parse([
            span('p', 'k').until([':', ';', '}']),
            litB(':'),
            span('v', 'v').until([';', '}']),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v },
        },
      }),
      relation('Doc', {
        input: 's { k: v }',
        encodings: {
          parse: parse([
            span('nodes', 's { k: v }').of('Block', 'Entry').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
          ]),
          ast: { type: 'doc', nodes: $.nodes },
        },
      }),
    ],
  });
}

test('guard emits and routes entries directly to Entry (no Block attempt)', async () => {
  const { render, source, cleanup } = await compileToModule(unionSchema(), 'uguard-');
  try {
    assert.ok(/__untilTerminator_/.test(source), 'guard helper should be emitted');
    assert.deepEqual(render('a: b; c { d: e }', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [
        { type: 'entry', p: 'a', v: 'b' },
        { type: 'block', sel: 'c', nodes: [{ type: 'entry', p: 'd', v: 'e' }] },
      ],
    });
  } finally {
    cleanup();
  }
});

test('guard respects balanced brackets: braces inside parens are not terminators', async () => {
  const { render, cleanup } = await compileToModule(unionSchema(), 'uguard-');
  try {
    assert.deepEqual(render('a: (p{q});', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'a', v: '(p{q})' }],
    });
  } finally {
    cleanup();
  }
});

test('guard skips comments and strings like the real scan', async () => {
  const { render, cleanup } = await compileToModule(unionSchema(), 'uguard-');
  try {
    assert.deepEqual(render('a /* { */ : "x{y";', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'a', v: '"x{y"' }],
    });
  } finally {
    cleanup();
  }
});

test('nested blocks and mixed children still parse', async () => {
  const { render, cleanup } = await compileToModule(unionSchema(), 'uguard-');
  try {
    assert.deepEqual(render('o { i { a: b }; c: d }', { target: 'ast', mode: 'fast' }), {
      type: 'doc',
      nodes: [
        {
          type: 'block',
          sel: 'o',
          nodes: [
            { type: 'block', sel: 'i', nodes: [{ type: 'entry', p: 'a', v: 'b' }] },
            { type: 'entry', p: 'c', v: 'd' },
          ],
        },
      ],
    });
  } finally {
    cleanup();
  }
});
