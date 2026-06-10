// Compile-time assertions for the typed-spans DSL surface. This file emits
// nothing and is imported by nothing — it exists so `tsc -b` (the build
// gate) fails if the literal-name inference regresses. Each `@ts-expect-error`
// is itself an assertion: if the marked line STOPS being an error, the build
// fails with "unused @ts-expect-error".

import { literal, parse, span, type SpanNamesOf, type SpanNode } from './relation.ts';

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// span() carries its name as a literal type, through modifier chains.
const prop = span('prop', 'color').until([':', ';', '}']);
const value = span('value', 'red').until([';', '}']);
type _PropName = Expect<Equal<NonNullable<(typeof prop)['__name']>, 'prop'>>;
type _ValueKeepsName = Expect<Equal<NonNullable<(typeof value)['__name']>, 'value'>>;

// Differently-named spans are not mutually assignable.
// @ts-expect-error — SpanNode<'prop'> is not SpanNode<'value'>
const _wrongAssign: SpanNode<'value'> = prop;

// literal() contributes no capture name.
const colon = literal(':');
type _LiteralIsNever = Expect<Equal<NonNullable<(typeof colon)['__name']>, never>>;

// parse() accumulates the union of named-span capture names.
const program = parse([prop, colon, value, literal(';').optional()]);
type _Names = NonNullable<(typeof program)['__names']>;
type _NamesAreUnion = Expect<Equal<_Names, 'prop' | 'value'>>;

// SpanNamesOf distributes and drops literal()'s never.
type _Direct = SpanNamesOf<readonly [typeof prop, typeof colon, typeof value]>;
type _DirectUnion = Expect<Equal<_Direct, 'prop' | 'value'>>;

// Untyped spans degrade gracefully: a SpanNode<string> in the tuple widens
// the union to string instead of erroring.
declare const anySpan: SpanNode;
const widened = parse([prop, anySpan]);
type _Widened = Expect<Equal<NonNullable<(typeof widened)['__names']>, string>>;

export {};

// ---- targets-callback relation form ----------------------------------------
import { relation } from './relation.ts';

relation('Entry', {
  input: 'a: b;',
  parse: parse([prop, colon, value, literal(';').optional()]),
  targets: ($) => ({
    ast: { type: 'entry', p: $.prop, v: $.value, hasValue: $.value.present },
    json: null,
  }),
});

relation('Entry', {
  input: 'a: b;',
  parse: parse([prop, colon, value]),
  targets: ($) => ({
    // @ts-expect-error — 'typo' is not a capture name of this parse program
    ast: { p: $.typo },
  }),
});

relation('Entry', {
  input: 'a: b;',
  parse: parse([prop, colon, value]),
  // @ts-expect-error — gap() only accepts declared capture names
  targets: ($) => ({ ast: { g: $.gap('prop', 'nope') } }),
});
