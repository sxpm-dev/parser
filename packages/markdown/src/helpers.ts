import {
  literal,
  parse,
  relation,
  type ExampleDef,
  type SpanNode,
  type Template,
} from '@parser2/parser';

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
