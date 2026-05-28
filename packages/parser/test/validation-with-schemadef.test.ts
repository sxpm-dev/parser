import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, defineValidation, parse, relation, span } from '../src/index.ts';

const childSchema = defineSchema({
  rootType: 'Word',
  punctuators: {},
  tokens: [],
  examples: [
    relation('Word', {
      input: 'foo',
      encodings: {
        parse: parse([span('value', 'foo').ident().css()]),
        ast: { type: 'word', value: $.value },
      },
    }),
  ],
});

const parentSchema = defineSchema({
  rootType: 'Pair',
  punctuators: {},
  tokens: [],
  examples: [
    relation('Pair', {
      input: 'foo bar',
      encodings: {
        parse: parse([
          span('a', 'foo').ident().css(),
          span('sep', ' ').of('Whitespace'),
          span('b', 'bar').ident().css(),
        ]),
        ast: { type: 'pair', a: $.a, b: $.b },
      },
    }),
  ],
});

test('defineValidation.validate accepts a SchemaDef', () => {
  const validation = defineValidation(parentSchema)
    .node('Pair')
    .field('a')
    .match('type', 'pair')
    .validate(childSchema)
    .build();

  assert.equal(validation.rules.length, 1);
  const rule = validation.rules[0]!;
  assert.equal(rule.validator.kind, 'inline');
  assert.equal((rule.validator as { kind: 'inline'; schema: unknown }).schema, childSchema);
});

test('defineValidation.validate still accepts a generated validator (import path)', () => {
  const fakeValidator = (() => {}) as unknown as ((input: string) => void) & {
    __parser2Validator?: { module: string; exportName: string };
  };
  fakeValidator.__parser2Validator = {
    module: '@parser2/word',
    exportName: 'validate',
  };

  const validation = defineValidation(parentSchema)
    .node('Pair')
    .field('a')
    .match('type', 'pair')
    .validate(fakeValidator as never)
    .build();

  assert.equal(validation.rules.length, 1);
  const rule = validation.rules[0]!;
  assert.equal(rule.validator.kind, 'import');
  assert.equal((rule.validator as { kind: 'import'; module: string }).module, '@parser2/word');
  assert.equal((rule.validator as { kind: 'import'; exportName: string }).exportName, 'validate');
});
