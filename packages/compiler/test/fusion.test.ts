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

// Task 5.2 wiring-shape check. The compiler must emit a `__renderFused`
// entry function AND the public `render()` body must call it BEFORE
// dispatching to the captures path. The exact sequence ensures the fast
// path is preferred whenever a fused root entry exists; targets without
// a root entry get a null and fall through.
test('fusion: render() entry tries __renderFused before __renderDispatch', async () => {
  const schema = (await import('../../markdown/src/schema.ts')).default;
  const src = generateParser(schema, undefined, { packageName: 'markdown' });
  // The fused entry function must be present unconditionally.
  // F1/F2: `__renderFused` now serves BOTH Template/string targets AND
  // structured-object targets, so its return type widened from
  // `string | null` to `unknown` (caller still treats null as "fall through
  // to captures path"). The body must still consult __fusedRenderDispatchLookup.
  assert.match(src, /function __renderFused\(input: string, target: string\): unknown/);
  // The dispatch lookup must be emitted.
  assert.match(src, /function __fusedRenderDispatchLookup\(target: string\)/);
  // Root production key must be the rootType#0 string.
  assert.match(src, /const __rootProductionKey: string = "MarkdownDocument#0";/);
  // Public render() body — match it as a single chunk and verify the
  // __renderFused call appears BEFORE the __renderDispatch lookup.
  const renderMatch = src.match(/export function render\(input: string, options\?: \{[^}]*?\}\): unknown \{[\s\S]*?\n\}/);
  assert.ok(renderMatch, 'public render() body must be locatable');
  const body = renderMatch![0];
  const fusedIdx = body.indexOf('__renderFused(');
  const dispatchIdx = body.indexOf('__renderDispatch[');
  assert.ok(fusedIdx >= 0, 'render() must call __renderFused');
  assert.ok(dispatchIdx >= 0, 'render() must still reference __renderDispatch (fallback)');
  assert.ok(fusedIdx < dispatchIdx, '__renderFused call must precede __renderDispatch lookup');
});

// Task 5.2 runtime regression. The public render() must produce the
// correct html for a minimal markdown input. The markdown root has a
// recursive `children` slot so the fused path returns null for it and
// the captures fallback handles the call — that's the expected path
// for Task 5.2 (Task 5.3 closes recursive eligibility).
test('fusion: markdown render(input, {type:html}) produces correct html via fused path', async () => {
  const { render } = await import('../../markdown/src/index.ts');
  assert.equal(render('# Hello\n', { target: 'html' }), '<h1>Hello</h1>');
});

// Task 5.3 — recursive children fusion. With the eligibility check
// relaxed and the per-span streamed-slot mechanism in place, markdown's
// MarkdownDocument#0 (`tpl\`${$.children}\`` over a recursive .repeats()
// slot) now fuses end-to-end. The runtime test below exercises the
// fused path for a multi-block document; it depends on the fused
// builder actually being reachable (sanity-checked in the second 5.3
// test below).
test('fusion: markdown Document renders complete document html', async () => {
  const { render } = await import('../../markdown/src/index.ts');
  const md = '# Heading\n\nParagraph text.\n';
  const html = render(md, { target: 'html' }) as string;
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<p>Paragraph text\.<\/p>/);
});

// Task 5.3 codegen sanity — the root production's fused builder must
// now exist in the generated parser. Without this, the previous runtime
// test could still pass via the captures fallback and we'd never notice
// fusion hadn't closed the recursive gap. Cf. the "5.2 reviewer flagged
// no test exercises the fused path" note in the Task 5.3 plan.
test('fusion: markdown Document fused builder is emitted for {type:html}', async () => {
  const schema = (await import('../../markdown/src/schema.ts')).default;
  const src = generateParser(schema, undefined, { packageName: 'markdown' });
  // The fused entry for MarkdownDocument#0 must exist — proves the
  // recursive `children` slot is fusable post-Task 5.3.
  assert.match(src, /function __fusedRender_MarkdownDocument_0_html/);
  // And the dispatch table must list it under the html target so the
  // root lookup in __renderFused finds it.
  assert.match(
    src,
    /__fusedRenderDispatch_html[\s\S]*?"MarkdownDocument#0":\s*__fusedRender_MarkdownDocument_0_html/,
  );
});
