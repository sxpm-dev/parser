import type { Schema } from './schema.ts';
import { infer, equal } from './infer.ts';
import { emit } from './emit.ts';
export * from './schema.ts';
export { infer } from './infer.ts';
export function compile(schema: Schema, options: { typescript?: boolean } = {}): string {
  const grammar=infer(schema);
  const source=emit(grammar);
  // Execute the generated program only at build time to check every teaching
  // example. No schema interpreter or dynamic evaluation ships at runtime.
  const {Reader}=new Function(source.replaceAll('export function ', 'function ')+';return {Reader};')();
  for(const [id,p] of grammar.productions.entries()) {
    for(const example of schema.productions[p.name].examples) for(const target of grammar.outputs) {
      const r=new Reader(example[schema.input],target);
      const actual=r[`p${id}`]();
      if(actual===undefined || !r.skip() || r.pos!==String(example[schema.input]).length || !equal(actual,example[target])) {
        throw new Error(`${p.name}: example does not satisfy inferred grammar or output ${target}`);
      }
    }
  }
  return options.typescript ? emit(grammar,true) : source;
}
