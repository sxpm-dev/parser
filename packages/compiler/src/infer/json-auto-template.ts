import { isStructureRef, type StructureValue } from '@parser2/parser';
import {
  CompilerError,
  type NodeTypeInfo,
  type StringifyTemplate,
  type StringifyTemplateSlot,
} from '../model.ts';

// Pass: synthesize a 'json-auto' template per production by walking the
// .structure({...}) literal. Authors don't write this target — like 'source',
// it is reserved and auto-derived.
//
// Output shape: AST-shaped semantic JSON. Top-level `raws` keys are
// intentionally dropped (they hold whitespace/source-position metadata that
// requires the gap/endsWith/tail/commentLeft/commentRight ref vocabulary,
// which the v1 slot kind does not express). The 'json' (Variant A) target
// has the same semantic-JSON behavior; the two stay in lockstep so they are
// directly comparable in benches.
//
// At emit time, the slot helper __renderSlot_json_auto(v) handles encoding:
// strings → JSON.stringify-quoted; arrays → bracketed comma-joined; nested
// structures → recurse via __dispatchStringify_json_auto. See
// emit/stringify.ts isJsonTarget().

const SKIP_KEYS = new Set(['raws']);

export function attachJsonAutoTemplates(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const synthesized = synthesize(info.name, production.structure);
      const current = production.stringifyTemplates;
      (production as { stringifyTemplates: ReadonlyArray<StringifyTemplate> }).stringifyTemplates = [
        ...current,
        synthesized,
      ];
    }
  }
}

type Builder = {
  parts: string[];
  slots: StringifyTemplateSlot[];
};

function synthesize(nodeName: string, structure: StructureValue): StringifyTemplate {
  const builder: Builder = { parts: [''], slots: [] };
  walk(nodeName, structure, builder);
  return { target: 'json-auto', parts: builder.parts, slots: builder.slots };
}

function appendLiteral(builder: Builder, text: string): void {
  builder.parts[builder.parts.length - 1] += text;
}

function appendSlot(builder: Builder, slot: StringifyTemplateSlot): void {
  builder.slots.push(slot);
  builder.parts.push('');
}

function walk(nodeName: string, value: StructureValue, builder: Builder): void {
  if (value === null) {
    appendLiteral(builder, 'null');
    return;
  }
  if (typeof value === 'string') {
    appendLiteral(builder, JSON.stringify(value));
    return;
  }
  if (typeof value === 'number') {
    appendLiteral(builder, Number.isFinite(value) ? String(value) : 'null');
    return;
  }
  if (typeof value === 'boolean') {
    appendLiteral(builder, value ? 'true' : 'false');
    return;
  }
  if (isStructureRef(value)) {
    if (value.__ref === 'span-value') {
      appendSlot(builder, { kind: 'capture', ref: value.name });
      return;
    }
    // gap/endsWith/tail/commentLeft/commentRight/presence/raw refs only ever
    // appear inside the `raws` subtree in the current schemas — and we drop
    // raws above. If a future schema places one outside raws, we'd need a
    // richer slot vocabulary; fail loudly so it can't silently corrupt JSON.
    throw new CompilerError(
      `json-auto: in node '${nodeName}', encountered structure ref '${value.__ref}' outside a 'raws' subtree; only $.name span-value refs are supported in v1`,
    );
  }
  if (Array.isArray(value)) {
    appendLiteral(builder, '[');
    for (let i = 0; i < value.length; i++) {
      if (i > 0) appendLiteral(builder, ',');
      walk(nodeName, value[i]!, builder);
    }
    appendLiteral(builder, ']');
    return;
  }
  // Object literal.
  const entries = Object.entries(value as Record<string, StructureValue>)
    .filter(([key]) => !SKIP_KEYS.has(key));
  appendLiteral(builder, '{');
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) appendLiteral(builder, ',');
    const [key, child] = entries[i]!;
    appendLiteral(builder, JSON.stringify(key) + ':');
    walk(nodeName, child, builder);
  }
  appendLiteral(builder, '}');
}
