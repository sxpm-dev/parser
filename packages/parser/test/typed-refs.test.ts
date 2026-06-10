import assert from 'node:assert/strict';
import test from 'node:test';
import { $, literal, parse, relation, span, tpl } from '../src/index.ts';

// The typed targets-callback form must produce an ExampleDef byte-identical
// (deep-equal) to the legacy encodings form — it is pure sugar over the same
// runtime ($ is the same proxy; encodings are merged from parse + targets()).

test('targets-callback form produces the same ExampleDef as the encodings form', () => {
  const mkSpans = () => [
    span('p', 'a').until([':', ';', '}']),
    literal(':'),
    span('v', 'b').until([';', '}']),
    literal(';').optional(),
  ] as const;

  const legacy = relation('Entry', {
    input: 'a: b;',
    encodings: {
      parse: parse(mkSpans()),
      ast: { type: 'entry', p: $.p, v: $.v },
      json: null,
      source: tpl`${$.p}: ${$.v};`,
    },
  });

  const typed = relation('Entry', {
    input: 'a: b;',
    parse: parse(mkSpans()),
    targets: (refs) => ({
      ast: { type: 'entry', p: refs.p, v: refs.v },
      json: null,
      source: tpl`${refs.p}: ${refs.v};`,
    }),
  });

  assert.deepEqual(typed, legacy);
});

test('targets-callback form carries status through', () => {
  const typed = relation('Entry', {
    input: 'a: b;',
    parse: parse([span('p', 'a').until([':']), literal(':'), span('v', ' b;').until([';'])]),
    targets: (refs) => ({ ast: { p: refs.p, v: refs.v } }),
    status: { kind: 'valid' },
  });
  assert.deepEqual(typed.status, { kind: 'valid' });
});

test('presence refs work through the typed view', () => {
  const typed = relation('Entry', {
    input: 'a: b;',
    parse: parse([span('p', 'a').until([':']), literal(':'), span('v', ' b;').until([';'])]),
    targets: (refs) => ({ ast: { p: refs.p, hasV: refs.v.present } }),
  });
  const ast = typed.renders.find((r) => r.target === 'ast')!;
  assert.deepEqual((ast.body as { hasV: unknown }).hasV, { __ref: 'span-presence', name: 'v' });
});
