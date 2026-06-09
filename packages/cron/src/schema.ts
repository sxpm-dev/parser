import { $, defineSchema, keyword, litTagged, literal, parse, passthrough, range, relation, span, tpl, valueTagged } from '@parser2/parser';

export default defineSchema({
  rootType: 'Cron',
  punctuators: {
    star: '*',
    slash: '/',
    dash: '-',
  },
  tokens: ['number'],
  examples: [
    litTagged('CronField', '*', { type: 'wildcard' }),

    keyword('CronField', '*', '/', span('step', '5').number().int(), 'step'),

    valueTagged('CronField', span('value', '9').number().int(), 'value'),

    range('CronField', span('start', '1').number().int(), '-', span('end', '5').number().int(), 'range'),

    passthrough('CommandWord', span('value', 'npm').ident().css()),

    relation('Command', {
      input: 'npm test',
      encodings: {
        parse: parse([
          span('words', 'npm').of('CommandWord').repeats({ min: 1 }),
        ]),
        ast: { type: 'command', words: $.words },
        source: tpl`${$.words}`,
      },
    }),

    relation('Cron', {
      input: '0 9 7 8 1-5 npm test',
      encodings: {
        parse: parse([
          span('minute', '0').of('CronField'),
          span('hour', '9').of('CronField'),
          span('dayOfMonth', '7').of('CronField'),
          span('month', '8').of('CronField'),
          span('dayOfWeek', '1-5').of('CronField'),
          span('command', 'npm test').of('Command').optional(),
        ]),
        ast: {
          type: 'cron',
          minute: $.minute,
          hour: $.hour,
          dayOfMonth: $.dayOfMonth,
          month: $.month,
          dayOfWeek: $.dayOfWeek,
          command: $.command,
        },
        source: tpl`${$.minute} ${$.hour} ${$.dayOfMonth} ${$.month} ${$.dayOfWeek} ${$.command}`,
      },
    }),
  ],
});
