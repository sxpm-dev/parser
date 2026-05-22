import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

type Case = {
  readonly name: string;
  readonly input: string;
  readonly expected: unknown;
};

const blockCases: Case[] = [
  {
    name: 'paragraph',
    input: 'Plain paragraph',
    expected: { type: 'paragraph', text: ['Plain', 'paragraph'] },
  },
  {
    name: 'atx heading depth 1',
    input: '# Release notes',
    expected: { type: 'heading', depth: 1, text: ['Release', 'notes'] },
  },
  {
    name: 'atx heading depth 2',
    input: '## Installation guide',
    expected: { type: 'heading', depth: 2, text: ['Installation', 'guide'] },
  },
  {
    name: 'atx heading depth 3',
    input: '### API reference',
    expected: { type: 'heading', depth: 3, text: ['API', 'reference'] },
  },
  {
    name: 'atx heading depth 4',
    input: '#### Deep section',
    expected: { type: 'heading', depth: 4, text: ['Deep', 'section'] },
  },
  {
    name: 'atx heading depth 5',
    input: '##### Small section',
    expected: { type: 'heading', depth: 5, text: ['Small', 'section'] },
  },
  {
    name: 'atx heading depth 6',
    input: '###### Tiny heading',
    expected: { type: 'heading', depth: 6, text: ['Tiny', 'heading'] },
  },
  {
    name: 'setext heading',
    input: 'Setext heading\n---',
    expected: { type: 'heading', depth: 2, text: ['Setext', 'heading'], style: 'setext' },
  },
  {
    name: 'dash unordered list item',
    input: '- first item',
    expected: { type: 'list-item', ordered: false, text: ['first', 'item'] },
  },
  {
    name: 'plus unordered list item',
    input: '+ alternate marker',
    expected: { type: 'list-item', ordered: false, marker: '+', text: ['alternate', 'marker'] },
  },
  {
    name: 'star unordered list item',
    input: '* star marker',
    expected: { type: 'list-item', ordered: false, marker: '*', text: ['star', 'marker'] },
  },
  {
    name: 'ordered list item',
    input: '1. ordered item',
    expected: { type: 'list-item', ordered: true, index: '1', text: ['ordered', 'item'] },
  },
  {
    name: 'checked task list item',
    input: '- [x] completed task',
    expected: { type: 'task-list-item', checked: true, marker: 'x', text: ['completed', 'task'] },
  },
  {
    name: 'unchecked task list item',
    input: '- [ ] pending task',
    expected: { type: 'task-list-item', checked: false, text: ['pending', 'task'] },
  },
  {
    name: 'blockquote',
    input: '> quoted text',
    expected: { type: 'blockquote', text: ['quoted', 'text'] },
  },
  {
    name: 'dash thematic break',
    input: '---',
    expected: { type: 'thematic-break' },
  },
  {
    name: 'star thematic break',
    input: '***',
    expected: { type: 'thematic-break', marker: '*' },
  },
  {
    name: 'underscore thematic break',
    input: '___',
    expected: { type: 'thematic-break', marker: '_' },
  },
  {
    name: 'fenced code block with language',
    input: '```js\nsample\n```',
    expected: { type: 'code-block', lang: 'js', text: 'sample' },
  },
  {
    name: 'fenced code block without language',
    input: '```\nplain\n```',
    expected: { type: 'code-block', text: 'plain' },
  },
  {
    name: 'table header row',
    input: '| name | value |',
    expected: { type: 'table-row', cells: ['name', 'value'] },
  },
  {
    name: 'table delimiter row',
    input: '| --- | --- |',
    expected: { type: 'table-delimiter', align: ['default', 'default'] },
  },
  {
    name: 'aligned table delimiter row',
    input: '|:---|---:|',
    expected: { type: 'table-delimiter', align: ['left', 'right'] },
  },
  {
    name: 'link reference definition',
    input: '[id]: https://example.com',
    expected: { type: 'definition', id: 'id', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'footnote definition',
    input: '[^1]: footnote text',
    expected: { type: 'footnote-definition', id: '1', text: ['footnote', 'text'] },
  },
  {
    name: 'html block',
    input: '<div>html</div>',
    expected: { type: 'html', tag: 'div', text: 'html', closingTag: 'div' },
  },
];

const inlineCases: Case[] = [
  {
    name: 'asterisk strong',
    input: '**bold**',
    expected: { type: 'bold', text: 'bold' },
  },
  {
    name: 'asterisk emphasis',
    input: '*italic*',
    expected: { type: 'italic', text: 'italic' },
  },
  {
    name: 'strikethrough',
    input: '~~removed~~',
    expected: { type: 'strikethrough', text: 'removed' },
  },
  {
    name: 'inline code',
    input: '`code`',
    expected: { type: 'inline-code', text: 'code' },
  },
  {
    name: 'inline link',
    input: '[docs](https://example.com)',
    expected: { type: 'link', label: 'docs', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'reference link',
    input: '[docs][id]',
    expected: { type: 'reference-link', label: 'docs', id: 'id' },
  },
  {
    name: 'footnote reference',
    input: '[^1]',
    expected: { type: 'footnote-reference', id: '1' },
  },
  {
    name: 'inline image',
    input: '![diagram](https://example.com/diagram.png)',
    expected: {
      type: 'image',
      alt: 'diagram',
      scheme: 'https',
      host: ['example', 'com'],
      path: ['diagram', 'png'],
    },
  },
  {
    name: 'reference image',
    input: '![diagram][image-id]',
    expected: { type: 'reference-image', alt: 'diagram', id: 'image-id' },
  },
  {
    name: 'autolink',
    input: '<https://example.com>',
    expected: { type: 'autolink', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'entity',
    input: '&amp;',
    expected: { type: 'entity', name: 'amp' },
  },
];

const realWorldFixtureCases: Case[] = [
  {
    name: 'atx heading depth 1',
    input: '# Release notes',
    expected: { type: 'heading', depth: 1, text: ['Release', 'notes'] },
  },
  {
    name: 'atx heading depth 2',
    input: '## Installation guide',
    expected: { type: 'heading', depth: 2, text: ['Installation', 'guide'] },
  },
  {
    name: 'setext heading',
    input: 'Setext heading\n---',
    expected: { type: 'heading', depth: 2, text: ['Setext', 'heading'], style: 'setext' },
  },
  {
    name: 'paragraph',
    input: 'Plain paragraph',
    expected: { type: 'paragraph', text: ['Plain', 'paragraph'] },
  },
  {
    name: 'dash unordered list item',
    input: '- first item',
    expected: { type: 'list-item', ordered: false, text: ['first', 'item'] },
  },
  {
    name: 'plus unordered list item',
    input: '+ alternate marker',
    expected: { type: 'list-item', ordered: false, marker: '+', text: ['alternate', 'marker'] },
  },
  {
    name: 'star unordered list item',
    input: '* star marker',
    expected: { type: 'list-item', ordered: false, marker: '*', text: ['star', 'marker'] },
  },
  {
    name: 'ordered list item',
    input: '1. ordered item',
    expected: { type: 'list-item', ordered: true, index: '1', text: ['ordered', 'item'] },
  },
  {
    name: 'checked task list item',
    input: '- [x] completed task',
    expected: { type: 'task-list-item', checked: true, marker: 'x', text: ['completed', 'task'] },
  },
  {
    name: 'unchecked task list item',
    input: '- [ ] pending task',
    expected: { type: 'task-list-item', checked: false, text: ['pending', 'task'] },
  },
  {
    name: 'blockquote',
    input: '> quoted text',
    expected: { type: 'blockquote', text: ['quoted', 'text'] },
  },
  {
    name: 'dash thematic break',
    input: '---',
    expected: { type: 'thematic-break' },
  },
  {
    name: 'star thematic break',
    input: '***',
    expected: { type: 'thematic-break', marker: '*' },
  },
  {
    name: 'underscore thematic break',
    input: '___',
    expected: { type: 'thematic-break', marker: '_' },
  },
  {
    name: 'asterisk strong',
    input: '**bold**',
    expected: { type: 'bold', text: 'bold' },
  },
  {
    name: 'asterisk emphasis',
    input: '*italic*',
    expected: { type: 'italic', text: 'italic' },
  },
  {
    name: 'strikethrough',
    input: '~~removed~~',
    expected: { type: 'strikethrough', text: 'removed' },
  },
  {
    name: 'inline code',
    input: '`code`',
    expected: { type: 'inline-code', text: 'code' },
  },
  {
    name: 'inline link',
    input: '[docs](https://example.com)',
    expected: { type: 'link', label: 'docs', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'reference link',
    input: '[docs][id]',
    expected: { type: 'reference-link', label: 'docs', id: 'id' },
  },
  {
    name: 'inline image',
    input: '![diagram](https://example.com/diagram.png)',
    expected: {
      type: 'image',
      alt: 'diagram',
      scheme: 'https',
      host: ['example', 'com'],
      path: ['diagram', 'png'],
    },
  },
  {
    name: 'reference image',
    input: '![diagram][image-id]',
    expected: { type: 'reference-image', alt: 'diagram', id: 'image-id' },
  },
  {
    name: 'autolink',
    input: '<https://example.com>',
    expected: { type: 'autolink', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'entity',
    input: '&amp;',
    expected: { type: 'entity', name: 'amp' },
  },
  {
    name: 'fenced code block with language',
    input: '```js\nsample\n```',
    expected: { type: 'code-block', lang: 'js', text: 'sample' },
  },
  {
    name: 'fenced code block without language',
    input: '```\nplain\n```',
    expected: { type: 'code-block', text: 'plain' },
  },
  {
    name: 'table header row',
    input: '| name | value |',
    expected: { type: 'table-row', cells: ['name', 'value'] },
  },
  {
    name: 'table delimiter row',
    input: '| --- | --- |',
    expected: { type: 'table-delimiter', align: ['default', 'default'] },
  },
  {
    name: 'aligned table delimiter row',
    input: '|:---|---:|',
    expected: { type: 'table-delimiter', align: ['left', 'right'] },
  },
  {
    name: 'link reference definition',
    input: '[id]: https://example.com',
    expected: { type: 'definition', id: 'id', scheme: 'https', host: ['example', 'com'] },
  },
  {
    name: 'footnote definition',
    input: '[^1]: footnote text',
    expected: { type: 'footnote-definition', id: '1', text: ['footnote', 'text'] },
  },
  {
    name: 'footnote reference',
    input: '[^1]',
    expected: { type: 'footnote-reference', id: '1' },
  },
  {
    name: 'html block',
    input: '<div>html</div>',
    expected: { type: 'html', tag: 'div', text: 'html', closingTag: 'div' },
  },
];

const releaseNotesFixtureChildren = [
  { type: 'heading', depth: 1, text: ['Release', 'notes'] },
  { type: 'paragraph', text: ['Plain', 'paragraph'] },
  { type: 'heading', depth: 2, text: ['Installation', 'guide'] },
  { type: 'list-item', ordered: false, text: ['first', 'item'] },
  { type: 'list-item', ordered: false, marker: '+', text: ['alternate', 'marker'] },
  { type: 'list-item', ordered: false, marker: '*', text: ['star', 'marker'] },
  { type: 'list-item', ordered: true, index: '1', text: ['ordered', 'item'] },
  { type: 'task-list-item', checked: true, marker: 'x', text: ['completed', 'task'] },
  { type: 'task-list-item', checked: false, text: ['pending', 'task'] },
  { type: 'blockquote', text: ['quoted', 'text'] },
  { type: 'heading', depth: 2, text: ['Setext', 'heading'], style: 'setext' },
  { type: 'bold', text: 'bold' },
  { type: 'italic', text: 'italic' },
  { type: 'strikethrough', text: 'removed' },
  { type: 'inline-code', text: 'code' },
  { type: 'link', label: 'docs', scheme: 'https', host: ['example', 'com'] },
  { type: 'reference-link', label: 'docs', id: 'id' },
  {
    type: 'image',
    alt: 'diagram',
    scheme: 'https',
    host: ['example', 'com'],
    path: ['diagram', 'png'],
  },
  { type: 'reference-image', alt: 'diagram', id: 'image-id' },
  { type: 'autolink', scheme: 'https', host: ['example', 'com'] },
  { type: 'entity', name: 'amp' },
  { type: 'code-block', lang: 'js', text: 'sample' },
  { type: 'code-block', text: 'plain' },
  { type: 'table-row', cells: ['name', 'value'] },
  { type: 'table-delimiter', align: ['default', 'default'] },
  { type: 'table-delimiter', align: ['left', 'right'] },
  { type: 'definition', id: 'id', scheme: 'https', host: ['example', 'com'] },
  { type: 'footnote-definition', id: '1', text: ['footnote', 'text'] },
  { type: 'footnote-reference', id: '1' },
  { type: 'html', tag: 'div', text: 'html', closingTag: 'div' },
];

test('markdown parses block syntax matrix', () => {
  for (const { name, input, expected } of blockCases) {
    assert.deepEqual(parse(input), documentOf(expected), `${name}: ${input}`);
  }
});

test('markdown parses inline syntax matrix', () => {
  for (const { name, input, expected } of inlineCases) {
    assert.deepEqual(parse(input), documentOf(expected), `${name}: ${input}`);
  }
});

test('markdown generalizes supported leaf text and link values', () => {
  const cases: Case[] = [
    {
      name: 'alternate heading words',
      input: '# Different title',
      expected: { type: 'heading', depth: 1, text: ['Different', 'title'] },
    },
    {
      name: 'alternate paragraph words',
      input: 'Plain words',
      expected: { type: 'paragraph', text: ['Plain', 'words'] },
    },
    {
      name: 'alternate ordered index',
      input: '42. release item',
      expected: { type: 'list-item', ordered: true, index: '42', text: ['release', 'item'] },
    },
    {
      name: 'alternate inline link host',
      input: '[guide](https://docs.dev)',
      expected: { type: 'link', label: 'guide', scheme: 'https', host: ['docs', 'dev'] },
    },
    {
      name: 'alternate reference image id',
      input: '![chart][figure-1]',
      expected: { type: 'reference-image', alt: 'chart', id: 'figure-1' },
    },
  ];

  for (const { name, input, expected } of cases) {
    assert.deepEqual(parse(input), documentOf(expected), `${name}: ${input}`);
  }
});

test('markdown validate accepts every supported syntax case', () => {
  for (const { name, input } of [...blockCases, ...inlineCases]) {
    assert.doesNotThrow(() => validate(input), name);
  }
});

test('markdown parses real .md fixture snippets including + - * list markers', () => {
  const fixture = readFileSync(new URL('./fixtures/real-world.md', import.meta.url), 'utf8');
  const snippets = splitMarkdownSnippets(fixture);

  assert.deepEqual(
    snippets.map((snippet) => snippet.split(/\r?\n/, 1)[0]),
    realWorldFixtureCases.map((testCase) => testCase.input.split(/\r?\n/, 1)[0]),
  );

  for (const [index, snippet] of snippets.entries()) {
    const testCase = realWorldFixtureCases[index]!;
    assert.deepEqual(parse(snippet), documentOf(testCase.expected), `${testCase.name}: ${snippet}`);
  }
});

test('markdown parses a complete real .md document in source order', () => {
  const fixture = readFileSync(new URL('./fixtures/release-notes.md', import.meta.url), 'utf8');

  assert.deepEqual(parse(fixture), {
    type: 'document',
    children: releaseNotesFixtureChildren,
  });
  assert.doesNotThrow(() => validate(fixture));
});

test('markdown rejects malformed or unsupported syntax', () => {
  const invalid = [
    '@decorator',
    '#',
    '####### too deep',
    '[docs](https://example.com',
    '![diagram](https://example.com/diagram.png',
    '```js\nsample',
    '| --- |',
    '<div>html',
    '&amp',
  ];

  for (const input of invalid) {
    assert.throws(() => validate(input), SyntaxError, input);
  }
});

function splitMarkdownSnippets(input: string): string[] {
  const snippets: string[] = [];
  const current: string[] = [];
  let inFence = false;

  for (const line of input.trim().split(/\r?\n/)) {
    if (line.startsWith('```')) inFence = !inFence;
    if (!inFence && line.trim() === '') {
      if (current.length > 0) {
        snippets.push(current.join('\n'));
        current.length = 0;
      }
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) snippets.push(current.join('\n'));
  return snippets;
}

function documentOf(child: unknown): unknown {
  return { type: 'document', children: [child] };
}
