import { $, defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  rootType: 'Cron',
  punctuators: {
    star: '*',
    slash: '/',
    dash: '-',
  },
  tokens: ['number'],
  examples: [
    ex('*')
      .as('CronField')
      .span('*')
      .structure({ type: 'wildcard' })
      .build(),

    ex('*/5')
      .as('CronField')
      .span('*')
      .span('/')
      .span('step', '5').number().int()
      .structure({ type: 'step', step: $.step })
      .build(),

    ex('9')
      .as('CronField')
      .span('value', '9').number().int()
      .structure({ type: 'value', value: $.value })
      .build(),

    ex('1-5')
      .as('CronField')
      .span('start', '1').number().int()
      .span('-')
      .span('end', '5').number().int()
      .structure({ type: 'range', start: $.start, end: $.end })
      .build(),

    ex('npm')
      .as('CommandWord')
      .span('value', 'npm').ident().css()
      .structure($.value)
      .build(),

    ex('npm test')
      .as('Command')
      .span('words', 'npm', 'CommandWord').repeats({ min: 1 })
      .structure({ type: 'command', words: $.words })
      .build(),

    ex('0 9 7 8 1-5 npm test')
      .as('Cron')
      .span('minute', '0', 'CronField')
      .span('hour', '9', 'CronField')
      .span('dayOfMonth', '7', 'CronField')
      .span('month', '8', 'CronField')
      .span('dayOfWeek', '1-5', 'CronField')
      .span('command', 'npm test', 'Command').optional()
      .structure({
        type: 'cron',
        minute: $.minute,
        hour: $.hour,
        dayOfMonth: $.dayOfMonth,
        month: $.month,
        dayOfWeek: $.dayOfWeek,
        command: $.command,
      })
      .build(),
  ],
});
