import {
  literal,
  parse,
  relation,
  span,
  type ExampleDef,
  type SpanNode,
  type Template,
} from '@parser2/parser';

// Stops shared by every leaf production that captures text-to-end-of-line.
// Mirrors the schema-level constant of the same name; pulled in here so the
// helpers stay self-contained.
const HEADING_LINE_STOPS = ['\n'] as const;

// Markdown-local shape helper for delimited inline runs — `**bold**`,
// `*italic*`, `~~strikethrough~~`, `` `code` ``. All four share the same
// shape:
//
//   parse:  [literal(delim), span('text', ...).until(delim, balanced:false), literal(delim)]
//   ast:    { type: astType, text: $.text }
//   html:   tpl`<htmlTag>${$.text}</htmlTag>`
//   source: tpl`${delim}${$.text}${delim}`
//
// The helper hardcodes the `.until(delim, {balanced:false})` modifier so
// the caller passes a bare span — the modifier is implied by the delim.
//
// Lives in the markdown package (not @parser2/parser) because it bakes in
// the html render target, which is markdown-specific. The Phase 7 helpers
// in @parser2/parser only emit ast + source; adding html-target support to
// every primitive would inflate their signatures for a single consumer.
export function delimited(
  nodeType: string,
  delim: string,
  textSpan: SpanNode,
  astType: string,
  htmlTag: string,
): ExampleDef {
  const def = textSpan.toSpanDef();
  if (!def.name) {
    throw new Error(
      `delimited('${nodeType}', '${delim}'): textSpan must be a named span (use span('text', '<example>'))`,
    );
  }
  if (def.text === undefined) {
    throw new Error(
      `delimited('${nodeType}', '${delim}'): textSpan must have an example text`,
    );
  }
  const fieldName = def.name;
  const valueRef = { __ref: 'span-value' as const, name: fieldName };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [delim, delim],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  const htmlTpl: Template = {
    __tpl: true,
    parts: [`<${htmlTag}>`, `</${htmlTag}>`],
    slots: [{ kind: 'capture', ref: fieldName }],
  };
  return relation(nodeType, {
    input: delim + def.text + delim,
    encodings: {
      parse: parse([
        literal(delim),
        textSpan.until(delim, { balanced: false }),
        literal(delim),
      ]),
      ast: { type: astType, [fieldName]: valueRef },
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}

// ATX heading: `# text` / `## text` / .. / `###### text`. Six near-identical
// productions collapse to one call each — depth determines the marker length,
// the html tag, and the AST `depth` field. The example text varies per
// production so it's an explicit parameter rather than derived (kept to
// preserve the schema's original byte-stable example inputs).
export function atxHeading(depth: 1 | 2 | 3 | 4 | 5 | 6, exampleText: string): ExampleDef {
  const hashes = '#'.repeat(depth);
  const tag = `h${depth}`;
  const textRef = { __ref: 'span-value' as const, name: 'text' };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [`${hashes} `, ''],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  const htmlTpl: Template = {
    __tpl: true,
    parts: [`<${tag}>`, `</${tag}>`],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  return relation('MarkdownLeaf', {
    input: `${hashes} ${exampleText}`,
    encodings: {
      parse: parse([
        literal(hashes),
        span('text', exampleText).until(HEADING_LINE_STOPS, { balanced: false }),
      ]),
      ast: { type: 'heading', depth, text: textRef },
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}

// Setext heading: `${text} ===` (h1) / `${text} ---` (h2). The AST gains a
// `style: 'setext'` discriminator so the inverse dispatcher can tell setext
// apart from ATX headings of the same depth.
export function setextHeading(depth: 1 | 2): ExampleDef {
  const underline = depth === 1 ? '===' : '---';
  const tag = `h${depth}`;
  const textRef = { __ref: 'span-value' as const, name: 'text' };
  const sourceTpl: Template = {
    __tpl: true,
    parts: ['', ` ${underline}`],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  const htmlTpl: Template = {
    __tpl: true,
    parts: [`<${tag}>`, `</${tag}>`],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  return relation('MarkdownLeaf', {
    input: `Setext heading\n${underline}`,
    encodings: {
      parse: parse([
        span('text', 'Setext heading').until(HEADING_LINE_STOPS, { balanced: false }),
        literal(underline),
      ]),
      ast: { type: 'heading', depth, text: textRef, style: 'setext' },
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}

// Thematic break: `***` / `___` / `---`. The original schema's AST has an
// inconsistency — `*` and `_` carry a `marker` field, `-` omits it. The
// helper preserves that asymmetry so regen stays byte-identical.
export function thematicBreak(marker: '*' | '_' | '-'): ExampleDef {
  const literalText = marker.repeat(3);
  const ast = marker === '-'
    ? { type: 'thematic-break' as const }
    : { type: 'thematic-break' as const, marker };
  const sourceTpl: Template = { __tpl: true, parts: [literalText], slots: [] };
  const htmlTpl: Template = { __tpl: true, parts: ['<hr>'], slots: [] };
  return relation('MarkdownLeaf', {
    input: literalText,
    encodings: {
      parse: parse([literal(literalText)]),
      ast,
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}

// Task list item: `- [x] text` / `- [ ] text`. Two productions distinguished
// by the in-bracket marker. The AST has a known asymmetry — `[x]` carries
// `marker: 'x'`, `[ ]` carries only `checked: false` (no marker field).
export function taskListItem(marker: 'x' | ' ', exampleText: string): ExampleDef {
  const fullMarker = `- [${marker}]`;
  const checked = marker === 'x';
  const textRef = { __ref: 'span-value' as const, name: 'text' };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [`${fullMarker} `, ''],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  const htmlTpl: Template = checked
    ? {
        __tpl: true,
        parts: [`<li><input type="checkbox" checked>`, `</li>`],
        slots: [{ kind: 'capture', ref: 'text' }],
      }
    : {
        __tpl: true,
        parts: [`<li><input type="checkbox">`, `</li>`],
        slots: [{ kind: 'capture', ref: 'text' }],
      };
  const ast = checked
    ? { type: 'task-list-item', checked: true, marker: 'x', text: textRef }
    : { type: 'task-list-item', checked: false, text: textRef };
  return relation('MarkdownLeaf', {
    input: `${fullMarker} ${exampleText}`,
    encodings: {
      parse: parse([
        literal(fullMarker),
        span('text', exampleText).until(HEADING_LINE_STOPS, { balanced: false }),
      ]),
      ast,
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}

// Unordered list item: `- text` / `+ text` / `* text`. The original schema's
// AST has the same marker asymmetry as thematic break — `+` and `*` carry a
// `marker` field, `-` omits it.
export function unorderedListItem(marker: '-' | '+' | '*', exampleText: string): ExampleDef {
  const fullMarker = `${marker} `;
  const textRef = { __ref: 'span-value' as const, name: 'text' };
  const sourceTpl: Template = {
    __tpl: true,
    parts: [fullMarker, ''],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  const htmlTpl: Template = {
    __tpl: true,
    parts: ['<li>', '</li>'],
    slots: [{ kind: 'capture', ref: 'text' }],
  };
  const ast = marker === '-'
    ? { type: 'list-item', ordered: false, text: textRef }
    : { type: 'list-item', ordered: false, marker, text: textRef };
  return relation('MarkdownLeaf', {
    input: `${fullMarker}${exampleText}`,
    encodings: {
      parse: parse([
        literal(fullMarker),
        span('text', exampleText).until(HEADING_LINE_STOPS, { balanced: false }),
      ]),
      ast,
      html: htmlTpl,
      source: sourceTpl,
    },
  });
}
