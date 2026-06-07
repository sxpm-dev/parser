import { $, defineSchema, literal, litEnum, parse, relation, span, tpl } from '@parser2/parser';

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
    relation('NumValue', {
      input: '6',
      encodings: {
        parse: parse([span('n', '6').number().int()]),
        ast: $.n,
        source: tpl`${$.n}`,
      },
    }),

    // ---- Part productions --------------------------------------------
    // BYMONTHDAY must precede BYMONTH so the longest-match dispatcher
    // routes the prefix correctly (BYMONTH is a strict prefix of
    // BYMONTHDAY).
    relation('Part', {
      input: 'BYMONTHDAY=15',
      encodings: {
        parse: parse([
          literal('BYMONTHDAY'),
          literal('='),
          span('days', '15').of('NumValue').repeats({ sep: ',', min: 1 }),
        ]),
        ast: { type: 'bymonthday', days: $.days },
        source: tpl`BYMONTHDAY=${$.days}`,
      },
    }),
    relation('Part', {
      input: 'BYMONTH=6',
      encodings: {
        parse: parse([
          literal('BYMONTH'),
          literal('='),
          span('months', '6').of('NumValue').repeats({ sep: ',', min: 1 }),
        ]),
        ast: { type: 'bymonth', months: $.months },
        source: tpl`BYMONTH=${$.months}`,
      },
    }),
    relation('Part', {
      input: 'BYMINUTE=30',
      encodings: {
        parse: parse([
          literal('BYMINUTE'),
          literal('='),
          span('minutes', '30').of('NumValue').repeats({ sep: ',', min: 1 }),
        ]),
        ast: { type: 'byminute', minutes: $.minutes },
        source: tpl`BYMINUTE=${$.minutes}`,
      },
    }),
    relation('Part', {
      input: 'BYHOUR=9',
      encodings: {
        parse: parse([
          literal('BYHOUR'),
          literal('='),
          span('hours', '9').of('NumValue').repeats({ sep: ',', min: 1 }),
        ]),
        ast: { type: 'byhour', hours: $.hours },
        source: tpl`BYHOUR=${$.hours}`,
      },
    }),
    relation('Part', {
      input: 'BYDAY=MO',
      encodings: {
        parse: parse([
          literal('BYDAY'),
          literal('='),
          span('days', 'MO').of('Weekday').repeats({ sep: ',', min: 1 }),
        ]),
        ast: { type: 'byday', days: $.days },
        source: tpl`BYDAY=${$.days}`,
      },
    }),
    relation('Part', {
      input: 'FREQ=DAILY',
      encodings: {
        parse: parse([
          literal('FREQ'),
          literal('='),
          span('value', 'DAILY').of('FreqValue'),
        ]),
        ast: { type: 'freq', value: $.value },
        source: tpl`FREQ=${$.value}`,
      },
    }),
    relation('Part', {
      input: 'COUNT=10',
      encodings: {
        parse: parse([
          literal('COUNT'),
          literal('='),
          span('value', '10').number().int(),
        ]),
        ast: { type: 'count', value: $.value },
        source: tpl`COUNT=${$.value}`,
      },
    }),
    relation('Part', {
      input: 'INTERVAL=2',
      encodings: {
        parse: parse([
          literal('INTERVAL'),
          literal('='),
          span('value', '2').number().int(),
        ]),
        ast: { type: 'interval', value: $.value },
        source: tpl`INTERVAL=${$.value}`,
      },
    }),
    relation('Part', {
      input: 'UNTIL=20211231',
      encodings: {
        parse: parse([
          literal('UNTIL'),
          literal('='),
          span('value', '20211231').number().int(),
        ]),
        ast: { type: 'until', value: $.value },
        source: tpl`UNTIL=${$.value}`,
      },
    }),
    relation('Part', {
      input: 'WKST=MO',
      encodings: {
        parse: parse([
          literal('WKST'),
          literal('='),
          span('value', 'MO').of('Weekday'),
        ]),
        ast: { type: 'wkst', value: $.value },
        source: tpl`WKST=${$.value}`,
      },
    }),

    // ---- Rule root ---------------------------------------------------
    // Natural multi-part example. Phase 2.1 fixed the list-slot inverter
    // to split the captured chunk on the schema-declared separator
    // (`.repeats({ sep: ';' })`) before per-element dispatch; before that
    // fix this had to be a single-part example or codegen round-trip
    // failed.
    relation('Rule', {
      input: 'FREQ=DAILY;COUNT=10',
      encodings: {
        parse: parse([
          span('parts', 'FREQ=DAILY;COUNT=10').of('Part').repeats({ sep: ';', min: 1 }),
        ]),
        ast: { type: 'rule', parts: $.parts },
        source: tpl`${$.parts}`,
      },
    }),
  ],
});
