import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from '../src/index.ts';

// Render is called on the whole document; each example wraps inside the
// MarkdownDocument root, so the leaf templates are surrounded by the
// document template (which is just `${$.children}` — pass-through). The
// expected HTML below is therefore the leaf's HTML directly.
type Case = { input: string; html: string };

const cases: Case[] = [
  { input: '# Release notes', html: '<h1>Release notes</h1>' },
  { input: '## Installation guide', html: '<h2>Installation guide</h2>' },
  { input: '### API reference', html: '<h3>API reference</h3>' },
  { input: '#### Deep section', html: '<h4>Deep section</h4>' },
  { input: '##### Small section', html: '<h5>Small section</h5>' },
  { input: '###### Tiny heading', html: '<h6>Tiny heading</h6>' },
  { input: 'Setext heading\n---', html: '<h2>Setext heading</h2>' },
  { input: 'Plain paragraph', html: '<p>Plain paragraph</p>' },
  { input: '- first item', html: '<li>first item</li>' },
  { input: '+ alternate marker', html: '<li>alternate marker</li>' },
  { input: '* star marker', html: '<li>star marker</li>' },
  { input: '1. ordered item', html: '<li>ordered item</li>' },
  { input: '- [x] completed task', html: '<li><input type="checkbox" checked>completed task</li>' },
  { input: '- [ ] pending task', html: '<li><input type="checkbox">pending task</li>' },
  { input: '> quoted text', html: '<blockquote>quoted text</blockquote>' },
  { input: '---', html: '<hr>' },
  { input: '***', html: '<hr>' },
  { input: '___', html: '<hr>' },
  { input: '**bold**', html: '<strong>bold</strong>' },
  { input: '*italic*', html: '<em>italic</em>' },
  { input: '~~removed~~', html: '<s>removed</s>' },
  { input: '`code`', html: '<code>code</code>' },
  { input: '[docs](https://example.com)', html: '<a href="https://example.com">docs</a>' },
  { input: '[docs][id]', html: '<a href="#id">docs</a>' },
  { input: '![diagram](https://example.com/diagram.png)', html: '<img src="https://example.com/diagram.png" alt="diagram">' },
  { input: '![diagram][image-id]', html: '<img src="#image-id" alt="diagram">' },
  { input: '<https://example.com>', html: '<a class="autolink" href="https://example.com">https://example.com</a>' },
  { input: '&amp;', html: '&amp;' },
  { input: '```js\nsample\n```', html: '<pre><code class="lang-js">sample</code></pre>' },
  { input: '```\nplain\n```', html: '<pre><code>plain</code></pre>' },
  { input: '| name | value |', html: '<tr><td>name</td><td>value</td></tr>' },
  { input: '| --- | --- |', html: '' },
  { input: '|:---|---:|', html: '' },
  { input: '[id]: https://example.com', html: '' },
  { input: '[^1]: footnote text', html: '<div class="footnote" id="fn1">footnote text</div>' },
  { input: '[^1]', html: '<sup><a href="#fn1">1</a></sup>' },
  { input: '<div>html</div>', html: '<div>html</div>' },
];

for (const { input, html } of cases) {
  test(`render html: ${JSON.stringify(input).slice(0, 60)}`, () => {
    assert.equal(render(input, { type: 'html' }), html);
  });
}
