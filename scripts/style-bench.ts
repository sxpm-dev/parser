import { strict as assert } from 'node:assert';
import postcss from 'postcss';
import { runBenchTable, repeatToBytes, type Contestant } from './bench-table.ts';

export function normalize(root: any): any {
  return { children: (root.nodes ?? []).filter((n:any)=>n.type!=='comment').map((n:any) => {
    if(n.variable && n.type==='atrule') return {variable:'@'+n.name,value:n.value};
    if(n.mixin) return {call:(n.raws.identifier ?? '.')+n.name+n.params};
    if(n.type==='rule') return {selectors:postcss.list.comma(n.selector),children:normalize(n).children};
    if(n.type==='decl') {
      const key=/^[$@]/.test(n.prop)?'variable':'property';
      return {[key]:n.prop,value:n.value+(n.important?' !important':'')};
    }
    const prelude='@'+n.name+(n.params?' '+n.params:'');
    return n.nodes ? {prelude,children:normalize(n).children} : {statement:prelude};
  }) };
}
export async function runStyleBench(name:string, api:any, seed:string, competitor:(s:string)=>any, label:string, namedInputs:{label:string,input:string}[]=[]) {
  // Validate work equivalence before timing. Full competitor outputs retain
  // their native positions/raw metadata; we disclose that in the report.
  assert.deepEqual(api.parse(seed),normalize(competitor(seed)),`${name}: comparison corpus output mismatch`);
  for(const {input} of namedInputs) assert.deepEqual(api.parse(input),normalize(competitor(input)));
  const json=process.argv.includes('--json');
  const round=process.argv.includes('--round-trip');
  const reverse=process.argv.includes('--stringify');
  function prepared(parse:(s:string)=>any,print:(v:any)=>string) {
    let previous:string|undefined, value:any;
    return (s:string)=>{if(s!==previous){value=parse(s);previous=s;}return {units:print(value).length};};
  }
  const contestants:Contestant[] = reverse ? [
    {label:'generated stringify',unit:'bytes',fn:prepared(api.parse,api.stringify)},
    {label:label+' stringify',unit:'bytes',fn:prepared(competitor,v=>v.toString())},
  ] : round ? [
    {label:'generated parse + stringify',unit:'bytes',fn:s=>({units:api.stringify(api.parse(s)).length})},
    {label:label+' parse + stringify',unit:'bytes',fn:s=>({units:competitor(s).toString().length})},
  ] : json ? [
    {label:'generated JSON',unit:'bytes',fn:s=>({units:api.parse(s,{output:'json'}).length})},
    {label:label+' normalized JSON',unit:'bytes',fn:s=>({units:JSON.stringify(normalize(competitor(s))).length})},
  ] : [
    {label:'generated object',unit:'top-level nodes',fn:s=>({units:api.parse(s).children.length})},
    {label,unit:'top-level nodes',fn:s=>({units:competitor(s).nodes.filter((n:any)=>n.type!=='comment').length})},
  ];
  for(const contestant of contestants.slice(1)) {
    if(name==='less') (contestant as {skipFor?:(s:string)=>boolean}).skipFor=s=>s.length>110*1024;
  }
  await runBenchTable({title:`${name}: ${reverse?'stringify':round?'round trip':json?'JSON':'parse'} (full structural outputs, native competitor metadata)`,seed,prepare:repeatToBytes,contestants,sizesKb:[5,20,100,500,1000],namedInputs,parserColumnWidth:42});
}
