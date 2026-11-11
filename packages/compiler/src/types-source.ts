import type {Grammar, Projection, Inferred} from './infer.ts';
export function typesSource(g:Grammar):string {
  const ids=new Map(g.productions.map((p,i)=>[p.name,i]));
  const targetId=(t:string)=>g.outputs.indexOf(t);
  function shape(p:Projection,rule:Inferred,target:string):string {
    if('literal' in p) return JSON.stringify(p.literal);
    if('array' in p) return `[${p.array.map(x=>shape(x,rule,target)).join(',')}]`;
    if('object' in p) return `{${p.object.map(([k,v])=>`${JSON.stringify(k)}:${shape(v,rule,target)}`).join(';')}}`;
    const field=rule.slots[p.ref].field;
    if(field.kind==='text') return 'string';
    if(field.kind==='ref') return field.item.map(n=>`Node${ids.get(n)}_${targetId(target)}`).join('|');
    return Array.isArray(field.item) ? `Array<${field.item.map(n=>`Node${ids.get(n)}_${targetId(target)}`).join('|')}>` : 'string[]';
  }
  const lines:string[]=[];
  for(const [i,rule] of g.productions.entries()) for(const [target,p] of Object.entries(rule.outputs)) lines.push(`export type Node${i}_${targetId(target)} = ${shape(p,rule,target)};`);
  lines.push(`export interface Outputs {${g.outputs.map(t=>`${JSON.stringify(t)}:Node${ids.get(g.schema.root)}_${targetId(t)}`).join(';')};${Object.keys(g.schema.encodings??{}).map(t=>`${JSON.stringify(t)}:string`).join(';')}}`);
  lines.push(`export function parse<T extends keyof Outputs = ${JSON.stringify(g.schema.output)}>(input:string,options?:{output?:T;maxDepth?:number}):Outputs[T];`);
  return lines.join('\n');
}
