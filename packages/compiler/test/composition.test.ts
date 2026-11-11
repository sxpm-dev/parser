import { strict as assert } from 'node:assert';
import test from 'node:test';
import { compile } from '../src/index.ts';
const schema:any={input:'source',output:'value',root:'root',productions:{
 word:{examples:[{source:'alice',value:{word:'alice'}}],fields:{word:{kind:'text',pattern:'[a-z]+',token:true}}},
 group:{examples:[{source:'(alice)',value:{group:{word:'alice'}}}],fields:{group:{kind:'ref',item:['group','word']}}},
 root:{examples:[{source:'(alice)',value:{group:{word:'alice'}}}],fields:{'':{kind:'ref',item:['group','word']}}}
}};
test('scalar recursive alternatives infer unseen trees and checked inverses',async()=>{
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(schema)).toString('base64')}`);
 const value={group:{group:{word:'bob'}}};
 assert.deepEqual(api.parse('((bob))'),value);
 assert.equal(api.stringify(value),'((bob))');
 assert.throws(()=>api.parse('(bob]'));
 assert.throws(()=>api.stringify({word:'bob)'}));
});
test('prefix captures compose adjacent fields and preserve significant newlines',async()=>{
 const s:any={input:'source',output:'value',root:'pair',lexical:{whitespace:'horizontal'},productions:{pair:{examples:[{source:'12kg\n',value:{amount:'12',unit:'kg'}}],fields:{amount:{kind:'text',token:true,pattern:'[0-9]+'},unit:{kind:'text',token:true,pattern:'[a-z]+'}}}}};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.deepEqual(api.parse('35lb\n'),{amount:'35',unit:'lb'});
 assert.throws(()=>api.parse('35lb'));
});
test('bounded repetitions stop at nonmatching syntax and validate empty evidence',async()=>{
 const s:any={input:'source',output:'value',root:'group',productions:{
 atom:{examples:[{source:'alpha',value:{name:'alpha'}}],fields:{name:{kind:'text',pattern:'[a-z]+',token:true}}},
 group:{examples:[{source:'(alpha)',value:{items:[{name:'alpha'}]}},{source:'()',value:{items:[]}}],fields:{items:{kind:'list',item:['atom'],whileMatches:true,separator:''}}}
 }};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.deepEqual(api.parse('()'),{items:[]});assert.deepEqual(api.parse('(beta gamma)'),{items:[{name:'beta'},{name:'gamma'}]});
 assert.throws(()=>api.parse('(beta 1)'));
});
test('line-list trailing separators are explicit and empty token cells advance through delimiters',async()=>{
 const s:any={input:'source',output:'value',root:'rows',lexical:{whitespace:'none'},productions:{
 cell:{examples:[{source:'alice,42',value:{cells:['alice','42']}}],fields:{cells:{kind:'list',item:{kind:'text',token:true,pattern:'[^,\\r\\n]*',allowEmpty:true},separator:',',stop:['\n']}}},
 rows:{examples:[{source:'alice,42',value:{rows:[{cells:['alice','42']}]}}],fields:{rows:{kind:'list',item:['cell'],separator:'\n',trailing:true}}}
 }};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.deepEqual(api.parse('bob,\n'),{rows:[{cells:['bob','']}]});
});
test('both list kinds allow explicit trailing separators before skipped whitespace',async()=>{
 for(const item of [{kind:'text',pattern:'[a-z]+',token:true},['word']]){
 const s:any={input:'source',output:'value',root:'root',productions:{word:{examples:[{source:'a',value:'a'}],fields:{'':{kind:'text',pattern:'[a-z]+',token:true}}},root:{examples:[{source:'[a,b]',value:['a','b']}],fields:{'':{kind:'list',item,separator:',',trailing:true}}}}};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.deepEqual(api.parse('[a,b, ]'),['a','b']);
 }
});
test('significant delimiters keep the newline owned by the enclosing production',async()=>{
 const s:any={input:'source',output:'value',root:'root',lexical:{whitespace:'horizontal'},productions:{
 row:{examples:[{source:'alice',value:{name:'alice'}}],fields:{name:{kind:'text',token:true,pattern:'[a-z]+'}}},
 root:{examples:[{source:'BEGIN\nalice\nEND',value:{rows:[{name:'alice'}]}}],fields:{rows:{kind:'list',item:['row'],separator:'\n'}}}
 }};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.deepEqual(api.parse('BEGIN\nbob\ncarol\nEND'),{rows:[{name:'bob'},{name:'carol'}]});
});
test('inverse scalar alternatives retry same-shaped candidates using their lexical rules',async()=>{
 const s:any={input:'source',output:'value',root:'root',productions:{
 word:{examples:[{source:'word: abc;',value:{name:'abc'}}],fields:{name:{kind:'text',token:true,pattern:'[a-z]+'}}},
 number:{examples:[{source:'number: 12;',value:{name:'12'}}],fields:{name:{kind:'text',token:true,pattern:'[0-9]+'}}},
 root:{examples:[{source:'word: abc;',value:{name:'abc'}}],fields:{'':{kind:'ref',item:['word','number']}}}
 }};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.equal(api.stringify({name:'42'}),'number: 42;');
});
test('token captures retain declared prefix constraints',async()=>{
 const s:any={input:'source',output:'value',root:'root',productions:{root:{examples:[{source:'xray',value:'xray'}],fields:{'':{kind:'text',token:true,pattern:'[a-z]+',prefix:['x']}}}}};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.throws(()=>api.parse('alpha'),SyntaxError);assert.equal(api.parse('xenon'),'xenon');
});
test('inverse list alternatives also retry overlapping shapes with distinct layouts',async()=>{
 const s:any={input:'source',output:'value',root:'root',productions:{
 word:{examples:[{source:'word: abc;',value:{name:'abc'}}],fields:{name:{kind:'text',token:true,pattern:'[a-z]+'}}},
 number:{examples:[{source:'number: 12;',value:{name:'12'}}],fields:{name:{kind:'text',token:true,pattern:'[0-9]+'}}},
 root:{examples:[{source:'word: abc;',value:[{name:'abc'}]}],fields:{'':{kind:'list',item:['word','number'],separator:' '}}}
 }};
 const api=await import(`data:text/javascript;base64,${Buffer.from(compile(s)).toString('base64')}`);
 assert.equal(api.stringify([{name:'42'}]),'number: 42;');
});
