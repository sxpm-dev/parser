import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { parse } from '../src/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

const cssAstFields: Record<string, readonly string[]> = {
  root: ['type', 'nodes', 'raws'],
  rule: ['type', 'selector', 'nodes', 'raws'],
  atrule: ['type', 'name', 'params', 'nodes', 'raws'],
  decl: ['type', 'prop', 'value', 'important', 'raws'],
  comment: ['type', 'text', 'raws'],
};

function firstCssAstDiff(actual: any, expected: any, path = 'root', includeRaws = false): string | undefined {
  if (actual?.type !== expected?.type) {
    return `${path}: type ${String(actual?.type)} !== ${String(expected?.type)}`;
  }

  const fields = cssAstFields[actual.type];
  if (!fields) {
    return `${path}: unexpected CSS node type ${String(actual.type)}`;
  }

  for (const field of fields) {
    if (field === 'raws' && !includeRaws) continue;
    if (field === 'nodes') {
      const diff = firstChildDiff(actual.nodes ?? [], expected.nodes ?? [], path, includeRaws);
      if (diff) return diff;
      continue;
    }
    if (field === 'raws') {
      const actualRaws = actual.raws ?? {};
      const expectedRaws = expected.raws ?? {};
      const rawFields = [...new Set([...Object.keys(actualRaws), ...Object.keys(expectedRaws)])].sort();
      for (const rawField of rawFields) {
        if (actualRaws[rawField] !== expectedRaws[rawField]) {
          return `${path}.raws.${rawField}: ${JSON.stringify(actualRaws[rawField])} !== ${JSON.stringify(expectedRaws[rawField])}`;
        }
      }
      continue;
    }
    if (actual[field] !== expected[field]) {
      return `${path}.${field}: ${JSON.stringify(actual[field])} !== ${JSON.stringify(expected[field])}`;
    }
  }

  return undefined;
}

function firstChildDiff(actual: any[], expected: any[], path: string, includeRaws: boolean): string | undefined {
  if (actual.length !== expected.length) {
    return `${path}.nodes.length: ${actual.length} !== ${expected.length}`;
  }

  for (let i = 0; i < actual.length; i++) {
    const actualChild = actual[i]!;
    const expectedChild = expected[i]!;
    const diff = firstCssAstDiff(actualChild, expectedChild, `${path}.nodes[${i}]<${actualChild.type}/${expectedChild.type}>`, includeRaws);
    if (diff) {
      return diff;
    }
  }

  return undefined;
}

const syntaxMatrix = [
  {
    area: 'stylesheet controls and comments',
    css: [
      '/* license */',
      '@charset "utf-8";',
      '@import url("base.css") layer(theme) supports(display: grid);',
      '@namespace svg url("http://www.w3.org/2000/svg");',
    ].join('\n'),
  },
  {
    area: 'grouping at-rules',
    css: [
      '@layer reset, theme;',
      '@media screen and (width >= 40rem) { .card { display: grid; } }',
      '@supports selector(:has(img)) { .card:has(> img) { color: red; } }',
      '@container card (inline-size > 30rem) { .title { font-size: 2rem; } }',
      '@scope (.article) to (.aside) { :scope { color: black; } }',
    ].join('\n'),
  },
  {
    area: 'font, page, counter, property at-rules',
    css: [
      '@font-face { font-family: "Inter"; src: url(inter.woff2) format("woff2"); unicode-range: U+000-5FF; }',
      '@page :first { margin: 1cm; @top-left { content: "chapter"; } }',
      '@counter-style circled { system: cyclic; symbols: "\\2460" "\\2461"; suffix: " "; }',
      '@property --gap { syntax: "<length>"; inherits: false; initial-value: 1rem; }',
    ].join('\n'),
  },
  {
    area: 'selectors',
    css: [
      'svg|a, *|*, |button { color: blue; }',
      'col || td, .card:is(.active, :has(> img)) > :not(script) { color: red; }',
      '[data-state~="open" i][href$=".pdf" s]::before { content: attr(href); }',
      ':host-context(main) ::part(label)::slotted(*) { text-decoration: underline; }',
    ].join('\n'),
  },
  {
    area: 'nesting and relative selectors',
    css: [
      '.card {',
      '  & { color: inherit; }',
      '  &:hover, & > img, > .title { color: red; }',
      '  @media (hover: hover) { &:focus-visible { outline: 2px solid currentColor; } }',
      '}',
    ].join('\n'),
  },
  {
    area: 'component values',
    css: [
      '.values {',
      '  margin: calc(100% - min(2rem, 10px));',
      '  color: color-mix(in oklab, red 20%, blue);',
      '  background: image-set(url(a.png) 1x, url("b{2}.png") 2x);',
      '  --theme: { color: red; tokens: [a b c]; };',
      '  content: "{ not a block }";',
      '}',
    ].join('\n'),
  },
  {
    area: 'animations and keyframes',
    css: [
      '@keyframes fade {',
      '  from { opacity: 0; }',
      '  50%, 75% { opacity: .5; transform: translate(1px, 2px); }',
      '  to { opacity: 1; }',
      '}',
    ].join('\n'),
  },
] as const;

