import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';
import { repositoryRoot } from './parser-packages.ts';
import { competitor } from './parser-competitors.ts';
import { runBenchTable } from './bench-table.ts';
export async function runParserBench(name:string,checkOnly=false){
 const root=`${repositoryRoot}packages/${name}`;
 const {seed}=await import(pathToFileURL(`${root}/bench/cases.ts`).href);
 const api=await import(pathToFileURL(`${root}/src/index.ts`).href);
 const ref=await competitor(name);
 const expected=api.parse(seed);assert.deepEqual(api.parse(api.stringify(expected)),expected);
 const reference=ref.parse(seed);assert.ok(reference!==undefined&&reference!==null,`${name}: competitor rejected seed`);
 const mode=process.argv.includes('--round-trip')?'round-trip':process.argv.includes('--stringify')?'stringify':process.argv.includes('--json')?'json':'parse';
 let jsonSupported=true;try{JSON.stringify(reference);}catch{jsonSupported=false;}
 if(ref.stringify)assert.ok(typeof ref.stringify(reference)==='string',`${name}: competitor inverse must return text`);
 assert.equal(typeof api.parse(seed,{output:'json'}),'string');
 if(checkOnly){console.log(`${name}: generated inverse + ${ref.label} seed checked`);return;}
 const prepared=new Map<string,{rows:string[];ours:any[];theirs:any[]}>();
 const prepare=(input:string)=>{let data=prepared.get(input);if(!data){const rows=input.split('\0');data={rows,ours:rows.map(s=>api.parse(s)),theirs:rows.map(s=>ref.parse(s))};prepared.set(input,data);}return data;};
 const generateInput=(bytes:number)=>{const s=Array(Math.max(1,Math.ceil(bytes/(seed.length+1)))).fill(seed).join('\0');prepare(s);return s;};
 const contestants=[{label:'generated (checked inverse)',unit:'documents',fn:(s:string)=>{const data=prepare(s);for(let i=0;i<data.rows.length;i++){
  if(mode==='parse')api.parse(data.rows[i]);else if(mode==='json')api.parse(data.rows[i],{output:'json'});else if(mode==='stringify')api.stringify(data.ours[i]);else api.stringify(api.parse(data.rows[i]));
 }return {units:data.rows.length};}}];
 if((mode==='parse'||(mode==='json'&&jsonSupported))||((mode==='stringify'||mode==='round-trip')&&ref.stringify))contestants.push({label:ref.label,unit:'documents',fn:(s:string)=>{const d=prepare(s);for(let i=0;i<d.rows.length;i++){
 if(mode==='parse')ref.parse(d.rows[i]);else if(mode==='json')JSON.stringify(ref.parse(d.rows[i]));else if(mode==='stringify')ref.stringify!(d.theirs[i]);else ref.stringify!(ref.parse(d.rows[i]));
 }return {units:d.rows.length};}});
 else console.log(`${ref.label} does not support this output mode; comparison omitted.`);
 console.log(ref.contract);
 await runBenchTable({title:`${name}: ${mode} — batched independent documents`,generateInput,contestants,sizesKb:process.argv.includes('--smoke')?[1]:[5,20,100,500,1000]});
}
