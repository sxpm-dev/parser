import { isStructureRef } from './ref.ts';
import type { Template, TemplateSlot } from './types.ts';

// `tpl` is a tagged-template tag. JavaScript evaluates the template literal at
// schema-load time and calls tpl(strings, ...values). Static segments arrive
// as `strings`; the ${...} values arrive as `values`. Each value must be a
// $.name sentinel — the closed v1 slot vocabulary. Non-sentinel values throw
// synchronously so authoring drift is caught at module load, not at codegen.

export function tpl(
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<unknown>
): Template {
  const parts: string[] = [...strings];
  const slots: TemplateSlot[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isStructureRef(v) || v.__ref !== 'span-value') {
      const got = isStructureRef(v) ? v.__ref : typeof v;
      throw new Error(
        `tpl: slot ${i} value must be a $.name sentinel (got ${got})`,
      );
    }
    slots.push({ kind: 'capture', ref: v.name });
  }
  return { __tpl: true, parts, slots };
}

export function isTemplate(value: unknown): value is Template {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { __tpl?: unknown }).__tpl === true
    && Array.isArray((value as { parts?: unknown }).parts)
    && Array.isArray((value as { slots?: unknown }).slots)
  );
}
