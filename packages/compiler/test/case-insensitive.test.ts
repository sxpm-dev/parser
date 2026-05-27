import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';

// Schema design note: the `open` and `close` spans are literal (no `.until()`
// modifier) so that case-sensitive matching can REJECT uppercase input — a
// literal span uses `input.startsWith(text, pos)` which is exact-byte.
// `.until('>')` would happily capture `DIV` regardless of the example value,
// defeating the case-sensitive default test. The body span keeps `.until('</')`
// because the body content is arbitrary user text, not a fixed token.
function makeTagSchema(caseSensitive: boolean) {
  return defineSchema({
    rootType: 'Tag',
    caseSensitive,
    examples: [
      ex('<div>x</div>')
        .as('Tag')
        .span('<')
        .span('open', 'div')
        .span('>')
        .span('body', 'x').until('</')
        .span('</')
        .span('close', 'div')
        .span('>')
        .render('ast', { open: $.open, body: $.body, close: $.close })
        .render('source', tpl`<${$.open}>${$.body}</${$.close}>`)
        .build(),
    ],
  });
}

const caseInsensitive = inferSchema(makeTagSchema(false));
const caseSensitive = inferSchema(makeTagSchema(true));

test('case-insensitive interp: lowercase input matches as-is', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<div>x</div>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: uppercase input produces lowercase captures', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<DIV>x</DIV>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: mixed-case input produces lowercase captures', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<DiV>x</dIv>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: body content is also lowercased', () => {
  const result = interpretParse(caseInsensitive, '<DIV>X</DIV>') as { body: string };
  assert.equal(result.body, 'x');
});

test('case-sensitive default: uppercase input fails to parse', () => {
  // Match SyntaxError specifically — `assert.throws` with no matcher would
  // accept any thrown value (including unrelated bugs).
  assert.throws(
    () => interpretParse(caseSensitive, '<DIV>x</DIV>'),
    SyntaxError,
  );
});
