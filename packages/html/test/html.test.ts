import assert from 'node:assert/strict';
import test from 'node:test';
import { countTokens, parse, tokenize, validate } from '../src/index.ts';

const HTML_NS = 'http://www.w3.org/1999/xhtml';

test('html parses repeated top-level element nodes from schema examples', () => {
  assert.deepEqual(parse('<div>Hello</div><p>World</p>'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      {
        nodeName: 'div',
        tagName: 'div',
        namespaceURI: HTML_NS,
        attrs: [],
        childNodes: [{ nodeName: '#text', value: 'Hello', parentNode: null }],
        parentNode: null,
      },
      {
        nodeName: 'p',
        tagName: 'p',
        namespaceURI: HTML_NS,
        attrs: [],
        childNodes: [{ nodeName: '#text', value: 'World', parentNode: null }],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses attributes and boolean attributes through Attribute node repeats', () => {
  assert.deepEqual(parse('<section class="hero" disabled>Hello world</section>'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      {
        nodeName: 'section',
        tagName: 'section',
        namespaceURI: HTML_NS,
        attrs: [
          { name: 'class', value: 'hero' },
          { name: 'disabled', value: '' },
        ],
        childNodes: [{ nodeName: '#text', value: 'Hello world', parentNode: null }],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses doctype and self-closing elements from schema productions', () => {
  assert.deepEqual(parse('<!doctype html><br />'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      {
        nodeName: '#documentType',
        name: 'html',
        publicId: '',
        systemId: '',
        parentNode: null,
      },
      {
        nodeName: 'br',
        tagName: 'br',
        namespaceURI: HTML_NS,
        attrs: [],
        childNodes: [],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses nested elements and mixed text/element children', () => {
  assert.deepEqual(parse('<div><span>x</span><em>y</em></div>'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      {
        nodeName: 'div',
        tagName: 'div',
        namespaceURI: HTML_NS,
        attrs: [],
        childNodes: [
          {
            nodeName: 'span',
            tagName: 'span',
            namespaceURI: HTML_NS,
            attrs: [],
            childNodes: [{ nodeName: '#text', value: 'x', parentNode: null }],
            parentNode: null,
          },
          {
            nodeName: 'em',
            tagName: 'em',
            namespaceURI: HTML_NS,
            attrs: [],
            childNodes: [{ nodeName: '#text', value: 'y', parentNode: null }],
            parentNode: null,
          },
        ],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses void elements without trailing slash', () => {
  assert.deepEqual(parse('<br><hr><img src="x.png">'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      { nodeName: 'br', tagName: 'br', namespaceURI: HTML_NS, attrs: [], childNodes: [], parentNode: null },
      { nodeName: 'hr', tagName: 'hr', namespaceURI: HTML_NS, attrs: [], childNodes: [], parentNode: null },
      {
        nodeName: 'img',
        tagName: 'img',
        namespaceURI: HTML_NS,
        attrs: [{ name: 'src', value: 'x.png' }],
        childNodes: [],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses single-quoted and unquoted ident-shape attribute values', () => {
  assert.deepEqual(parse(`<a class='hero' lang=en-GB>x</a>`), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      {
        nodeName: 'a',
        tagName: 'a',
        namespaceURI: HTML_NS,
        attrs: [
          { name: 'class', value: 'hero' },
          { name: 'lang', value: 'en-GB' },
        ],
        childNodes: [{ nodeName: '#text', value: 'x', parentNode: null }],
        parentNode: null,
      },
    ],
    parentNode: null,
  });
});

test('html parses HTML comments', () => {
  // NOTE: surrounding whitespace inside the comment body is lost because
  // tokenization skips whitespace and `.until()` slices by token offsets.
  // Also, the ident scanner is greedy with `-`, so `<!--hi-->` won't parse
  // (the `--` gets absorbed into the ident). Whitespace between body and
  // close (`<!--hi -->`) is required today. Both limitations are tracked in
  // the design-doc parking lot.
  assert.deepEqual(parse('<!-- hello -->'), {
    nodeName: '#document',
    mode: 'no-quirks',
    childNodes: [
      { nodeName: '#comment', data: 'hello', parentNode: null },
    ],
    parentNode: null,
  });
});

test('html parses attribute values containing URL-shape characters', () => {
  const ast = parse('<a href="/foo/bar?x=1">link</a>') as {
    childNodes: readonly { attrs: readonly { name: string; value: string }[] }[];
  };
  assert.equal(ast.childNodes[0]?.attrs[0]?.value, '/foo/bar?x=1');
});

test('html parses unquoted attribute values with URL-shape characters', () => {
  const ast = parse('<a href=https://example.com/path?x=1>link</a>') as {
    childNodes: readonly { attrs: readonly { name: string; value: string }[] }[];
  };
  assert.equal(ast.childNodes[0]?.attrs[0]?.value, 'https://example.com/path?x=1');
});

test('html parses script and style raw-text content with `<` inside', () => {
  const ast = parse('<script>if (a < b) {}</script>') as {
    childNodes: readonly { childNodes: readonly { value: string }[] }[];
  };
  assert.equal(ast.childNodes[0]?.childNodes[0]?.value, 'if (a < b) {}');
  const css = parse('<style>.foo { color: red; }</style>') as {
    childNodes: readonly { childNodes: readonly { value: string }[] }[];
  };
  assert.equal(css.childNodes[0]?.childNodes[0]?.value, '.foo { color: red; }');
});

test('html tokenizer tolerates non-ASCII bytes (em-dash, accents, emoji)', () => {
  const ast = parse('<p>Héllo — wörld 🌍</p>') as {
    childNodes: readonly { childNodes: readonly { value: string }[] }[];
  };
  assert.equal(ast.childNodes[0]?.childNodes[0]?.value, 'Héllo — wörld 🌍');
});

test('html supports source locations in raws mode', () => {
  const ast = parse('<div>Hello</div>', { mode: 'raws' }) as {
    readonly source?: { readonly start: { readonly line: number }; readonly end: { readonly line: number } };
    readonly childNodes: readonly { readonly source?: { readonly start: { readonly line: number }; readonly end: { readonly line: number } } }[];
  };
  assert.deepEqual(ast.source?.start, { line: 1, column: 1, offset: 0 });
  assert.deepEqual(ast.source?.end, { line: 1, column: 16, offset: 16 });
  assert.equal(ast.childNodes[0]?.source?.start.line, 1);
  assert.equal(ast.childNodes[0]?.source?.end.line, 1);
});

test('html tokenizes and counts tokens', () => {
  const tokens = tokenize('<div class="x">Hi</div>');
  assert.deepEqual(tokens.map((token) => token.type), [
    'lt',
    'ident',
    'ident',
    'equals',
    'dq',
    'ident',
    'dq',
    'gt',
    'ident',
    'closeTagOpen',
    'ident',
    'gt',
  ]);
  assert.equal(countTokens('<br><hr>'), 6);
});

test('html validates rejected syntax', () => {
  // Truncated attribute (unterminated quoted value) fails.
  assert.throws(() => validate('<div class="x>x</div>'), SyntaxError);
  // Close tag without matching open at top level fails (unconsumed tokens).
  assert.throws(() => validate('text</span>'), SyntaxError);
  // Unclosed element at EOF fails (until recovery codegen lands).
  assert.throws(() => validate('<div>x'), SyntaxError);
  // Bare `<` with nothing after fails (no production matches).
  assert.throws(() => validate('<'), SyntaxError);
  // NOTE: tag-name mismatch like `<div>x</span>` is NOT rejected today —
  // closeTag is captured as any ident with no enforced equality to the open
  // tag. Enforcing this requires either a new schema primitive
  // (`.matches($.tag)`) or recovery semantics. Parked for Phase III.
});
