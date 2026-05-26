// Reference-interpreter render-path tests (Task 2.2). For each in-scope
// schema we compare `interpretRenderFromInput(inferred, input, target)`
// against the v2-generated parser's `render(input, { type: target })`
// across multiple example inputs and every target the schema declares
// (excluding 'ast', which is covered by interp.test.ts).
//
// The interpreter is the slow trust-anchor for Task 2.4's differential
// fuzzer. Equivalence here is what gives Phase 3+ features (round-trip
// closure check, dispatch totality, etc.) a clean ground truth to lean
// on. Add tests here when extending interpreter functionality.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import markdownSchema from '../../markdown/src/schema.ts';
import cssSchema from '../../css/src/schema.ts';
import htmlSchema from '../../html/src/schema.ts';
import { inferSchema } from '../src/index.ts';
import { interpretRenderFromInput } from '../src/interp/render.ts';

type RenderFn = (input: string, options?: { type?: string }) => unknown;

// --- Markdown ---------------------------------------------------------------

const markdownInferred = inferSchema(markdownSchema);

const markdownInputs: ReadonlyArray<string> = [
  '# Release notes',
  '## Installation guide',
  '### API reference',
  '#### Deep section',
  '##### Small section',
  '###### Tiny heading',
  '> quoted text',
  '- first item',
  '+ alternate marker',
  '* star marker',
  '1. ordered item',
  '[docs](https://example.com)',
  '![diagram](https://example.com/diagram.png)',
  '**bold**',
  '*italic*',
  '~~removed~~',
  '`code`',
  '---',
  '***',
  '___',
  'Plain paragraph',
];

let markdownRender: RenderFn | null = null;
async function getMarkdownRender(): Promise<RenderFn> {
  if (markdownRender) return markdownRender;
  const mod = (await import('../../markdown/src/_generated/parser.ts')) as { render: RenderFn };
  markdownRender = mod.render;
  return markdownRender;
}

for (const input of markdownInputs) {
  test(`interp render markdown html — ${JSON.stringify(input)}`, async () => {
    const render = await getMarkdownRender();
    const fromInterp = interpretRenderFromInput(markdownInferred, input, 'html');
    const fromV2 = render(input, { type: 'html' });
    assert.equal(
      fromInterp,
      fromV2,
      `interp vs v2 html mismatch for input: ${JSON.stringify(input)}`,
    );
  });

  test(`interp render markdown source — ${JSON.stringify(input)}`, async () => {
    const render = await getMarkdownRender();
    const fromInterp = interpretRenderFromInput(markdownInferred, input, 'source');
    const fromV2 = render(input, { type: 'source' });
    assert.equal(
      fromInterp,
      fromV2,
      `interp vs v2 source mismatch for input: ${JSON.stringify(input)}`,
    );
  });
}

// --- CSS --------------------------------------------------------------------
//
// CSS declares 'ast' and 'source' targets. We only render 'source' here
// because 'ast' is covered by interp.test.ts. The interpreter doesn't
// recompute byte-for-byte source positions, but the source target is a
// fused-template projection so the textual output must match v2.

const cssInferred = inferSchema(cssSchema);

const cssInputs: ReadonlyArray<string> = [
  'a { color: red; }',
  'a { color: red; background: blue; }',
  '.foo { margin: 0; }',
  '#bar { padding: 5px; }',
  'a { color: red !important; }',
  'body { font-size: 14px; }',
  '@media (min-width: 600px) { a { color: blue; } }',
  '@import "foo.css";',
  'a, b { color: green; }',
  '/* a comment */ a { color: red; }',
];

let cssRender: RenderFn | null = null;
async function getCssRender(): Promise<RenderFn> {
  if (cssRender) return cssRender;
  const mod = (await import('../../css/src/_generated/parser.ts')) as { render: RenderFn };
  cssRender = mod.render;
  return cssRender;
}

for (const input of cssInputs) {
  test(`interp render css source — ${JSON.stringify(input)}`, async () => {
    const render = await getCssRender();
    const fromInterp = interpretRenderFromInput(cssInferred, input, 'source');
    const fromV2 = render(input, { type: 'source' });
    assert.equal(
      fromInterp,
      fromV2,
      `interp vs v2 css source mismatch for input: ${JSON.stringify(input)}`,
    );
  });
}

// --- HTML -------------------------------------------------------------------
//
// HTML declares 'ast' and 'source' targets. We only render 'source' here.

const htmlInferred = inferSchema(htmlSchema);

const htmlInputs: ReadonlyArray<string> = [
  '<p>hello</p>',
  '<div>hi</div>',
  '<span>text</span>',
  '<a href="x">link</a>',
  '<img src="x.png">',
  '<br>',
  '<hr>',
  '<input type="text">',
  '<!-- comment -->',
  '<p>hello <b>world</b></p>',
];

let htmlRender: RenderFn | null = null;
async function getHtmlRender(): Promise<RenderFn> {
  if (htmlRender) return htmlRender;
  const mod = (await import('../../html/src/_generated/parser.ts')) as { render: RenderFn };
  htmlRender = mod.render;
  return htmlRender;
}

for (const input of htmlInputs) {
  test(`interp render html source — ${JSON.stringify(input)}`, async () => {
    const render = await getHtmlRender();
    const fromInterp = interpretRenderFromInput(htmlInferred, input, 'source');
    const fromV2 = render(input, { type: 'source' });
    assert.equal(
      fromInterp,
      fromV2,
      `interp vs v2 html source mismatch for input: ${JSON.stringify(input)}`,
    );
  });
}
