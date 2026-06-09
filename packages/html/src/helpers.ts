import {
  $,
  literal,
  parse,
  relation,
  span,
  type ExampleDef,
} from '@parser2/parser';

const HTML_NS = 'http://www.w3.org/1999/xhtml';

// The 4 child roles that every HtmlElement body's children loop dispatches
// over. Shared by every implicit-close element production.
const CHILD_ROLES = ['Doctype', 'Comment', 'HtmlElement', 'TextNode'] as const;

// HTML-local shape helper for implicit-close element productions. Every
// tag in the {li, dt/dd, tr, td/th, p, option/optgroup, html, head, tbody,
// thead, tfoot, body} cluster follows the same shape:
//
//   parse: [
//     literal('<'),
//     span('tag', tags[0]).ident().html().oneOf(tags),
//     span('attrs', '').of('Attribute').repeats({ min: 0 }),
//     literal('>'),
//     span('children', 'x').of(...CHILD_ROLES)
//       .repeats({ min: 0, stopBefore }),
//     // One optional `</tag>` literal per tag in the oneOf set.
//     literal(`</${tags[0]}>`).optional(),
//     literal(`</${tags[1]}>`).optional(),   // when present
//     ...
//   ]
//   ast: {
//     _kind: kind,
//     nodeName: $.tag, tagName: $.tag,
//     namespaceURI: HTML_NS,
//     attrs: $.attrs, childNodes: $.children, parentNode: null,
//   }
//   source: tpl`<${$.tag}>${$.children}</${tags[0]}>`
//
// Lives in the html package (not @parser2/parser) for the same reason the
// markdown helpers do: it bakes in HTML-specific structure (the AST's
// `_kind`/`nodeName`/`namespaceURI` fields, the fixed children roles,
// the optional-per-tag close literals) that doesn't generalize.
export function implicitCloseElement(
  tags: readonly string[],
  kind: string,
  stopBefore: readonly string[],
): ExampleDef {
  if (tags.length === 0) {
    throw new Error(`implicitCloseElement('${kind}'): at least one tag required`);
  }
  const firstTag = tags[0]!;
  const input = `<${firstTag}>x</${firstTag}>`;
  return relation('HtmlElement', {
    input,
    encodings: {
      parse: parse([
        literal('<'),
        span('tag', firstTag).ident().html().oneOf(tags),
        span('attrs', '').of('Attribute').repeats({ min: 0 }),
        literal('>'),
        span('children', 'x').of(...CHILD_ROLES)
          .repeats({ min: 0, stopBefore }),
        ...tags.map((t) => literal(`</${t}>`).optional()),
      ]),
      ast: {
        _kind: kind,
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      },
      source: {
        __tpl: true,
        parts: ['<', '>', `</${firstTag}>`],
        slots: [
          { kind: 'capture', ref: 'tag' },
          { kind: 'capture', ref: 'children' },
        ],
      },
    },
  });
}
