import assert from 'node:assert/strict';
import test from 'node:test';
import { countTokens, parse, tokenize, validate } from '../src/index.ts';

test('html parses repeated top-level element nodes from schema examples', () => {
  assert.deepEqual(parse('<div>Hello</div><p>World</p>'), {
    type: 'document',
    children: [
      {
        type: 'element',
        tagName: 'div',
        attributes: [],
        children: [{ type: 'text', value: 'Hello' }],
        closeTag: 'div',
      },
      {
        type: 'element',
        tagName: 'p',
        attributes: [],
        children: [{ type: 'text', value: 'World' }],
        closeTag: 'p',
      },
    ],
  });
});

test('html parses attributes and boolean attributes through Attribute node repeats', () => {
  assert.deepEqual(parse('<section class="hero" disabled>Hello world</section>'), {
    type: 'document',
    children: [
      {
        type: 'element',
        tagName: 'section',
        attributes: [
          { type: 'attribute', name: 'class', value: '"hero"' },
          { type: 'attribute', name: 'disabled' },
        ],
        children: [{ type: 'text', value: 'Hello world' }],
        closeTag: 'section',
      },
    ],
  });
});

test('html parses doctype and self-closing elements from schema productions', () => {
  assert.deepEqual(parse('<!doctype html><br />'), {
    type: 'document',
    children: [
      { type: 'doctype', name: 'html' },
      {
        type: 'element',
        tagName: 'br',
        attributes: [],
        children: [],
        selfClosing: true,
      },
    ],
  });
});

test('html supports source locations in raws mode', () => {
  const ast = parse('<div>Hello</div>', { mode: 'raws' }) as {
    readonly source?: { readonly start: { readonly line: number }; readonly end: { readonly line: number } };
    readonly children: readonly { readonly source?: { readonly start: { readonly line: number }; readonly end: { readonly line: number } } }[];
  };
  assert.deepEqual(ast.source?.start, { line: 1, column: 1, offset: 0 });
  assert.deepEqual(ast.source?.end, { line: 1, column: 16, offset: 16 });
  assert.equal(ast.children[0]?.source?.start.line, 1);
  assert.equal(ast.children[0]?.source?.end.line, 1);
});

test('html tokenizes and counts tokens', () => {
  const tokens = tokenize('<div class="x">Hi</div>');
  assert.deepEqual(tokens.map((token) => token.type), [
    'lt',
    'ident',
    'ident',
    'equals',
    'string',
    'gt',
    'ident',
    'closeTagOpen',
    'ident',
    'gt',
  ]);
  assert.equal(countTokens('<br><hr>'), 6);
});

test('html validates rejected syntax', () => {
  assert.throws(() => validate('<div><span></span></div>'), SyntaxError);
  assert.throws(() => validate('<div class="x></div>'), SyntaxError);
  assert.throws(() => validate('text</span>'), SyntaxError);
});
