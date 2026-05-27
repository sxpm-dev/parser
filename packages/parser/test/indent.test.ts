import test from 'node:test';
import { strict as assert } from 'node:assert';
import { ex } from '../src/example.ts';
import type { SpanModifier } from '../src/types.ts';

test('indent: SpanBuilder.indent() appends kind:indent modifier', () => {
  const example = ex('- a')
    .as('YamlList')
    .span('children', '', ['YamlItem']).indent().repeats({ min: 0 })
    .build();
  const span = example.spans[0]!;
  const indentMod = span.modifiers.find((m: SpanModifier) => m.kind === 'indent');
  assert.ok(indentMod, 'expected an indent modifier on the recursive-repeats span');
  assert.equal(indentMod.kind, 'indent');
});

test('indent: ExampleBuilder.indent(name, roles) sugar creates an indented recursive span', () => {
  const example = ex('- a')
    .as('YamlList')
    .indent('children', ['YamlItem']).repeats({ min: 0 })
    .build();
  const span = example.spans[0]!;
  assert.equal(span.name, 'children');
  assert.deepEqual([...span.recursiveRoles], ['YamlItem']);
  assert.ok(span.modifiers.find((m: SpanModifier) => m.kind === 'indent'),
    'sugar form must install the indent modifier');
  assert.ok(span.modifiers.find((m: SpanModifier) => m.kind === 'repeats'),
    '.repeats() must still chain after the sugar form');
});

test('indent: modifier order preserved — indent before repeats', () => {
  const example = ex('- a')
    .as('YamlList')
    .span('children', '', ['YamlItem']).indent().repeats({ min: 0 })
    .build();
  const kinds = example.spans[0]!.modifiers.map((m) => m.kind);
  assert.deepEqual(kinds, ['indent', 'repeats']);
});
