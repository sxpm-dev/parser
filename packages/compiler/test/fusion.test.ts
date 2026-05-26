import assert from 'node:assert/strict';
import test from 'node:test';
import { generateParser } from '../src/index.ts';

// Task 5.1 codegen check. The compiler must emit per-(production, target) fused
// render functions for template-body renders. We exercise it against markdown's
// h1 heading, which is the smallest template body in the suite (one literal
// `# `, one .until() text capture, html target `<h1>${$.text}</h1>`).
//
// The h1 production is alt 5 of the multi-alt `MarkdownLeaf` node (depth 6
// → depth 1 declared in that order in packages/markdown/src/schema.ts).
test('fusion: markdown MarkdownLeaf#5 html target emits a fused render function', async () => {
  const schema = (await import('../../markdown/src/schema.ts')).default;
  const src = generateParser(schema, undefined, { packageName: 'markdown' });
  // The fused html-target builder for MarkdownLeaf#5 must exist. The shape
  // `__fusedRender_<NodeType>_<prodIdx>_<target>` is the contract Task 5.2
  // will dispatch through.
  assert.match(src, /function __fusedRender_MarkdownLeaf_5_html/);
  // The fused body writes the rendered string directly to a pushable `out`
  // buffer; no `{` followed by `type:` (the marker of an AST object literal).
  const fnMatch = src.match(/function __fusedRender_MarkdownLeaf_5_html[\s\S]*?\n}/);
  assert.ok(fnMatch, 'fused render function source must be locatable');
  const body = fnMatch![0];
  assert.ok(!/\{\s*type:/.test(body), 'fused html body must not allocate AST objects');
});
