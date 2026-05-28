import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

// Structured-access helpers for AST nodes. The HTML AST shape mirrors
// parse5's: each element is { nodeName, tagName, namespaceURI, attrs,
// childNodes, parentNode }, plus a few `_`-prefixed fields used by the
// inverse dispatcher (which we ignore for these assertions).
type Element = {
  nodeName: string;
  tagName: string;
  attrs: ReadonlyArray<{ name: string; value: string }>;
  childNodes: ReadonlyArray<unknown>;
};
type TextNode = { nodeName: '#text'; value: string };
type Doc = { childNodes: ReadonlyArray<Element> };

test('html case-insensitive: <DIV> and <div> produce identical AST', () => {
  const uppercaseAst = render('<DIV>foo</DIV>', { target: 'ast' });
  const lowercaseAst = render('<div>foo</div>', { target: 'ast' });
  assert.deepEqual(uppercaseAst, lowercaseAst);
});

test('html case-insensitive: <Script> opens a raw-text element', () => {
  // Tag name is mixed-case; the body contains `<` which would normally
  // start a child element, but inside <script> raw text it's just data.
  // Pin down the structural property: the script element has exactly one
  // child (a text node) whose value contains the literal `< 2;` substring.
  const ast = render('<Script>var x = 1 < 2;</Script>', { target: 'ast' }) as Doc;
  const script = ast.childNodes[0] as Element;
  assert.equal(script.tagName, 'script', 'top-level child should be a <script> element');
  assert.equal(script.childNodes.length, 1, 'script body should be a single text node');
  const body = script.childNodes[0] as TextNode;
  assert.equal(body.nodeName, '#text');
  assert.ok(
    body.value.includes('< 2;'),
    `script body should contain raw '< 2;'; got: ${JSON.stringify(body.value)}`,
  );
});

test('html case-insensitive: attribute names are lowercased', () => {
  // Structured access into attrs[0].name pins down the actual field.
  const ast = render('<a HREF="x">y</a>', { target: 'ast' }) as Doc;
  const anchor = ast.childNodes[0] as Element;
  assert.equal(anchor.tagName, 'a');
  assert.equal(anchor.attrs.length, 1);
  assert.equal(anchor.attrs[0]!.name, 'href');
  assert.equal(anchor.attrs[0]!.value, 'x');
});

test('html case-insensitive: <BR> void element parses without close tag', () => {
  // Pin down void-element shape: tagName 'br' with empty childNodes.
  const ast = render('<BR>', { target: 'ast' }) as Doc;
  const br = ast.childNodes[0] as Element;
  assert.equal(br.tagName, 'br');
  assert.equal(br.childNodes.length, 0, '<br> is a void element — no children');
});
