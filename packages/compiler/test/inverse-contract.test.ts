import {strict as assert} from 'node:assert';
import test from 'node:test';
import {compile,type Schema} from '../src/index.ts';
const load=async(s:Schema)=>import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
const schema:Schema={input:'wire',output:'data',root:'container',productions:{
  narrow:{examples:[{wire:'x=one;',data:{kind:'narrow',key:'x',value:'one'}}],fields:{key:{kind:'text',prefix:['x']},value:{kind:'text',balanced:true}}},
  broad:{examples:[{wire:'y=two;',data:{kind:'broad',key:'y',value:'two'}}],fields:{key:{kind:'text',pattern:'[a-z]+'},value:{kind:'text',balanced:true}}},
  container:{examples:[{wire:'[y=two;]',data:{items:[{kind:'broad',key:'y',value:'two'}]}}],fields:{items:{kind:'list',item:['narrow','broad','container']}}},
}};
test('inverse validation preserves ordered grammar selection despite expected shape',async()=>{
 const api=await load(schema);
 const v={items:[{kind:'broad',key:'x',value:'two'}]};
 assert.throws(()=>api.stringify(v),/round.trip|represent/i);
 assert.deepEqual(api.parse('[x=two;]'),{items:[{kind:'narrow',key:'x',value:'two'}]});
});
test('inverse validates nested field boundaries, whitespace, keys, counts and empties',async()=>{
 const api=await load(schema);
 const good=api.parse('[[y=(a;b);]x=one;[]]');
 assert.deepEqual(api.parse(api.stringify(good)),good);
 for(const value of ['two;z=three',' two','two ', '"unterminated', '(unbalanced']) {
  const changed=structuredClone(good);changed.items[0].items[0].value=value;
  assert.throws(()=>api.stringify(changed),/round.trip|represent/i);
 }
 const extra=structuredClone(good);extra.items[0].extra=true;
 assert.throws(()=>api.stringify(extra),/represent/i);
 const inherited=Object.create({items:[]});
 assert.throws(()=>api.stringify(inherited),/represent/i);
 const cyclic:any={items:[]};cyclic.items.push(cyclic);
 assert.throws(()=>api.stringify(cyclic),/nesting/i);
});
test('inverse preserves non-object outputs and repeated bindings',async()=>{
 const api=await load({input:'wire',output:'tuple',root:'r',productions:{r:{examples:[{wire:'(alpha)',tuple:['alpha',{copy:'alpha'}],bare:'alpha'}],fields:{'0':{kind:'text',balanced:true}}}}});
 assert.equal(api.stringify(['omega',{copy:'omega'}]),'(omega)');
 assert.throws(()=>api.stringify(['omega',{copy:'different'}]),/represent/i);
 assert.equal(api.stringify('omega',{input:'bare'}),'(omega)');
});
test('renaming input, output, fields and productions does not change grammar semantics',async()=>{
 const renamed=JSON.parse(JSON.stringify(schema).replaceAll('wire','scss').replaceAll('data','css').replaceAll('container','url').replaceAll('narrow','markdown').replaceAll('broad','html').replaceAll('items','nodes'));
 const a=await load(schema),b=await load(renamed);
 const input='[x=three;y=(a;b);]';
 assert.equal(JSON.stringify(a.parse(input)).replaceAll('narrow','markdown').replaceAll('broad','html').replaceAll('items','nodes'),JSON.stringify(b.parse(input)));
 assert.equal(a.stringify(a.parse(input)),b.stringify(b.parse(input)));
});
test('inverse rejects extra enumerable properties on output arrays',async()=>{
 const api=await load(schema);
 const value=api.parse('[y=two;]');
 value.items.extra='not represented';
 assert.throws(()=>api.stringify(value),/represent|round.trip/i);
 const tuple=await load({input:'wire',output:'data',root:'r',productions:{r:{examples:[{wire:'(alpha)',data:['alpha']}],fields:{'0':{kind:'text'}}}}});
 const v:any=['omega'];v.extra=true;
 assert.throws(()=>tuple.stringify(v),/represent|round.trip/i);
});
