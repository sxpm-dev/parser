import { $, defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'mac',
  rootType: 'MacAddress',
  punctuators: {
    colon: ':',
    dash: '-',
  },
  examples: [
    ex('00:1A:2B:3C:4D:5E')
      .as('MacAddress')
      .span('o1', '00').hex().lengths([2])
      .span(':')
      .span('o2', '1A').hex().lengths([2])
      .span(':')
      .span('o3', '2B').hex().lengths([2])
      .span(':')
      .span('o4', '3C').hex().lengths([2])
      .span(':')
      .span('o5', '4D').hex().lengths([2])
      .span(':')
      .span('o6', '5E').hex().lengths([2])
      .structure({ type: 'mac-address', octets: [$.o1, $.o2, $.o3, $.o4, $.o5, $.o6], separator: ':' })
      .build(),

    ex('FF-FF-FF-FF-FF-FF')
      .as('MacAddress')
      .span('o1', 'FF').hex().lengths([2])
      .span('-')
      .span('o2', 'FF').hex().lengths([2])
      .span('-')
      .span('o3', 'FF').hex().lengths([2])
      .span('-')
      .span('o4', 'FF').hex().lengths([2])
      .span('-')
      .span('o5', 'FF').hex().lengths([2])
      .span('-')
      .span('o6', 'FF').hex().lengths([2])
      .structure({ type: 'mac-address', octets: [$.o1, $.o2, $.o3, $.o4, $.o5, $.o6], separator: '-' })
      .build(),
  ],
});
