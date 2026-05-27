import test from 'node:test';
import { strict as assert } from 'node:assert';
import { defineSchema, ex } from '../src/index.ts';

const minimalExample = ex('a')
  .as('Leaf')
  .span('a')
  .render('ast', 'a')
  .render('source', 'a')
  .build();

test('schema dials: defaults match documented values', () => {
  const schema = defineSchema({
    rootType: 'Leaf',
    examples: [minimalExample],
  });
  assert.equal(schema.bom, 'allow');
  assert.equal(schema.unicode, 'none');
  assert.equal(schema.newlines, 'LF');
  assert.equal(schema.caseSensitive, true);
});

test('schema dials: explicit values override defaults', () => {
  const schema = defineSchema({
    rootType: 'Leaf',
    bom: 'reject',
    unicode: 'NFC',
    newlines: 'either-preserve',
    caseSensitive: false,
    examples: [minimalExample],
  });
  assert.equal(schema.bom, 'reject');
  assert.equal(schema.unicode, 'NFC');
  assert.equal(schema.newlines, 'either-preserve');
  assert.equal(schema.caseSensitive, false);
});
