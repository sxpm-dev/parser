import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

export default defineSchema({
  rootType: 'Cron',
  punctuators: {
    star: '*',
    slash: '/',
    dash: '-',
  },
  tokens: ['number'],
  examples: [
    relation('CronField', {
      input: '*',
      encodings: {
        parse: parse([
          literal('*'),
        ]),
        ast: { type: 'wildcard' },
        source: tpl`*`,
      },
    }),

    relation('CronField', {
      input: '*/5',
      encodings: {
        parse: parse([
          literal('*'),
          literal('/'),
          span('step', '5').number().int(),
        ]),
        ast: { type: 'step', step: $.step },
        source: tpl`*/${$.step}`,
      },
    }),

    relation('CronField', {
      input: '9',
      encodings: {
        parse: parse([
          span('value', '9').number().int(),
        ]),
        ast: { type: 'value', value: $.value },
        source: tpl`${$.value}`,
      },
    }),

    relation('CronField', {
      input: '1-5',
      encodings: {
        parse: parse([
          span('start', '1').number().int(),
          literal('-'),
          span('end', '5').number().int(),
        ]),
        ast: { type: 'range', start: $.start, end: $.end },
        source: tpl`${$.start}-${$.end}`,
      },
    }),

    relation('CommandWord', {
      input: 'npm',
      encodings: {
        parse: parse([
          span('value', 'npm').ident().css(),
        ]),
        ast: $.value,
        source: tpl`${$.value}`,
      },
    }),

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
