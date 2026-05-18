import assert from 'node:assert/strict';
import test from 'node:test';
import { countTokens, parse, stringify, tokenize } from '../src/index.ts';

test('tokenizes a simple rule', () => {
  assert.deepEqual(
    tokenize('.foo { color: red; }').map((token) => [token.type, token.value]),
    [
      ['delim', '.'],
      ['ident', 'foo'],
      ['whitespace', ' '],
      ['lbrace', '{'],
      ['whitespace', ' '],
      ['ident', 'color'],
      ['colon', ':'],
      ['whitespace', ' '],
      ['ident', 'red'],
      ['semicolon', ';'],
      ['whitespace', ' '],
      ['rbrace', '}'],
    ],
  );
});

test('parses rules, at-rules, declarations, and nested blocks', () => {
  assert.deepEqual(parse('@media screen { .foo:hover { margin: calc(100% - 1px); color: red } }'), {
    type: 'stylesheet',
    nodes: [
      {
        type: 'atrule',
        name: 'media',
        prelude: 'screen',
        nodes: [
          {
            type: 'rule',
            selector: '.foo:hover',
            nodes: [
              { type: 'decl', prop: 'margin', value: 'calc(100% - 1px)' },
              { type: 'decl', prop: 'color', value: 'red' },
            ],
          },
        ],
      },
    ],
  });
});

test('stringifies normalized CSS AST', () => {
  const ast = parse('.foo { color: red; margin: 1px !important }');
  assert.equal(stringify(ast), '.foo{color:red;margin:1px !important;}');
});

test('keeps braces inside strings out of parser structure', () => {
  const ast = parse('[data-state="open"]::before { content: "{ item; }"; }');
  assert.equal(ast.nodes[0]?.type, 'rule');
  assert.equal(ast.nodes[0]?.nodes[0]?.type, 'decl');
  assert.equal(ast.nodes[0]?.nodes[0]?.value, '"{ item; }"');
});

test('tokenizes core CSS Syntax tokens beyond simple identifiers', () => {
  const tokens = tokenize('<!-- @media u+a0-ff { .\\\\31 0#id { content: "x"; src: url(font.woff2); width: 1e3px; } } -->');
  assert.deepEqual(
    tokens.filter((token) => token.type !== 'whitespace').map((token) => token.type),
    [
      'cdo',
      'atKeyword',
      'unicodeRange',
      'lbrace',
      'delim',
      'ident',
      'hash',
      'lbrace',
      'ident',
      'colon',
      'string',
      'semicolon',
      'ident',
      'colon',
      'url',
      'semicolon',
      'ident',
      'colon',
      'dimension',
      'semicolon',
      'rbrace',
      'rbrace',
      'cdc',
    ],
  );
});

test('counts tokens with the same coverage as tokenize', () => {
  const input = [
    '.card, #panel { color: red; margin: 1px 2px; background: url("asset.svg"); }',
    '@media screen and (max-width: 720px) { .card:hover { transform: translate(1px, 2px); } }',
    '/* theme */ [data-state="open"]::before { content: "{ item; }"; padding: calc(100% - 1px); }',
  ].join('\n');
  assert.equal(countTokens(input), tokenize(input).length);
});

test('parses representative modern CSS constructs', () => {
  const ast = parse(`
    @charset "utf-8";
    @layer reset, theme;
    @font-face { font-family: "Inter"; src: url(inter.woff2) format("woff2"); unicode-range: U+000-5FF; }
    @supports selector(:has(a > img)) {
      @container card (width > 30rem) {
        .card:has(> img), [data-state="open"]::before {
          --gap: clamp(1rem, 2vw, 2rem);
          color: color-mix(in oklab, red 20%, blue);
          background-image: url("asset{1}.svg");
        }
      }
    }
    @keyframes fade { from { opacity: 0 } 50% { opacity: .5 } to { opacity: 1 } }
  `);

  assert.equal(ast.nodes.length, 5);
  assert.equal(ast.nodes[0]?.type, 'atrule');
  assert.equal(ast.nodes[1]?.type, 'atrule');
  assert.equal(ast.nodes[2]?.type, 'atrule');
  assert.equal(ast.nodes[3]?.type, 'atrule');
  assert.equal(ast.nodes[4]?.type, 'atrule');

  const fontFace = ast.nodes[2];
  assert.equal(fontFace.type, 'atrule');
  assert.equal(fontFace.name, 'font-face');
  assert.equal(fontFace.nodes?.length, 3);

  const supports = ast.nodes[3];
  assert.equal(supports.type, 'atrule');
  const container = supports.nodes?.[0];
  assert.equal(container?.type, 'atrule');
  const rule = container?.nodes?.[0];
  assert.equal(rule?.type, 'rule');
  assert.equal(rule?.nodes.length, 3);

  const keyframes = ast.nodes[4];
  assert.equal(keyframes.type, 'atrule');
  assert.equal(keyframes.nodes?.map((node) => node.type).join(','), 'rule,rule,rule');
});

test('recovers past malformed declarations and preserves following rules', () => {
  const ast = parse('.a { color red; background: blue; } .b { width: 1px; }');
  assert.equal(ast.nodes.length, 2);
  assert.equal(ast.nodes[0]?.type, 'rule');
  assert.deepEqual(ast.nodes[0]?.nodes, [{ type: 'decl', prop: 'background', value: 'blue' }]);
  assert.equal(ast.nodes[1]?.type, 'rule');
});
