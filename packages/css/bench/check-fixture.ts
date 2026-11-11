import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import postcss from 'postcss';
import * as api from '../src/index.ts';
import {normalize} from '../../../scripts/style-bench.ts';
const input=readFileSync(new URL('./fixture/huge-page.css',import.meta.url),'utf8');
try {
 const value=api.parse(input);
 assert.deepEqual(value,normalize(postcss.parse(input)));
 assert.deepEqual(api.parse(api.stringify(value)),value);
 console.log(`Preserved CSS fixture: ${input.length} chars, ${value.children.length} root nodes; competitor parity and round trip pass.`);
} catch(e:any) { if(e.offset) console.error(input.slice(e.offset-100,e.offset+100)); throw e; }
