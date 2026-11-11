import type { Field, Production, Schema, Value } from './schema.ts';
export type Projection = { ref: number } | { literal: Value } | { array: Projection[] } | { object: [string, Projection][] };
export interface Slot { name: string; field: Field; separator: string; }
export interface Inferred { name: string; slots: Slot[]; parts: (string | number)[]; outputs: Record<string, Projection>; optionalEnd?: string[]; }
export interface Grammar { schema: Schema; productions: Inferred[]; outputs: string[]; }
export const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export function at(value: any, path: string): any { return path === '' ? value : path.split('.').reduce((v, k) => v?.[k], value); }

export function infer(schema: Schema): Grammar {
  for(const [open,close] of schema.lexical?.pairs ?? []) if(open.length!==1||close.length!==1) throw new Error('Balanced pairs require single-character delimiters');
  for(const [open,close] of [...schema.lexical?.regions ?? [], ...schema.lexical?.commentFree ?? []]) if(!open||close.length!==1) throw new Error('Regions require a nonempty opener and single-character closer');
  if (!schema.productions[schema.root]) throw new Error('Unknown root production');
  if(schema.input===schema.output) throw new Error('Input and output names must differ');
  const done = new Map<string, Inferred>();
  const active = new Set<string>();
  const first = Object.values(schema.productions)[0];
  if (!first?.examples.length) throw new Error('At least one example is required');
  const outputs = Object.keys(first.examples[0]).filter(k => k !== schema.input);
  if (!outputs.includes(schema.output)) throw new Error('Missing default output');
  for (const [name, encoding] of Object.entries(schema.encodings ?? {})) {
    if (outputs.includes(name) || !outputs.includes(encoding.from) || encoding.format !== 'json') throw new Error('Invalid output encoding');
  }
  function sampleSource(names: string[], value: Value, target: string): string {
    for (const name of names) {
      const def = schema.productions[name];
      if (!def) throw new Error(`Unknown production ${name}`);
      // Concrete child examples are evidence, not a runtime fallback.
      const exact = def.examples.find(e => equal(e[target], value));
      if (exact) return String(exact[schema.input]);
      if (active.has(name)) continue;
      const p = build(name);
      const refs: any[] = [];
      if (!extract(p.outputs[target], value, refs)) continue;
      if (!p.slots.every((s,i) => s.field.kind === 'text' ? typeof refs[i] === 'string' : s.field.kind === 'ref' || Array.isArray(refs[i]))) continue;
      return p.parts.map(part => typeof part === 'string' ? part : sourceSlot(p.slots[part], refs[part], target)).join('');
    }
    throw new Error('Cannot align recursive example: supply a concrete child example with this output');
  }
  function sourceSlot(slot: Slot, value: any, target: string): string {
    if (slot.field.kind === 'text') return value;
    if (slot.field.kind === 'ref') return sampleSource(slot.field.item, value, target);
    return value.map((v: Value) => Array.isArray(slot.field.kind === 'list' ? slot.field.item : null)
      ? sampleSource((slot.field as any).item, v, target) : String(v)).join(slot.separator);
  }
  function layout(name: string, def: Production, example: Record<string, Value>, previous?: Inferred): Inferred {
    const source = example[schema.input];
    if (typeof source !== 'string') throw new Error(`${name}: example input must be text`);
    const spans: { start: number; end: number; slot: Slot; sample: Value }[] = [];
    for (const [path, field] of Object.entries(def.fields)) {
      const sample = at(example[schema.output], path);
      if (sample === undefined) throw new Error(`${name}: field ${path} missing from output`);
      let needle: string;
      let separator = '';
      if (field.kind === 'text') {
        if (typeof sample !== 'string' || !sample.length) throw new Error(`${name}: demonstrate nonempty text for ${path}`);
        if (field.token && !field.pattern) throw new Error(`${name}: token requires a pattern`);
        if (field.pattern) new RegExp(`^(?:${field.pattern})$`, 'u');
        needle = sample;
      } else if (field.kind === 'ref') {
        needle = sampleSource(field.item, sample, schema.output);
      } else {
        if (!Array.isArray(sample) || sample.length === 0) throw new Error(`${name}: demonstrate at least one list item for ${path}`);
        const needles = sample.map(v => Array.isArray(field.item) ? sampleSource(field.item, v, schema.output) : String(v));
        separator = field.separator ?? previous?.slots.find(s => s.name === path)?.separator ?? '';
        if (needles.length > 1) {
          const a = source.indexOf(needles[0]);
          const b = source.indexOf(needles[1], a + needles[0].length);
          if (a < 0 || b < 0) throw new Error(`${name}: cannot align list ${path}: ${JSON.stringify(needles)}`);
          const inferred = source.slice(a + needles[0].length, b);
          if (field.separator !== undefined && inferred.trim() !== field.separator.trim()) throw new Error(`${name}: example separator mismatch`);
          separator = inferred;
        } else if (!Array.isArray(field.item) && field.separator === undefined && !previous) {
          throw new Error(`${name}: demonstrate two items to infer separator for ${path}`);
        }
        needle = needles.join(separator);
      }
      const start = source.indexOf(needle);
      if (start < 0) throw new Error(`${name}: cannot locate field ${path} in example`);
      if (source.indexOf(needle, start + 1) !== -1) throw new Error(`${name}: ambiguous capture ${path}`);
      spans.push({ start, end: start + needle.length, slot: { name: path, field, separator }, sample });
    }
    spans.sort((a, b) => a.start - b.start);
    const parts: (string | number)[] = [];
    let end = 0;
    for (const [i, span] of spans.entries()) {
      if (span.start < end) throw new Error(`${name}: overlapping captures`);
      const literal = source.slice(end, span.start);
      if (i && literal === '' && spans[i-1].slot.field.kind === 'text' && !(spans[i-1].slot.field as any).token) throw new Error(`${name}: adjacent captures require an explicit delimiter`);
      parts.push(literal, i);
      end = span.end;
    }
    parts.push(source.slice(end));
    const outputMap: Record<string, Projection> = {};
    for (const target of outputs) {
      if (!(target in example)) throw new Error(`${name}: missing output ${target}`);
      const values = spans.map(s => {
        if (s.slot.field.kind !== 'text' && Array.isArray(s.slot.field.item) && target !== schema.output) {
          const mapped = (s.slot.field.kind === 'ref' ? [s.sample] : s.sample as Value[]).map(v => {
            for (const child of (s.slot.field as any).item as string[]) {
              const ex = schema.productions[child]?.examples.find(e => equal(e[schema.output], v));
              if (ex) return ex[target];
            }
            throw new Error(`${name}: need child example for alternate output ${target}`);
          });
          return s.slot.field.kind === 'ref' ? mapped[0] : mapped;
        }
        return s.sample;
      });
      outputMap[target] = project(example[target], values);
      const used = new Set<number>();
      visitRefs(outputMap[target], i => used.add(i));
      if (used.size !== spans.length) throw new Error(`${name}: output ${target} loses a field; inverse is not defined`);
    }
    return { name, slots: spans.map(s => s.slot), parts, outputs: outputMap, optionalEnd: def.optionalEnd };
  }
  function build(name: string): Inferred {
    if (done.has(name)) return done.get(name)!;
    if (active.has(name)) throw new Error(`Recursive seed for ${name}: begin with a finite example`);
    const def = schema.productions[name];
    if (!def?.examples.length) throw new Error(`${name}: missing examples`);
    active.add(name);
    const p = layout(name, def, def.examples[0]);
    done.set(name, p);
    for (const example of def.examples.slice(1)) {
      // Degenerate captures cannot locate a span; the generated parser still
      // verifies their complete output in compile(), using the nonempty seed.
      if(Object.entries(def.fields).some(([path,f])=>f.kind==='list'&&Array.isArray(at(example[schema.output],path))&&at(example[schema.output],path).length===0))continue;
      const next = layout(name, def, example, p);
      if (!equal(p.parts.map(x => typeof x === 'string' ? x.trim() : x), next.parts.map(x => typeof x === 'string' ? x.trim() : x)) || !equal(p.outputs, next.outputs) || !equal(p.slots, next.slots)) {
        throw new Error(`${name}: examples imply inconsistent layout or output; use separate productions`);
      }
    }
    active.delete(name);
    return p;
  }
  for (const name of Object.keys(schema.productions)) build(name);
  for (const p of done.values()) for (const slot of p.slots) {
    if (slot.field.kind !== 'text' && Array.isArray(slot.field.item)) {
      if (!slot.field.item.length) throw new Error('Empty alternatives');
      for (const child of slot.field.item) if (!done.has(child)) throw new Error(`Unknown production ${child}`);
    }
  }
  const signatures = new Set<string>();
  for(const p of done.values()) {
    const signature=JSON.stringify([p.parts,p.slots.map(s=>[s.field,s.separator]),p.optionalEnd]);
    if(signatures.has(signature)) throw new Error(`${p.name}: indistinguishable duplicate production`);
    signatures.add(signature);
  }
  // Reject left-recursive entry chains: recursion must follow consumed syntax.
  function starts(name: string, seen: Set<string>) {
    if (seen.has(name)) throw new Error(`Left recursion at ${name}`);
    const p = done.get(name)!;
    if (String(p.parts[0]).trim()) return;
    const slot = p.slots[p.parts[1] as number];
    if (slot && slot.field.kind !== 'text' && Array.isArray(slot.field.item)) {
      for (const child of slot.field.item) starts(child, new Set([...seen, name]));
    }
  }
  for (const name of done.keys()) starts(name, new Set());
  return { schema, productions: Object.keys(schema.productions).map(n => done.get(n)!), outputs };
}
function project(value: Value, samples: Value[]): Projection {
  const matches = samples.flatMap((s, i) => equal(s, value) ? [i] : []);
  if (matches.length > 1) throw new Error('Ambiguous output binding: choose distinct example values');
  if (matches.length) return { ref: matches[0] };
  if (Array.isArray(value)) return { array: value.map(v => project(v, samples)) };
  if (value !== null && typeof value === 'object') return { object: Object.entries(value).map(([k,v]) => [k, project(v, samples)]) };
  return { literal: value };
}
function visitRefs(p: Projection, fn: (i: number) => void) {
  if ('ref' in p) fn(p.ref);
  else if ('array' in p) p.array.forEach(v => visitRefs(v, fn));
  else if ('object' in p) p.object.forEach(([,v]) => visitRefs(v, fn));
}
function extract(p: Projection, value: any, refs: any[]): boolean {
  if ('ref' in p) { refs[p.ref] = value; return true; }
  if ('literal' in p) return equal(p.literal, value);
  if ('array' in p) return Array.isArray(value) && value.length === p.array.length && p.array.every((x,i) => extract(x,value[i],refs));
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length===p.object.length && p.object.every(([k,v]) => Object.hasOwn(value,k) && extract(v,value[k],refs));
}
