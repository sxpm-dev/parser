import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

test('html case-insensitive: <DIV> and <div> produce identical AST', () => {
  const uppercaseAst = render('<DIV>foo</DIV>', { type: 'ast' });
  const lowercaseAst = render('<div>foo</div>', { type: 'ast' });
  assert.deepEqual(uppercaseAst, lowercaseAst);
});

test('html case-insensitive: <Script> opens a raw-text element', () => {
  // Tag name is mixed-case; the inside is a `<` that would normally start
  // a child element, but inside <script> raw text it's just data.
  const ast = render('<Script>var x = 1 < 2;</Script>', { type: 'ast' });
  // Sanity: the AST should not show a nested element for `< 2`. The
  // script body is captured as raw text.
  const json = JSON.stringify(ast);
  assert.ok(!json.includes('"<"'), 'no nested element for `<` inside <Script>');
});

test('html case-insensitive: attribute names are lowercased', () => {
  const ast = render('<a HREF="x">y</a>', { type: 'ast' }) as { [k: string]: unknown };
  const json = JSON.stringify(ast);
  // The attribute name in the AST should be 'href', not 'HREF'.
  assert.ok(json.includes('"href"'), `expected lowercase 'href' in AST: ${json}`);
  assert.ok(!json.includes('"HREF"'), `should not see uppercase 'HREF' in AST: ${json}`);
});

test('html case-insensitive: <BR> void element parses without close tag', () => {
  // BR is in VOID_TAGS — should parse without requiring </br>.
  const ast = render('<BR>', { type: 'ast' });
  assert.ok(ast, 'parse should succeed for <BR>');
});
