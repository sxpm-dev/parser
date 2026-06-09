import { $, defineSchema, literal, parse, prefixed, relation, span, suffixed, tpl } from '@parser2/parser';

// ISO 8601 duration. Forms:
//   P[nY][nM][nW][nD][T[nH][nM][nS]]
// The `M` letter means months before `T` and minutes after it — the split
// between DateUnit and TimeUnit roles resolves this without lookahead.
//
// Round-trip note: the engine's interp parser can't take `sep: ''` on a
// repeats span (it loops on a zero-length separator sweep), so each
// repeats() here runs without an explicit separator. The standard
// whitespace policy means the canonical rebuild inserts a single space
// between adjacent unit children (e.g. 'P1Y 2M 3D'). That's value-stable
// — re-parsing tolerates the inserted space — and the engine's contract
// is value-stable, not byte-stable.
//
// Targets:
//   ast    — { type:'duration', date:[...], time?:[...] }
//   source — canonical-ish ISO 8601 string (with rebuild whitespace).

export default defineSchema({
  rootType: 'Duration',
  defaultTarget: 'ast',
  punctuators: {
    P: 'P',
    T: 'T',
    Y: 'Y',
    Mo: 'M',
    W: 'W',
    D: 'D',
    H: 'H',
    S: 'S',
  },
  tokens: ['number'],
  examples: [
    // --- DateUnit: Y | M | W | D ---------------------------------------
    // Each unit production is `<digits><letter>` — collapsed via the
    // `suffixed` Phase 7 helper. The expansion is identical to writing
    // the relation() call by hand (verified by the byte-identity gate).
    suffixed('DateUnit', span('value', '1').number().int(), 'Y', 'years'),
    suffixed('DateUnit', span('value', '1').number().int(), 'M', 'months'),
    suffixed('DateUnit', span('value', '1').number().int(), 'W', 'weeks'),
    suffixed('DateUnit', span('value', '1').number().int(), 'D', 'days'),

    // --- TimeUnit: H | M | S -------------------------------------------
    // `M` here means minutes; the wrapping Duration production gates this
    // role list behind the `T` literal so the `M` ambiguity stays scoped.
    suffixed('TimeUnit', span('value', '1').number().int(), 'H', 'hours'),
    suffixed('TimeUnit', span('value', '1').number().int(), 'M', 'minutes'),
    suffixed('TimeUnit', span('value', '1').number().int(), 'S', 'seconds'),

    // --- Duration root -------------------------------------------------
    // Two productions so source templates never have adjacent slots:
    //   1. Date-only        → tpl`P${date}`             (no T anywhere)
    //   2. Date + time      → tpl`P${date}T${time}`     (T separates slots)
    //
    // Inverse-direction discrimination:
    //   - ast: field-name set differs (`time` is present only in #2).
    //   - source: #2 contains a literal `T` segment that #1's segments don't.
    prefixed('Duration', 'P', span('date', '1D').of('DateUnit').repeats({ min: 1 }), 'duration'),
    relation('Duration', {
      input: 'P1DT1H',
      encodings: {
        parse: parse([
          literal('P'),
          span('date', '1D').of('DateUnit').repeats({ min: 0 }),
          literal('T'),
          span('time', '1H').of('TimeUnit').repeats({ min: 1 }),
        ]),
        ast: { type: 'duration', date: $.date, time: $.time },
        source: tpl`P${$.date}T${$.time}`,
      },
    }),
  ],
});
