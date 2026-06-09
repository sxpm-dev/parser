import { defineSchema, keyword, litEnum, passthrough, span, valueTagged } from '@parser2/parser';

// RFC 5545 §3.3.10 RRULE — the recurrence-rule value type used inside an
// iCalendar RRULE property. Grammar (subset implemented here):
//
//   recur     = part *( ";" part )
//   part      = "FREQ"       "=" freq
//             / "COUNT"      "=" 1*DIGIT
//             / "INTERVAL"   "=" 1*DIGIT
//             / "UNTIL"      "=" date          (YYYYMMDD, datetime form deferred)
//             / "WKST"       "=" weekday
//             / "BYDAY"      "=" weekday *( "," weekday )
//             / "BYMONTH"    "=" 1*DIGIT *( "," 1*DIGIT )
//             / "BYMONTHDAY" "=" 1*DIGIT *( "," 1*DIGIT )
//             / "BYHOUR"     "=" 1*DIGIT *( "," 1*DIGIT )
//             / "BYMINUTE"   "=" 1*DIGIT *( "," 1*DIGIT )
//
//   freq      = "SECONDLY" / "MINUTELY" / "HOURLY"
//             / "DAILY" / "WEEKLY" / "MONTHLY" / "YEARLY"
//   weekday   = "SU" / "MO" / "TU" / "WE" / "TH" / "FR" / "SA"
//
// Two features the schema intentionally omits in this first cut, with the
// reasons captured here:
//   - BYDAY ordinal prefix ("1MO" / "-1FR" forms): requires either adjacent
//     slots in the source template (rejected by the inverse-derivation
//     check) or an opaque .until capture that breaks the per-element
//     dispatch. Defer until the compiler grows a list-splitting inverter.
//   - UNTIL datetime form (`YYYYMMDDTHHMMSSZ`): straightforward extra
//     production; left out to keep the first-pass surface area small.
//
// Targets:
//   ast    — { type:'rule', parts:[{type:'freq', value:...}, ...] }
//   source — canonical RRULE string for single-part values (round-trips
//            byte-stable through render→stringify); multi-part values
//            render byte-stably but round-trip only value-stably because
//            the inverter doesn't yet split list-slot captures by the
//            schema-declared separator.

export default defineSchema({
  rootType: 'Rule',
  defaultTarget: 'ast',
  punctuators: {
    eq: '=',
    semi: ';',
    comma: ',',
  },
  tokens: ['number'],
  examples: [
    // ---- FreqValue ---------------------------------------------------
    ...litEnum('FreqValue', [
      'SECONDLY', 'MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY',
    ]),

    // ---- Weekday -----------------------------------------------------
    ...litEnum('Weekday', ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']),

    // ---- NumValue ----------------------------------------------------
    // Wrapper so BY* integer lists can be expressed as a recursive .repeats
    // span. The ast unwraps to the captured number string directly so
    // callers see a flat array of strings instead of {type, value} objects.
    passthrough('NumValue', span('n', '6').number().int()),

    // ---- Part productions --------------------------------------------
    // BYMONTHDAY must precede BYMONTH so the longest-match dispatcher
    // routes the prefix correctly (BYMONTH is a strict prefix of
    // BYMONTHDAY). Each `keyword()` call desugars to a `relation('Part',
    // { input, encodings: { parse, ast: { type, [field]: $.<field> },
    // source: tpl`KEY=${$.<field>}` } })` — see relation.ts for the shape.
    keyword('Part', 'BYMONTHDAY', '=', span('days', '15').of('NumValue').repeats({ sep: ',', min: 1 }), 'bymonthday'),
    keyword('Part', 'BYMONTH', '=', span('months', '6').of('NumValue').repeats({ sep: ',', min: 1 }), 'bymonth'),
    keyword('Part', 'BYMINUTE', '=', span('minutes', '30').of('NumValue').repeats({ sep: ',', min: 1 }), 'byminute'),
    keyword('Part', 'BYHOUR', '=', span('hours', '9').of('NumValue').repeats({ sep: ',', min: 1 }), 'byhour'),
    keyword('Part', 'BYDAY', '=', span('days', 'MO').of('Weekday').repeats({ sep: ',', min: 1 }), 'byday'),
    keyword('Part', 'FREQ', '=', span('value', 'DAILY').of('FreqValue'), 'freq'),
    keyword('Part', 'COUNT', '=', span('value', '10').number().int(), 'count'),
    keyword('Part', 'INTERVAL', '=', span('value', '2').number().int(), 'interval'),
    keyword('Part', 'UNTIL', '=', span('value', '20211231').number().int(), 'until'),
    keyword('Part', 'WKST', '=', span('value', 'MO').of('Weekday'), 'wkst'),

    // ---- Rule root ---------------------------------------------------
    // Natural multi-part example. Phase 2.1 fixed the list-slot inverter
    // to split the captured chunk on the schema-declared separator
    // (`.repeats({ sep: ';' })`) before per-element dispatch; before that
    // fix this had to be a single-part example or codegen round-trip
    // failed.
    valueTagged(
      'Rule',
      span('parts', 'FREQ=DAILY;COUNT=10').of('Part').repeats({ sep: ';', min: 1 }),
      'rule',
    ),
  ],
});