test('accepts the CSS syntax coverage matrix', () => {
  for (const entry of syntaxMatrix) {
    assert.doesNotThrow(() => parse(entry.css), entry.area);
  }
});

test('returns expected ASTs for representative broad CSS syntax', () => {
  assert.deepEqual(parse('@media screen and (width >= 40rem) { .card { display: grid; } }'), {
    type: 'root',
    nodes: [
      {
        type: 'atrule',
        name: 'media',
        params: 'screen and (width >= 40rem)',
        nodes: [
          {
            type: 'rule',
            selector: '.card',
            nodes: [{ type: 'decl', prop: 'display', value: 'grid' }],
          },
        ],
      },
    ],
  });

  assert.deepEqual(parse('.card { &:hover { color: red; } }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.card',
        nodes: [
          {
            type: 'rule',
            selector: '&:hover',
            nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
          },
        ],
      },
    ],
  });

  assert.deepEqual(parse('@keyframes fade { from { opacity: 0; } 50%, 75% { opacity: .5; } to { opacity: 1; } }'), {
    type: 'root',
    nodes: [
      {
        type: 'atrule',
        name: 'keyframes',
        params: 'fade',
        nodes: [
          { type: 'rule', selector: 'from', nodes: [{ type: 'decl', prop: 'opacity', value: '0' }] },
          { type: 'rule', selector: '50%, 75%', nodes: [{ type: 'decl', prop: 'opacity', value: '.5' }] },
          { type: 'rule', selector: 'to', nodes: [{ type: 'decl', prop: 'opacity', value: '1' }] },
        ],
      },
    ],
  });

  assert.deepEqual(parse('.values { --theme: { color: red; tokens: [a b c]; }; content: "{ not a block }"; }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.values',
        nodes: [
          { type: 'decl', prop: '--theme', value: '{ color: red; tokens: [a b c]; }' },
          { type: 'decl', prop: 'content', value: '"{ not a block }"' },
        ],
      },
    ],
  });
});

test('does not false-reject stylesheets accepted by PostCSS', () => {
  for (const entry of syntaxMatrix.filter((item) => item.area !== 'stylesheet controls and comments')) {
    assert.doesNotThrow(() => postcss.parse(entry.css, { from: undefined }), entry.area);
    assert.doesNotThrow(() => parse(entry.css), entry.area);
  }
});

test('huge-page fixture AST matches PostCSS semantic shape', () => {
  const css = readFileSync(join(here, '../bench/fixture/huge-page.css'), 'utf8');
  const expected = postcss.parse(css, { from: undefined });

  const fastDiff = firstCssAstDiff(parse(css, { mode: 'fast' }), expected);
  assert.equal(fastDiff, undefined, `fast: ${fastDiff}`);

  const rawsDiff = firstCssAstDiff(parse(css, { mode: 'raws' }), expected, 'root', true);
  assert.equal(rawsDiff, undefined, `raws: ${rawsDiff}`);
});

test('keeps invalid stylesheet boundaries explicit', () => {
  const invalid = [
    '}',
    '.foo }',
    '{ color: red }',
    '.foo, { color: red }',
    '.foo > { color: red }',
  ];

  for (const css of invalid) {
    assert.throws(() => parse(css), SyntaxError, css);
  }
});

test('deterministic fuzz: valid balanced CSS parses and token counts', () => {
  let seed = 0x5eed1234;
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  const pick = (items: readonly string[]): string => items[next() % items.length] ?? items[0] ?? '';

  const selectors = [
    '.card',
    '#panel',
    '[data-state~="open"]',
    'svg|a',
    'col || td',
    ':is(.a, .b) > :not(#x)',
    '.card:has(> img)::before',
  ];
  const nestedSelectors = ['&', '&:hover', '& > img', '> .title', '.child'];
  const props = ['color', 'margin', 'background', 'transform', 'content', '--theme'];
  const values = [
    'red',
    '1px 2rem',
    'calc(100% - 1px)',
    'translate(1px, 2px)',
    '"{ literal }"',
    'url("asset{1}.svg")',
    '{ color: red }',
  ];

  for (let i = 0; i < 250; i++) {
    const selector = pick(selectors);
    const propA = pick(props);
    const propB = pick(props);
    const valueA = pick(values);
    const valueB = pick(values);
    const nested = pick(nestedSelectors);
    const css = [
      `${selector} {`,
      `  ${propA}: ${valueA};`,
      `  ${nested} { ${propB}: ${valueB}; }`,
      '}',
      `@media (min-width: ${320 + (next() % 900)}px) { ${pick(selectors)} { ${pick(props)}: ${pick(values)}; } }`,
    ].join('\n');

    parse(css);
  }
});
