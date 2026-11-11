import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('filter: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"head": {"head": {"head": {"head": {"head": {"kind": "identifier", "name": "price"}, "tail": []}, "tail": []}, "tail": []}, "tail": []}, "tail": [{"operator": "||", "value": {"head": {"head": {"head": {"head": {"kind": "number", "raw": "2"}, "tail": []}, "tail": []}, "tail": []}, "tail": []}}]});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
