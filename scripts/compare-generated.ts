import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {runBenchTable,repeatToBytes,type Contestant} from './bench-table.ts';
const [beforePath,afterPath,seedPath]=process.argv.slice(2);
if(!seedPath)throw new Error('Usage: tsx compare-generated.ts before.mjs after.mjs seed.txt');
async function artifact(path:string){
 const bytes=readFileSync(resolve(path));
 const source=path.endsWith('.gz')?gunzipSync(bytes):bytes;
 return import(`data:text/javascript;base64,${source.toString('base64')}`);
}
const before=await artifact(beforePath);
const after=await artifact(afterPath);
const seed=readFileSync(seedPath,'utf8');
for(const size of [5,100,1000]) {
 const input=repeatToBytes(seed,size*1024);
 const old=before.parse(input),next=after.parse(input);
 assert.deepEqual(next,old);
 assert.equal(after.stringify(next),before.stringify(old));
}
for(const mode of ['parse','stringify','round-trip']) {
 const contestants:Contestant[]=[['before',before],['after',after]].map(([label,api])=>{
  let inputCache:string|undefined,value:any;
  return {label:String(label),unit:mode==='parse'?'inputs':'bytes',fn:(input:string)=>{
   if(mode==='parse'){const output=api.parse(input);return {units:output===undefined?0:1};}
   if(mode==='round-trip')return {units:api.stringify(api.parse(input)).length};
   if(input!==inputCache){value=api.parse(input);inputCache=input;}
   return {units:api.stringify(value).length};
  }};
 });
 await runBenchTable({title:`${mode}: identical schemas, inputs and output/validation contract`,contestants,seed,prepare:repeatToBytes,sizesKb:[5,100,1000]});
}
