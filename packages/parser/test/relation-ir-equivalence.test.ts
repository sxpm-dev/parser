// IR-equivalence harness — Phase 9 Task 9.3
//
// Asserts that `relation(...)` and `ex(...)` produce deep-equal `ExampleDef`
// values for representative production shapes. These tests protect against
// subtle drift during schema rewrites (Tasks 9.5–9.9).
//
// The first four cases are copied verbatim from spike-relation.test.ts (minus
// the "spike:" prefix in the test description). The spike file is preserved
// until Task 9.12 closeout.

import assert from 'node:assert/strict';
import test from 'node:test';
import { $, ex, literal, parse, relation, span, tpl } from '../src/index.ts';

// ==========================================================================
// Cases lifted from the spike (Task 9.3, Step 1)
// ==========================================================================

test('IR equivalence: relation() ≡ ex() for MarkdownHeading h1', () => {
  const HEADING_LINE_STOPS = ['\n'] as const;

  const viaEx = ex('# Release notes')
    .as('MarkdownLeaf')
    .span('#')
    .span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false })
    .render('ast', { type: 'heading', depth: 1, text: $.text })
    .render('html', tpl`<h1>${$.text}</h1>`)
    .render('source', tpl`# ${$.text}`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '# Release notes',
    encodings: {
      md: parse([
        literal('#'),
        span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false }),
      ]),
      ast: { type: 'heading', depth: 1, text: $.text },
      html: tpl`<h1>${$.text}</h1>`,
      source: tpl`# ${$.text}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: relation() ≡ ex() for MarkdownDocument (recursive .of() + .repeats())', () => {
  const viaEx = ex('# Release notes\nPlain paragraph')
    .as('MarkdownDocument')
    .span('children', '# Release notes\nPlain paragraph', ['MarkdownLeaf', 'MarkdownParagraph'])
      .repeats({ min: 0 })
    .render('ast', { type: 'document', children: $.children })
    .render('html', tpl`${$.children}`)
    .render('source', tpl`${$.children}`)
    .build();

  const viaRelation = relation('MarkdownDocument', {
    input: '# Release notes\nPlain paragraph',
    encodings: {
      md: parse([
        span('children', '# Release notes\nPlain paragraph')
          .of('MarkdownLeaf', 'MarkdownParagraph')
          .repeats({ min: 0 }),
      ]),
      ast: { type: 'document', children: $.children },
      html: tpl`${$.children}`,
      source: tpl`${$.children}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: relation() ≡ ex() for italic *italic* (punctuator hugs text)', () => {
  const viaEx = ex('*italic*')
    .as('MarkdownLeaf')
    .span('*')
    .span('text', 'italic').until('*', { balanced: false })
    .span('*')
    .render('ast', { type: 'italic', text: $.text })
    .render('html', tpl`<em>${$.text}</em>`)
    .render('source', tpl`*${$.text}*`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '*italic*',
    encodings: {
      md: parse([
        literal('*'),
        span('text', 'italic').until('*', { balanced: false }),
        literal('*'),
      ]),
      ast: { type: 'italic', text: $.text },
      html: tpl`<em>${$.text}</em>`,
      source: tpl`*${$.text}*`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: relation() ≡ ex() for thematic break *** (pure literal)', () => {
  const viaEx = ex('***')
    .as('MarkdownLeaf')
    .span('***')
    .render('ast', { type: 'thematic-break', marker: '*' })
    .render('html', tpl`<hr>`)
    .render('source', tpl`***`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '***',
    encodings: {
      md: parse([literal('***')]),
      ast: { type: 'thematic-break', marker: '*' },
      html: tpl`<hr>`,
      source: tpl`***`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

// ==========================================================================
// Additional tricky shapes (Task 9.3, Step 2)
// ==========================================================================

test('IR equivalence: ordered list (number class with int refinement)', () => {
  const viaEx = ex('1. ordered item')
    .as('MarkdownLeaf')
    .span('index', '1').number().int()
    .span('.')
    .span('text', 'ordered item').until('\n', { balanced: false })
    .render('ast', { type: 'list-item', ordered: true, index: $.index, text: $.text })
    .render('html', tpl`<li>${$.text}</li>`)
    .render('source', tpl`${$.index}. ${$.text}`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '1. ordered item',
    encodings: {
      md: parse([
        span('index', '1').number().int(),
        literal('.'),
        span('text', 'ordered item').until('\n', { balanced: false }),
      ]),
      ast: { type: 'list-item', ordered: true, index: $.index, text: $.text },
      html: tpl`<li>${$.text}</li>`,
      source: tpl`${$.index}. ${$.text}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: rawUntil (HTML block body)', () => {
  const viaEx = ex('<div>html</div>')
    .as('MarkdownLeaf')
    .span('<')
    .span('tag', 'div').ident().html().oneOf(['div'])
    .span('>')
    .span('body', 'html').rawUntil('</')
    .span('</')
    .span('closingTag', 'div').ident().html()
    .span('>')
    .render('ast', { type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag })
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '<div>html</div>',
    encodings: {
      md: parse([
        literal('<'),
        span('tag', 'div').ident().html().oneOf(['div']),
        literal('>'),
        span('body', 'html').rawUntil('</'),
        literal('</'),
        span('closingTag', 'div').ident().html(),
        literal('>'),
      ]),
      ast: { type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag },
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: indent modifier (yaml-block style)', () => {
  const viaEx = ex(' inner').as('Block')
    .span('children', 'inner', 'Item').indent().repeats({ min: 0 })
    .render('ast', { children: $.children })
    .build();

  const viaRelation = relation('Block', {
    input: ' inner',
    encodings: {
      src: parse([
        span('children', 'inner').of('Item').indent().repeats({ min: 0 }),
      ]),
      ast: { children: $.children },
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});
