import { strict as assert } from 'node:assert';
import test from 'node:test';
import { parse, stringify } from '../src/index.ts';

test('unseen declarations, selector lists and recursive rules', () => {
  assert.deepEqual(parse('.button, #button { color: blue; &.icon { width: 16px; } #icon { display: block; } }'), {
    children: [{ selectors: ['.button', '#button'], children: [
      { property: 'color', value: 'blue' },
      { selectors: ['&.icon'], children: [{ property: 'width', value: '16px' }] },
      { selectors: ['#icon'], children: [{ property: 'display', value: 'block' }] },
    ] }],
  });
});
test('balanced values, escaped selectors, quotes and comments preserve boundaries', () => {
  const source = '/* hi */ a:hover, [data-x="a,b"], :is(.a, .b), .foo\\,bar { content: "a;}:b"; width: calc(100% - 2px); --theme: { color: red; }; }';
  const v: any = parse(source);
  assert.equal(v.children[0].selectors.length, 4);
  assert.equal(v.children[0].children.length, 3);
  assert.deepEqual(parse(stringify(v)), v);
});
test('at rules, empty blocks, optional final semicolon and JSON encoding', () => {
  const source = '@import "base.css"; @media (width > 600px) { .a {} } @font-face { font-family: Demo; src: url(font.woff2) }';
  const v: any = parse(source);
  assert.equal(v.children.length, 3);
  assert.deepEqual(JSON.parse(parse(source, { output: 'json' })), v);
  assert.deepEqual(parse(stringify(parse(source, { output: 'json' }), { input: 'json' })), v);
  assert.deepEqual(parse(' /* empty */ '), { children: [] });
});
test('rejects malformed syntax rather than returning partial results', () => {
  for (const source of ['a { color red; }', 'a { color: "x; }', 'a { color: (x]; }', 'a { color: x;', 'a {} trailing', 'a, {}', 'color: red;', 'a { /* no end', 'a }']) {
    assert.throws(() => parse(source), SyntaxError, source);
  }
});
test('bounds recursive nesting and rejects invalid inverse data', () => {
  assert.throws(() => parse('a {'.repeat(300) + '}'.repeat(300)), /nesting/i);
  assert.throws(() => stringify({ children: [{ property: 'x', value: 'y' }] }), /represent/i);
  const v: any = parse('a { color: red; }');
  v.children[0].children[0].value = 'red; width: 1px';
  assert.throws(() => stringify(v), /represent|round.trip/i);
});
test('mixed stylesheet constructs remain value-stable', () => {
  const samples = [
    '@supports (display: grid) { @media screen { a:is(.b,.c) { display: grid!important; } } }',
    '@keyframes spin { from { transform: rotate(0deg); } 50%, to { transform: rotate(360deg); } }',
    '@layer reset, theme; @layer theme { :root { --empty: ; --list: [one, two]; } }',
    'a { color: red /* trailing */; /* between */ padding: 0; }',
    '.escaped\\:name { background: url(data:image/svg+xml;base64,abcd); }',
  ];
  for(const source of samples) {
    const value=parse(source);
    assert.deepEqual(parse(stringify(value)),value,source);
  }
});
