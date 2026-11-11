import { strict as assert } from 'node:assert';
import test from 'node:test';
import { compile, type Schema } from '../src/index.ts';

async function runtime(schema: any) {
  const source = compile(schema);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const record: Schema = {
  input: 'text', output: 'record', root: 'entry',
  productions: {
    entry: {
      examples: [
        { text: 'name = alice;', record: { key: 'name', value: 'alice' }, alternate: { label: 'name', data: { text: 'alice' } } },
        { text: 'city = paris;', record: { key: 'city', value: 'paris' }, alternate: { label: 'city', data: { text: 'paris' } } },
      ],
      fields: { key: { kind: 'text', pattern: '[a-z]+' }, value: { kind: 'text', balanced: true } },
    },
  },
  encodings: { json: { from: 'record', format: 'json' } },
};
test('infers unseen records and alternate nested output shapes, with inverse', async () => {
  const api = await runtime(record);
  assert.deepEqual(api.parse('country = japan;'), { key: 'country', value: 'japan' });
  assert.deepEqual(api.parse('country = japan;', { output: 'alternate' }), { label: 'country', data: { text: 'japan' } });
  assert.equal(api.stringify({ label: 'country', data: { text: 'japan' } }, { input: 'alternate' }), 'country = japan;');
  assert.equal(api.parse('country = japan;', { output: 'json' }), '{"key":"country","value":"japan"}');
  assert.deepEqual(api.parse(api.stringify('{"key":"country","value":"japan"}', { input: 'json' })), { key: 'country', value: 'japan' });
});
test('rejects malformed, trailing, unknown-target and invalid inverse inputs', async () => {
  const api = await runtime(record);
  for (const text of ['bad key = x;', 'x = "unterminated;', 'x = (a];', 'x = a; junk']) assert.throws(() => api.parse(text), SyntaxError);
  assert.throws(() => api.parse('x = a;', { output: 'missing' }), /output/i);
  assert.throws(() => api.stringify({ key: 'x', value: 'a; y = b' }), /represent|round.trip|value/i);
});
test('infers list separators from paired examples', async () => {
  const api = await runtime({ input: 'text', output: 'data', root: 'group', productions: { group: {
    examples: [{ text: '[alpha, beta]', data: { names: ['alpha', 'beta'] } }],
    fields: { names: { kind: 'list', item: { kind: 'text', balanced: true }, min: 1 } },
  } } });
  assert.deepEqual(api.parse('[one, fn(two, three), four]'), { names: ['one', 'fn(two, three)', 'four'] });
  assert.throws(() => api.parse('[]'), SyntaxError);
  assert.throws(() => api.parse('[one,]'), SyntaxError);
});
test('fails compilation for ambiguous captures and inconsistent examples', () => {
  const bad = structuredClone(record);
  bad.productions.entry.examples[0].text = 'name name = alice;';
  assert.throws(() => compile(bad), /ambiguous/i);
  const inconsistent = structuredClone(record);
  inconsistent.productions.entry.examples[1].text = 'city : paris;';
  assert.throws(() => compile(inconsistent), /example|layout|literal/i);
});
test('emits standalone deterministic code without runtime grammar data', () => {
  const a = compile(record);
  assert.equal(a, compile(record));
  assert.doesNotMatch(a, /\bimport\s|examples:|productions:/);
});
test('recursive alternatives align children by output shape, not declaration order', async () => {
  const api = await runtime({input:'text',output:'data',root:'box',productions:{
    atom:{examples:[{text:'x=one;',data:{key:'x',value:'one'}}],fields:{key:{kind:'text',pattern:'[a-z]+'},value:{kind:'text'}}},
    box:{examples:[{text:'[x=one;]',data:{items:[{key:'x',value:'one'}]}}],fields:{items:{kind:'list',item:['atom','box']}}},
    outer:{examples:[{text:'([x=one;])',data:{items:[{items:[{key:'x',value:'one'}]}]}}],fields:{items:{kind:'list',item:['atom','box']}}},
  }});
  assert.deepEqual(api.parse('[[q=two;]]'),{items:[{items:[{key:'q',value:'two'}]}]});
});
test('prefix constraints distinguish alternatives without changing inferred layouts', async () => {
  const schema: Schema = {input:'text',output:'data',root:'item',productions:{item:{examples:[{text:'@one;',data:{value:'@one'}}],fields:{value:{kind:'text',prefix:['@'],balanced:true}}}}};
  const api=await runtime(schema);
  assert.deepEqual(api.parse('@two;'),{value:'@two'});
  assert.throws(()=>api.parse('#two;'),SyntaxError);
});
test('rejects examples that violate metadata and indistinguishable alternatives', () => {
  const bad=structuredClone(record);
  bad.productions.entry.fields.key={kind:'text',pattern:'[0-9]+'};
  assert.throws(()=>compile(bad),/example/i);
  const duplicate=structuredClone(record);
  duplicate.productions.copy=structuredClone(duplicate.productions.entry);
  assert.throws(()=>compile(duplicate),/indistinguishable|duplicate/i);
});
test('regions close independently of the ordinary bracket vocabulary', async () => {
  for(const policy of ['regions','commentFree']) {
    const schema:Schema={input:'text',output:'data',root:'r',lexical:{pairs:[],[policy]:[['<','>']]},productions:{r:{examples:[{text:'ok;',data:{v:'ok'}}],fields:{v:{kind:'text',balanced:true}}}}};
    const api=await runtime(schema);
    assert.deepEqual(api.parse('<a;b>;'),{v:'<a;b>'});
  }
});
