import { $, defineSchema, ex } from '@parser2/parser';

// CSS schema. All node types live in one schema because Rule, AtRule, and
// Stylesheet are mutually recursive (a nested rule inside an at-rule inside
// a rule is valid CSS). Selector / at-rule prelude / declaration value are
// captured as opaque strings via .until() — same approach real CSS parsers
// take.
//
// AST shape aligns with PostCSS (type: 'root'|'rule'|'atrule'|'decl'),
// minus `raws` and `source` for now (added in later phases).

export default defineSchema({
  name: 'css',
  rootType: 'Stylesheet',
  punctuators: {
    lbrace: '{',
    rbrace: '}',
    lparen: '(',
    rparen: ')',
    lbracket: '[',
    rbracket: ']',
    colon: ':',
    semicolon: ';',
    comma: ',',
    delim: ['.', '+', '>', '~', '*', '/', '%', '|', '&', '#', '@', '=', '!', '?', '\\', '$', '^'],
  },
  // Tokens scanned inside .until() captures even though no span explicitly
  // references them.
  tokens: ['number', 'string', 'comment'],
  examples: [
    // ---- Comment ------------------------------------------------------
    // Standalone comment between siblings. Comments inside selectors and
    // values are absorbed into the corresponding .until() capture; only
    // free-floating comments become their own Comment nodes.
    ex('/* foo */')
      .as('Comment')
      .span('text', '/* foo */').comment()
      .structure({
        type: 'comment',
        text: $.text,
        raws: {
          left: $.commentLeft('text'),
          right: $.commentRight('text'),
        },
      })
      .build(),

    // ---- Declaration with !important ----------------------------------
    // Listed first so speculative dispatch tries the longer match before
    // falling back to the plain declaration. Stops value capture at `!` so
    // the bang is not absorbed into the value.
    //
    // Limitations (deferred to comment-normalization work): cases where a
    // comment sits between `!` and `important`, or trails the value before
    // `!`, will not match this variant and fall through to the plain form.
    ex('color: red !important;')
      .as('Declaration')
      .span('prop', 'color').until([':', ';', '}'])
      .span(':')
      .span('value', 'red').until([';', '}', '!'])
      .span('!')
      .span('important', 'important').ident().css()
      .span(';').optional()
      .structure({
        type: 'decl',
        prop: $.prop,
        value: $.value,
        important: true,
        raws: { between: $.gap('prop', 'value') },
      })
      .build(),

    // ---- Declaration --------------------------------------------------
    // The trailing `;` is consumed here (not by the parent repeats loop) so
    // the declaration's source range includes it, matching PostCSS.
    ex('color: red;')
      .as('Declaration')
      .span('prop', 'color').until([':', ';', '}'])
      .span(':')
      .span('value', 'red').until([';', '}'])
      .span(';').optional()
      .structure({
        type: 'decl',
        prop: $.prop,
        value: $.value,
        raws: { between: $.gap('prop', 'value') },
      })
      .build(),

    // ---- Rule (selector + body) ---------------------------------------
    // Body children may be Declaration, nested Rule, or nested AtRule. Rule
    // is dispatched BEFORE Declaration in body unions so that nested rules
    // (e.g. `a:focus-visible { ... }` inside an at-rule body) aren't first
    // mis-parsed by Declaration's balanced .until() swallowing the inner
    // block. ';' is in selector stops so Rule fails fast on declarations:
    // a plain decl's tokens trip the ';' stop before reaching any '{',
    // causing speculative dispatch to fall through to Declaration. Custom
    // properties like `--zero-size: { width: 0; height: 0; };` still parse
    // as Declarations because their value's `{...}` is bracket-balanced,
    // so the `;` stop in Rule selector falls outside the brackets after
    // the closing `}` — Rule's selector consumes the whole `--name: {...}`
    // block, then needs a `{` next, sees `;`, fails, and Declaration wins.
    ex('.foo:hover { color: red }')
      .as('Rule')
      .span('selector', '.foo:hover').until(['{', ';'], { rejectSuffix: ':' })
      .span('lbrace', '{')
      .span('nodes', 'color: red', ['Comment', 'AtRule', 'Rule', 'Declaration'])
        .repeats({ sep: ';', trailing: 'allowed' })
      .span('rbrace', '}')
      .structure({
        type: 'rule',
        selector: $.selector,
        nodes: $.nodes,
        raws: {
          between: $.gap('selector', 'lbrace'),
          after: $.gap('nodes', 'rbrace'),
          semicolon: $.endsWith('nodes', ';'),
        },
      })
      .build(),

    // ---- AtRule, block form (has { ... }) -----------------------------
    // Block form is listed first so speculative dispatch tries the greedier
    // match before falling back to the statement form. If statement form
    // were first it would succeed at `@supports (--var)` before the `{`,
    // leaving the body to be mis-parsed as a separate Rule.
    ex('@media screen { color: red }')
      .as('AtRule')
      .span('@')
      .span('name', 'media').ident().css()
      .span('params', 'screen').until([';', '{'])
      .span('lbrace', '{')
      .span('nodes', 'color: red', ['Comment', 'AtRule', 'Rule', 'Declaration'])
        .repeats({ sep: ';', trailing: 'allowed' })
      .span('rbrace', '}')
      .structure({
        type: 'atrule',
        name: $.name,
        params: $.params,
        nodes: $.nodes,
        raws: {
          afterName: $.gap('name', 'params'),
          between: $.gap('params', 'lbrace'),
          after: $.gap('nodes', 'rbrace'),
          semicolon: $.endsWith('nodes', ';'),
        },
      })
      .build(),

    // ---- AtRule, statement form (optional trailing ;) ------------------
    // `;` is optional so `@charset "UTF-8";` and `@charset "UTF-8"` both work.
    // Adding `}` to the until-stops lets statement at-rules end naturally
    // at the close of an enclosing block (e.g. `a { @import "x" }`).
    ex('@charset "UTF-8";')
      .as('AtRule')
      .span('@')
      .span('name', 'charset').ident().css()
      .span('params', '"UTF-8"').until([';', '{', '}'])
      .span('semi', ';').optional()
      .structure({
        type: 'atrule',
        name: $.name,
        params: $.params,
        raws: {
          afterName: $.gap('name', 'params'),
          between: $.gap('params', 'semi'),
        },
      })
      .build(),

    // ---- Stylesheet (root) --------------------------------------------
    // Top-level children = Comment | AtRule | Rule | Declaration. PostCSS
    // tolerates top-level declarations (e.g. SCSS-style or fragments), so
    // Declaration is included even though strict CSS forbids it outside a
    // block.
    ex('.foo { color: red }')
      .as('Stylesheet')
      .span('nodes', '.foo { color: red }', ['Comment', 'AtRule', 'Rule', 'Declaration'])
        .repeats({ min: 0, sep: ';', trailing: 'allowed' })
      .structure({
        type: 'root',
        nodes: $.nodes,
        raws: {
          after: $.tail('nodes'),
          semicolon: $.endsWith('nodes', ';'),
        },
      })
      .build(),
  ],
});
