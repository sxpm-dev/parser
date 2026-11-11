/** Factor an ordered set of literal prefixes into character tests. The trie
 * merges only identical suffix predicates; it never generalizes the language. */
export function prefixCondition(literals: readonly string[], source = 's', position = 'i', firstCode = 'c'): string {
  function visit(words: readonly string[], offset: number): string {
    if(words.some(word=>word.length===0)) return 'true';
    const children=new Map<number,string[]>();
    for(const word of words) {
      const code=word.charCodeAt(0);
      const rest=children.get(code) ?? [];
      rest.push(word.slice(1));children.set(code,rest);
    }
    const groups=new Map<string,number[]>();
    for(const [code,rest] of children) {
      const suffix=visit(rest,offset+1);
      const codes=groups.get(suffix) ?? [];codes.push(code);groups.set(suffix,codes);
    }
    const char=offset===0?firstCode:`${source}.charCodeAt(${position}+${offset})`;
    return [...groups].map(([suffix,codes])=>{
      const head=`(${codes.map(code=>`${char}===${code}`).join('||')})`;
      return suffix==='true'?head:`(${head}&&(${suffix}))`;
    }).join('||') || 'false';
  }
  return `(${visit(literals,0)})`;
}
