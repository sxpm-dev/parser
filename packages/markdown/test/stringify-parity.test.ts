import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, render, stringify } from '../src/index.ts';

// For every (input, target) pair, the fused render(input, target) must
// match the two-pass stringify(parse(input), target). This is the load-
// bearing contract — keeping both codepaths pinned to the same template
// means authoring drift is impossible.
const inputs = [
  '# Release notes',
  '## Installation guide',
  'Plain paragraph',
  '- first item',
  '+ alternate marker',
  '1. ordered item',
  '> quoted text',
  '---',
  '**bold**',
  '*italic*',
  '~~removed~~',
  '`code`',
  '[docs](https://example.com)',
  '[docs][id]',
  '![diagram](https://example.com/diagram.png)',
  '![diagram][image-id]',
  '<https://example.com>',
  '&amp;',
  '```js\nsample\n```',
  '```\nplain\n```',
  '| name | value |',
  '[id]: https://example.com',
  '[^1]: footnote text',
  '[^1]',
  '<div>html</div>',
];

const targets = ['source', 'html'];

for (const input of inputs) {
  for (const target of targets) {
    test(`parity ${target}: ${JSON.stringify(input).slice(0, 40)}`, () => {
      const direct = render(input, { target });
      const indirect = stringify(parse(input), { target });
      assert.equal(direct, indirect);
    });
  }
}
