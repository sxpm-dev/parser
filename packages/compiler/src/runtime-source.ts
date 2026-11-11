import { prefixCondition } from './literal-source.ts';
import type { Schema } from './schema.ts';
/** Shared, domain-neutral primitives emitted once per standalone module. */
export function runtimeSource(schema: Schema, singleOutput = false): string {
  const lex = schema.lexical ?? {};
  return `
function isList(v){return Array.isArray(v)&&Object.keys(v).length===v.length;}
function same(a,b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak=Object.keys(a), bk=Object.keys(b);
  return ak.length === bk.length && ak.every(k => Object.hasOwn(b,k) && same(a[k],b[k]));
}
class Reader {
  constructor(s, target, maxDepth=256, verify=false) { this.s=s; this.pos=0; this.far=0; ${singleOutput?'':'this.target=target;'} this.depth=0; this.maxDepth=maxDepth; this.verify=verify; this.skippedAt=-1; }
  fail() { if(this.pos>this.far) this.far=this.pos; return undefined; }
  skip() {
    if(this.skippedAt===this.pos)return true;
    const s=this.s;
    for (;;) {
      while(this.pos<s.length){const c=s.charCodeAt(this.pos);if(${lex.whitespace==='none'?'true':lex.whitespace==='horizontal'?'c!==32&&c!==9':'c!==32&&(c<9||c>13)'})break;this.pos++;}
      const c=s.charCodeAt(this.pos);
      ${ (lex.comments ?? []).map(([open,close])=>`if(${prefixCondition([open],'s','this.pos','c')}) {
        const end=s.indexOf(${JSON.stringify(close)},this.pos+${open.length});
        if(end<0){${close==='\n'?'this.pos=s.length;this.skippedAt=this.pos;return true;':'this.pos=s.length;this.fail();return false;'}}
        this.pos=end+${close.length};continue;
      }`).join('\n') }
      this.skippedAt=this.pos;return true;
    }
  }
  literal(lit) {
    if(!this.skip()) return false;
    if(this.s.startsWith(lit,this.pos)) { this.pos+=lit.length; return true; }
    this.fail(); return false;
  }
  error() { const e=new SyntaxError('Unexpected input at offset '+Math.max(this.pos,this.far)); e.offset=Math.max(this.pos,this.far); return e; }
`;
}
