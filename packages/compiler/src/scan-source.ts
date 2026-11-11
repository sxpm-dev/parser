import { prefixCondition } from './literal-source.ts';
import type { Schema, TextField } from './schema.ts';
const q=JSON.stringify;
function match(lit:string, at='i'):string {
  if(lit===' ') return `(c===32||(c>=9&&c<=13))`;
  return lit.length===1 ? `c===${lit.charCodeAt(0)}` : `(c===${lit.charCodeAt(0)}&&s.startsWith(${q(lit)},${at}))`;
}
export function scanSource(name:string, field:TextField, stops:string[], schema:Schema, pattern:string):string {
  if(field.token) return `${name}(){if(!this.skip())return undefined;${pattern}.lastIndex=this.pos;const m=${pattern}.exec(this.s);if(!m${field.allowEmpty?'':'||!m[0].length'})return this.fail();this.pos+=m[0].length;${field.prefix?.length?`if(!(${field.prefix.map(x=>`m[0].startsWith(${q(x)})`).join('||')}))return this.fail();`:''}return m[0];}`;
  const lex=schema.lexical ?? {};
  const pairs=lex.pairs ?? [['(',')'],['[',']'],['{','}']];
  const escape=lex.escape ?? '\\';
  const quotes=lex.quotes ?? ['"',"'"];
  const code=[`${name}(){`, `if(!this.skip()) return undefined;`, `const s=this.s,start=this.pos; let i=start,stack,opaqueDepth=0;`];
  if(field.prefix?.length) code.push(`if(!(${field.prefix.map(x=>`s.startsWith(${q(x)},i)`).join('||')})) return this.fail();`);
  code.push(`outer: while(i<s.length){ const c=s.charCodeAt(i);`);
  if(escape) code.push(`if(${match(escape)}) {i+=${escape.length};if(i>=s.length){this.pos=i;return this.fail();}i++;continue;}`);
  if(field.balanced) {
    if(quotes.length) code.push(`if(${quotes.map(x=>match(x)).join('||')}) {const quote=c;i++;while(i<s.length&&s.charCodeAt(i)!==quote){${escape ? `if(s.startsWith(${q(escape)},i))i+=${escape.length};` : ''}i++;}if(i>=s.length){this.pos=i;return this.fail();}i++;continue;}`);
    // Consecutive equal-length openers with the same action can share a trie.
    const groups:{openers:string[];close:string}[]=[];
    for(const [open,close] of lex.commentFree ?? []) {
      const last=groups.at(-1);
      if(last && last.close===close && last.openers[0].length===open.length) last.openers.push(open);
      else groups.push({openers:[open],close});
    }
    for(const {openers,close} of groups) code.push(`if(${prefixCondition(openers)}){(stack??=[]).push(${close.charCodeAt(0)});opaqueDepth=stack.length;i+=${openers[0].length};continue;}`);
    for(const [open,close] of lex.comments ?? []) code.push(`if(!opaqueDepth&&(${match(open)})){const end=s.indexOf(${q(close)},i+${open.length});${close==='\n' ? 'i=end<0?s.length:end+1;' : `if(end<0){this.pos=s.length;return this.fail();}i=end+${close.length};`}continue;}`);
    for(const [open,close] of lex.regions ?? []) code.push(`if(${match(open)}){(stack??=[]).push(${close.charCodeAt(0)});i+=${open.length};continue;}`);
  }
  code.push(`if(!stack?.length){`);
  if(stops.length) code.push(`if(${stops.map(x=>match(x)).join('||')}) break;`);
  if(field.reject?.length) code.push(`if(${field.reject.map(x=>match(x)).join('||')}){this.pos=i;return this.fail();}`);
  code.push('}');
  const closers=[...new Set([...pairs,...lex.regions??[],...lex.commentFree??[]].map(([,close])=>close))];
  if(field.balanced && closers.length) {
    code.push('switch(c){');
    for(const [open,close] of pairs) code.push(`case ${open.charCodeAt(0)}:(stack??=[]).push(${close.charCodeAt(0)});i++;continue;`);
    for(const close of closers) code.push(`case ${close.charCodeAt(0)}:if(!stack||stack.pop()!==c){this.pos=i;return this.fail();}if(opaqueDepth&&stack.length<opaqueDepth)opaqueDepth=0;i++;continue;`);
    code.push('}');
  }
  code.push(`i++;}`,`this.pos=i;if(stack?.length)return this.fail();const value=s.slice(start,i).trim();`);
  if(!field.allowEmpty) code.push('if(!value)return this.fail();');
  if(pattern!=='null') code.push(`if(!${pattern}.test(value))return this.fail();`);
  code.push('return value;}');
  return code.join('\n');
}
