import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal as litB, parse, relation, span } from '@parser2/parser';
import { compileToModule } from './helpers/compile.ts';

// Captures-path (raws mode) analog of the until-divergence merged dispatch:
// the speculation chain parseEntry = alt0 -> alt1 gets a multi-segment
// viability pre-scan on alt0 (terminators ':' then '!'), so plain entries
// skip the doomed alt0 attempt entirely.
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

test('alt-viability helper is emitted for the divergent alt chain', async () => {
  const { source, cleanup } = await compileToModule(divergentSchema(), 'altv-');
  try {
    assert.ok(/__untilAltViable_/.test(source), 'multi-segment viability helper should be emitted');
    // It gates alt0 inside the captures-path speculation chain.
    const chain = source.match(/function parseEntry\(state: State\)[\s\S]*?\n\}/);
    assert.ok(chain, 'parseEntry speculation chain should exist');
    assert.ok(/__untilAltViable_/.test(chain[0]), 'chain should consult the viability helper');
  } finally {
    cleanup();
  }
});

// raws mode adds `raws` metadata fields to every node by design — strip them
// so the comparison checks the parse RESULT, not the fidelity sidecar.
function stripRaws(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRaws);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'raws') continue;
      out[k] = stripRaws(v);
    }
    return out;
  }
  return value;
}

test('raws mode parses identically (modulo raws sidecar) with the gated chain', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'altv-');
  try {
    for (const input of ['x: y;', 'x: y !k;', 'x: y ! :;', 'x: (a!b);', 'a: b; c: d !k; e: f']) {
      assert.deepEqual(
        stripRaws(render(input, { target: 'ast', mode: 'raws' })),
        stripRaws(render(input, { target: 'ast', mode: 'fast' })),
        `raws/fast divergence for ${JSON.stringify(input)}`,
      );
    }
  } finally {
    cleanup();
  }
});

test('raws mode: plain, marked, rescue, and bracketed entries', async () => {
  const { render, cleanup } = await compileToModule(divergentSchema(), 'altv-');
  try {
    assert.deepEqual(stripRaws(render('x: y;', { target: 'ast', mode: 'raws' })), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y' }],
    });
    assert.deepEqual(stripRaws(render('x: y !k;', { target: 'ast', mode: 'raws' })), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y', marked: true, kw: 'k' }],
    });
    assert.deepEqual(stripRaws(render('x: y ! :;', { target: 'ast', mode: 'raws' })), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: 'y ! :' }],
    });
    assert.deepEqual(stripRaws(render('x: (a!b);', { target: 'ast', mode: 'raws' })), {
      type: 'doc',
      nodes: [{ type: 'entry', p: 'x', v: '(a!b)' }],
    });
  } finally {
    cleanup();
  }
});
