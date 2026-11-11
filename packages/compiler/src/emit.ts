import type { Grammar, Inferred, Projection, Slot } from './infer.ts';
import { prefixCondition } from './literal-source.ts';
import { typesSource } from './types-source.ts';
import { scanSource } from './scan-source.ts';
import { runtimeSource } from './runtime-source.ts';
const q = JSON.stringify;
function construct(p: Projection): string {
  if ('ref' in p) return `v${p.ref}`;
  if ('literal' in p) return q(p.literal);
  if ('array' in p) return `[${p.array.map(construct).join(',')}]`;
  return `{${p.object.map(([k,v]) => `[${q(k)}]:${construct(v)}`).join(',')}}`;
}
function inverse(p: Projection, access: string, slots: Slot[], refs: string[]): string[] {
  if ('ref' in p) {
    const f = slots[p.ref].field;
    const checks = [f.kind === 'list' ? `isList(${access})` : f.kind === 'ref' ? 'true' : `typeof ${access}==='string'`];
    if (refs[p.ref]) checks.push(`same(${refs[p.ref]},${access})`);
    else refs[p.ref] = access;
    return checks;
  }
  if ('literal' in p) return [`${access}===${q(p.literal)}`];
  if ('array' in p) return [`isList(${access})`, `${access}.length===${p.array.length}`, ...p.array.flatMap((v,i) => inverse(v,`${access}[${i}]`,slots,refs))];
  return [`${access}!==null`, `typeof ${access}==='object'`, `!Array.isArray(${access})`,
    ...p.object.flatMap(([k,v]) => [`Object.hasOwn(${access},${q(k)})`, ...inverse(v,`${access}[${q(k)}]`,slots,refs)]), `Object.keys(${access}).length===${p.object.length}`];
}
// Conservative overlap of inverse output shapes; lexical rules remain authoritative.
function overlaps(a:Projection,b:Projection):boolean {
  if('ref' in a||'ref' in b)return true;
  if('literal' in a||'literal' in b)return 'literal' in a&&'literal' in b&&q(a.literal)===q(b.literal);
  if('array' in a||'array' in b)return 'array' in a&&'array' in b&&a.array.length===b.array.length&&a.array.every((v,i)=>overlaps(v,b.array[i]));
  return a.object.length===b.object.length&&a.object.every(([k,v])=>{const pair=b.object.find(([key])=>key===k);return !!pair&&overlaps(v,pair[1]);});
}
export function emit(g: Grammar, typescript = false): string {
  const singleOutput = g.outputs.length === 1;
  const ids = new Map(g.productions.map((p,i) => [p.name,i]));
  // Output-shape checks and inverse builders depend on projections/layouts,
  // not lexical constraints. Share identical ones across productions.
  const shapeSignatures=new Map<string,number>();
  const shapeIds=g.productions.map((p,id)=>{
    const key=q(Object.entries(p.outputs).map(([t,v])=>[t,inverse(v,'v',p.slots,[])]));
    if(!shapeSignatures.has(key))shapeSignatures.set(key,id);
    return shapeSignatures.get(key)!;
  });
  const printerSignatures=new Map<string,number>();
  const printerIds=g.productions.map((p,id)=>{
    const key=q([p.parts,p.outputs,p.slots.map(s=>s.field.kind==='text'?'text':s.field.kind==='ref'?['ref',s.field.item]:[s.field.min??0,s.separator,Array.isArray(s.field.item)?s.field.item:'text'])]);
    if(!printerSignatures.has(key))printerSignatures.set(key,id);
    return printerSignatures.get(key)!;
  });
  function ambiguousChoices(candidates:number[]):boolean {
    return candidates.some((id,j)=>candidates.some((other,k)=>j!==k&&printerIds[id]!==printerIds[other]&&g.outputs.some(t=>overlaps(g.productions[id].outputs[t],g.productions[other].outputs[t]))));
  }
  const patterns: string[] = [];
  const scans = new Map<string, {name:string;source:string}>();
  function textCall(field: any, stops: string[]): string {
    stops=[...stops,...field.stop??[]];
    const key=q([field,stops]);
    if(!scans.has(key)) {
      let pattern='null';
      if(field.pattern) { pattern=`RX${patterns.length}`; patterns.push(`const ${pattern}=new RegExp(${q(field.token?`(?:${field.pattern})`:`^(?:${field.pattern})$`)},${q(field.token?'uy':'u')});`); }
      const name=`s${scans.size}`;
      scans.set(key,{name,source:scanSource(name,field,stops,g.schema,pattern)});
    }
    return `this.${scans.get(key)!.name}()`;
  }

  function boundary(stops:string[]):string {
    return `(this.pos===this.s.length||${prefixCondition(stops,'this.s','this.pos','this.s.charCodeAt(this.pos)')})`;
  }
  function binding(p:Inferred,slot:number):string {
    const targets=Object.entries(p.outputs).map(([target,projection])=>{
      const refs:string[]=[];inverse(projection,'expected',p.slots,refs);
      return {target,ref:refs[slot]};
    });
    return targets.length===1?targets[0].ref:targets.map(({target,ref})=>`this.target===${q(target)}?${ref}:`).join('')+'undefined';
  }
  const shapes=g.productions.map((p,id)=>{
    if(shapeIds[id]!==id)return '';
    const cases=Object.entries(p.outputs).map(([target,projection])=>{
      const checks=inverse(projection,'v',p.slots,[]).join('&&') || 'true';
      return {target,checks};
    });
    if(cases.length===1)return `function h${id}(v){return ${cases[0].checks};}`;
    return `function h${id}(v,target){switch(target){${cases.map(({target,checks})=>`case ${q(target)}:return ${checks};`).join('')} }return false;}`;
  }).join('\n');
  function method(p: Inferred, id: number): string {
    const body: string[] = [`p${id}(expected){`, `const start=this.pos; if(++this.depth>this.maxDepth) throw new SyntaxError('Maximum nesting exceeded');`, `const verify=this.verify; let matched=!verify||h${shapeIds[id]}(expected${singleOutput?'':',this.target'});`, `let result;`, `parse: {`];
    const fail = 'break parse;';
    for(let j=0;j<p.parts.length;j++) {
      const part=p.parts[j];
      if(typeof part==='string') {
        const lit=g.schema.lexical?.whitespace==='none'?part:g.schema.lexical?.whitespace==='horizontal'?part.replace(/^[ \t]+|[ \t]+$/g,''):part.trim();
        if(lit) {
          if(j===p.parts.length-1 && p.optionalEnd) body.push(`if(!this.literal(${q(lit)}) && !${boundary(p.optionalEnd)}) { ${fail} }`);
          else for(const token of (g.schema.lexical?.whitespace==='none'?[lit]:g.schema.lexical?.whitespace==='horizontal'?lit.split(/[ \t]+/):lit.split(/\s+/))) body.push(`if(!this.literal(${q(token)})) { ${fail} }`);
        }
        continue;
      }
      const slot=p.slots[part], field=slot.field;
      const following=String(p.parts[j+1] ?? '');
      const policy=g.schema.lexical?.whitespace;
      const next=policy==='none'?following:policy==='horizontal'?following.replace(/^[ \t]+|[ \t]+$/g,'').split(/[ \t]+/)[0]:following.trim().split(/\s+/)[0] || (following ? ' ' : '');
      const stops=[...(next ? [next] : []),...(field.kind==='list'?field.stop??[]:[])];
      if(j===p.parts.length-2 && p.optionalEnd) stops.push(...p.optionalEnd);
      body.push(`const e${part}=verify&&matched?(${binding(p,part)}):undefined;`);
      if(field.kind==='text') {
        body.push(`const v${part}=${textCall(field,stops)}; if(v${part}===undefined) { ${fail} }`, `if(verify&&v${part}!==e${part})matched=false;`);
      } else if(field.kind==='ref') {
        body.push(`let v${part};`);
        for(const name of field.item) body.push(`if(v${part}===undefined)v${part}=this.p${ids.get(name)}(e${part});`);
        body.push(`if(v${part}===undefined){${fail}}if(verify&&v${part}!==true)matched=false;`);
      } else {
        body.push(`const v${part}=verify?undefined:[]; let n${part}=0;`);
        const sep=g.schema.lexical?.whitespace==='none'||g.schema.lexical?.whitespace==='horizontal'?slot.separator:slot.separator.trim();
        const append=Array.isArray(field.item)
          ? `if(verify){if(child!==true)matched=false;}else v${part}.push(child);n${part}++;`
          : `if(verify){if(child!==e${part}?.[n${part}])matched=false;}else v${part}.push(child);n${part}++;`;
        if(Array.isArray(field.item)) {
          body.push(`if(!this.skip()) { ${fail} }`, `while(!${boundary(stops)}){`, `const before=this.pos; let child;`);
          for(const name of field.item) body.push(`if(child===undefined) child=this.p${ids.get(name)}(verify?e${part}?.[n${part}]:undefined);`);
          if(field.whileMatches)body.push(`if(child===undefined)break;`);
          body.push(`if(child===undefined || this.pos===before) { ${fail} }`, append, `if(!this.skip()) { ${fail} }`);
          if(sep) body.push(`if(${boundary(stops)}) break; if(!this.literal(${q(sep)})${field.trailing?'||!this.skip()':''}) { ${fail} } if(${boundary(stops)}) { ${field.trailing?'break;':fail} }`);
          body.push('}');
        } else {
          if(!sep) throw new Error(`${p.name}: text lists need a nonempty separator`);
          body.push(`if(!this.skip()) { ${fail} }`, `if(!${boundary(stops)}) { for(;;) {`, `const child=${textCall(field.item,[sep,...stops])}; if(child===undefined) { ${fail} }`, append, field.item.token?`if(!this.skip()){${fail}}`:'', `if(${boundary(stops)}) break; if(!this.literal(${q(sep)})${field.trailing?'||!this.skip()':''}) { ${fail} }`, field.trailing?`if(${boundary(stops)})break;`:'', `} }`);
        }
        body.push(`if(n${part}<${field.min ?? 0}) { ${fail} }`, `if(verify&&n${part}!==e${part}?.length)matched=false;`);
      }
    }
    body.push('if(verify)result=matched;else {');
    if(Object.keys(p.outputs).length===1) body.push(`result=${construct(Object.values(p.outputs)[0])};`);
    else {
      body.push('switch(this.target){');
      for(const [target,projection] of Object.entries(p.outputs)) body.push(`case ${q(target)}: result=${construct(projection)}; break;`);
      body.push('}');
    }
    body.push('}', '}', 'this.depth--; if(result===undefined){this.fail();this.pos=start;} return result;', '}');
    return body.join('\n');
  }
  const methods=g.productions.map(method).join('\n');
  const printers: string[]=[];
  for(const [id,p] of g.productions.entries()) {
    if(printerIds[id]!==id)continue;
    const lines=[`function w${id}(v,${singleOutput?'':'target,'}depth){`, `if(depth>256) throw new TypeError('Maximum nesting exceeded');`, `if(!h${shapeIds[id]}(v${singleOutput?'':',target'})) return undefined;`, singleOutput?'':'switch(target){'];
    for(const [target,projection] of Object.entries(p.outputs)) {
      const refs:string[]=[];
      inverse(projection,'v',p.slots,refs);
      lines.push(singleOutput?'':`case ${q(target)}: {`);
      for(const [i,slot] of p.slots.entries()) {
        if(slot.field.kind==='text') lines.push(`const s${i}=${refs[i]};`);
        else if(slot.field.kind==='ref') {
          lines.push(`let s${i};`);
          const candidates=slot.field.item.map(name=>ids.get(name)!);
          const ambiguous=ambiguousChoices(candidates);
          for(const child of candidates) {
            lines.push(`if(s${i}===undefined){s${i}=w${printerIds[child]}(${refs[i]},${singleOutput?'':'target,'}depth+1);`);
            if(ambiguous)lines.push(`if(s${i}!==undefined){const r=new Reader(s${i},${singleOutput?"undefined":'target'},256,true);try{if(r.p${child}(${refs[i]})!==true||!r.skip()||r.pos!==s${i}.length)s${i}=undefined;}catch{s${i}=undefined;}}`);
            lines.push('}');
          }
          lines.push(`if(s${i}===undefined)return undefined;`);
        } else {
          lines.push(`if(${refs[i]}.length<${slot.field.min ?? 0}) return undefined;`, `const a${i}=[];`);
          if(Array.isArray(slot.field.item)) {
            lines.push(`for(const x of ${refs[i]}) { let s;`);
            const candidates=slot.field.item.map(name=>ids.get(name)!);
            if(ambiguousChoices(candidates)) {
              for(const child of candidates)lines.push(`if(s===undefined){s=w${printerIds[child]}(x,${singleOutput?'':'target,'}depth+1);if(s!==undefined){const r=new Reader(s,${singleOutput?'undefined':'target'},256,true);try{if(r.p${child}(x)!==true||!r.skip()||r.pos!==s.length)s=undefined;}catch{s=undefined;}}}`);
            } else for(const childId of new Set(candidates.map(id=>printerIds[id]))) lines.push(`if(s===undefined) s=w${childId}(x,${singleOutput?'':'target,'}depth+1);`);
            lines.push(`if(s===undefined) return undefined; a${i}.push(s); }`);
          } else lines.push(`for(const x of ${refs[i]}) {if(typeof x!=='string') return undefined; a${i}.push(x);}`);
          lines.push(`const s${i}=a${i}.join(${q(slot.separator)});`);
        }
      }
      lines.push(`return ${p.parts.map(part => typeof part==='string' ? q(part) : `s${part}`).join('+')};${singleOutput?'':' }'}`);
    }
    lines.push(singleOutput?'}':'} return undefined; }'); printers.push(lines.join('\n'));
  }
  const rootId=ids.get(g.schema.root);
  const encodingEntries=Object.entries(g.schema.encodings ?? {});
  const code=`// @ts-nocheck\n// Generated by @parser3/compiler. Edit schema examples, then run npm run generate.\n${patterns.join('\n')}\n${shapes}\n${runtimeSource(g.schema,singleOutput)}\n${methods}\n${[...scans.values()].map(x=>x.source).join('\n')}\n}\n${printers.join('\n')}
function target(name){
  switch(name){
    ${g.outputs.map(t=>`case ${q(t)}: return [name,false];`).join('\n')}
    ${encodingEntries.map(([t,e])=>`case ${q(t)}: return [${q(e.from)},true];`).join('\n')}
    default: throw new TypeError('Unknown output '+name);
  }
}
${typescript ? typesSource(g) : ""}
export function parse(input${typescript ? ": string" : ""},options${typescript ? ": { output?: string; maxDepth?: number }" : ""}={})${typescript ? ": any" : ""} {
  if(typeof input!=='string') throw new TypeError('Input must be text');
  const [t,json]=target(options.output ?? ${q(g.schema.output)});
  const max=options.maxDepth ?? 256;
  if(!Number.isInteger(max)||max<1||max>512) throw new TypeError('maxDepth must be 1..512');
  const r=new Reader(input,t,max);
  const value=r.p${rootId}();
  if(value===undefined || !r.skip() || r.pos!==input.length) throw r.error();
  return json ? JSON.stringify(value) : value;
}
export function stringify(value${typescript ? ": unknown" : ""},options${typescript ? ": { input?: string }" : ""}={})${typescript ? ": string" : ""} {
  const name=options.input ?? ${q(g.schema.output)};
  const [t,json]=target(name);
  if(json) { if(typeof value!=='string') throw new TypeError('Encoded input must be text'); value=JSON.parse(value); }
  const source=w${printerIds[rootId!]}(value,${singleOutput?'':'t,'}0);
  // Compare through the same ordered grammar without a second output tree.
  if(source!==undefined) {
    const check=new Reader(source,t,256,true);
    try {
      if(check.p${rootId}(value)===true && check.skip() && check.pos===source.length) return source;
    } catch {}
  }
  throw new TypeError('Value is not representable by this grammar');
}
export function validate(input){parse(input);}
`;
  return code.replace(/[ \t]+$/gm,'');
}
