import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, ex } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { emitDirectFastPath } from '../src/emit/direct-fast.ts';

test('direct fast path is inferred from generic nested-block structure', () => {
  const direct = emitDirectFastPath(inferSchema(makeGenericBlockSchema('%')));

  assert.ok(direct);
  assert.match(direct, /function parseDirectFast\(input: string\)/);
  assert.match(direct, /if \(c === 37\)/); // % prefix, derived from schema.
  assert.match(direct, /scanDirectBoundary\(state, 44, 91, 93\)/); // comma, [, ]
  assert.match(direct, /scanDirectPairBoundary\(state, 91, 44, 93\)/); // [, comma, ]
  assert.doesNotMatch(direct, /if \(c === 64\)/); // @ would be a CSS-shaped assumption.
  assert.doesNotMatch(direct, /scanDirectBoundary\(state, 59, 123, 125\)/); // ;, {, }
});

test('direct fast path falls back when required literals are not single-char', () => {
  const direct = emitDirectFastPath(inferSchema(makeGenericBlockSchema('::')));

  assert.equal(direct, null);
});

test('direct fast path does not require comment or prefixed productions', () => {
  const direct = emitDirectFastPath(inferSchema(makeBareBlockSchema()));

  assert.ok(direct);
  assert.match(direct, /function parseDirectFast\(input: string\)/);
  assert.match(direct, /scanDirectPairBoundary\(state, 91, 44, 93\)/); // [, comma, ]
  assert.doesNotMatch(direct, /parseDirectComment/);
  assert.doesNotMatch(direct, /parseDirectPrefixed/);
});

test('direct fast path is inferred from generic delimited record structure', () => {
  const direct = emitDirectFastPath(inferSchema(makeDelimitedRecordSchema()));

  assert.ok(direct);
  assert.match(direct, /function parseDirectFast\(input: string\)/);
  assert.match(direct, /input\.charCodeAt\(pos \+ 0\) === 117/);
  assert.match(direct, /input\.charCodeAt\(pos\) !== 124/);
  assert.match(direct, /let tail: unknown/);
  assert.doesNotMatch(direct, /arn:aws/);
});

function makeGenericBlockSchema(prefix: string) {
  return defineSchema({
    rootType: 'Document',
    punctuators: {
      open: '[',
      close: ']',
      assign: '=',
      sep: ',',
      prefix,
      flag: '!',
    },
    tokens: ['comment', 'string', 'number'],
    examples: [
      ex('/* note */')
        .as('Note')
        .span('text', '/* note */').comment()
        .render('ast', { kind: 'note', text: $.text })
        .build(),

      ex('key = value !flag,')
        .as('Entry')
        .span('key', 'key').until(['=', ',', ']'])
        .span('=')
        .span('value', 'value').until([',', ']', '!'])
        .span('!')
        .span('flag', 'flag').ident().js()
        .span(',').optional()
        .render('ast', { kind: 'entry', key: $.key, value: $.value, flagged: true })
        .build(),

      ex('key = value,')
        .as('Entry')
        .span('key', 'key').until(['=', ',', ']'])
        .span('=')
        .span('value', 'value').until([',', ']'])
        .span(',').optional()
        .render('ast', { kind: 'entry', key: $.key, value: $.value })
        .build(),

      ex('box [ key = value ]')
        .as('Block')
        .span('name', 'box').until(['[', ','])
        .span('[')
        .span('items', 'key = value', ['Note', 'Directive', 'Block', 'Entry'])
          .repeats({ sep: ',', trailing: 'allowed' })
        .span(']')
        .render('ast', { kind: 'block', name: $.name, items: $.items })
        .build(),

      ex(`${prefix}include file [ key = value ]`)
        .as('Directive')
        .span(prefix)
        .span('name', 'include').ident().js()
        .span('params', 'file').until([',', '['])
        .span('[')
        .span('items', 'key = value', ['Note', 'Directive', 'Block', 'Entry'])
          .repeats({ sep: ',', trailing: 'allowed' })
        .span(']')
        .render('ast', { kind: 'directive', name: $.name, params: $.params, items: $.items })
        .build(),

      ex(`${prefix}include file,`)
        .as('Directive')
        .span(prefix)
        .span('name', 'include').ident().js()
        .span('params', 'file').until([',', '[', ']'])
        .span(',').optional()
        .render('ast', { kind: 'directive', name: $.name, params: $.params })
        .build(),

      ex('box [ key = value ]')
        .as('Document')
        .span('items', 'box [ key = value ]', ['Note', 'Directive', 'Block', 'Entry'])
          .repeats({ min: 0, sep: ',', trailing: 'allowed' })
        .render('ast', { kind: 'document', items: $.items })
        .build(),
    ],
  });
}

function makeDelimitedRecordSchema() {
  return defineSchema({
    rootType: 'Record',
    punctuators: {
      pipe: '|',
      tilde: '~',
    },
    tokens: ['number'],
    examples: [
      ex('kind~item')
        .as('Tail')
        .span('kind', 'kind').ident().css()
        .span('~')
        .span('name', 'item').ident().css()
        .render('ast', { type: 'tail', kind: $.kind, name: $.name, separator: '~' })
        .build(),

      ex('item')
        .as('Tail')
        .span('name', 'item').ident().css()
        .render('ast', { type: 'tail', name: $.name })
        .build(),

      ex('urn|alpha|123|kind~item')
        .as('Record')
        .span('urn')
        .span('|')
        .span('service', 'alpha').ident().css()
        .span('|')
        .span('account', '123').number().int()
        .span('|')
        .span('tail', 'kind~item', 'Tail')
        .render('ast', { type: 'record', service: $.service, account: $.account, tail: $.tail })
        .build(),
    ],
  });
}

function makeBareBlockSchema() {
  return defineSchema({
    rootType: 'Document',
    punctuators: {
      open: '[',
      close: ']',
      assign: '=',
      sep: ',',
    },
    tokens: ['string', 'number'],
    examples: [
      ex('key = value,')
        .as('Entry')
        .span('key', 'key').until(['=', ',', ']'])
        .span('=')
        .span('value', 'value').until([',', ']'])
        .span(',').optional()
        .render('ast', { kind: 'entry', key: $.key, value: $.value })
        .build(),

      ex('box [ key = value ]')
        .as('Block')
        .span('name', 'box').until(['[', ','])
        .span('[')
        .span('items', 'key = value', ['Block', 'Entry'])
          .repeats({ sep: ',', trailing: 'allowed' })
        .span(']')
        .render('ast', { kind: 'block', name: $.name, items: $.items })
        .build(),

      ex('box [ key = value ]')
        .as('Document')
        .span('items', 'box [ key = value ]', ['Block', 'Entry'])
          .repeats({ min: 0, sep: ',', trailing: 'allowed' })
        .render('ast', { kind: 'document', items: $.items })
        .build(),
    ],
  });
}
