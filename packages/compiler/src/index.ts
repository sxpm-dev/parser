import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { resolveCompositionGraph } from './infer/composition.ts';
import { buildProductions } from './infer/productions.ts';
import { resolveRecursiveRoles } from './infer/roles.ts';
import { attachRenderTargets } from './infer/render-targets.ts';
import { deriveInverses } from './infer/invert.ts';
import { buildTokenizerProgram } from './infer/tokenizer.ts';
import { validate } from './infer/validate.ts';
import { detectBinaryProductions } from './infer/binary-operators.ts';
import { detectUnaryProductions } from './infer/unary-operators.ts';
import { detectTransparentPassthroughs } from './infer/transparent-passthrough.ts';
import { checkRoundTrip } from './check/round-trip.ts';
import { checkDispatch } from './check/dispatch.ts';
import type { Backend } from './emit/backend.ts';
import { TS_BACKEND } from './emit/ts.ts';
import type { InferredSchema } from './model.ts';

export type { InferredSchema } from './model.ts';
export type { Backend } from './emit/backend.ts';
export { TS_BACKEND } from './emit/ts.ts';

export type GenerateOptions = {
  // Identifier used in the generated file header and as the package name
  // in the validator's __parser2Validator metadata. Has NO effect on parser
  // behavior. Defaults to 'parser' if not supplied — keep it explicit at
  // CLI / package-build level.
  readonly packageName?: string;
  // Code-emission backend. Defaults to the TS backend (emit/v2), which
  // preserves byte-identical output for existing callers. The bytecode
  // backend (forthcoming) is selected by passing BYTECODE_BACKEND here or
  // via the CLI's --backend bytecode flag.
  readonly backend?: Backend;
  // Symbol prefix prepended to every emitted top-level function name in the
  // v2 backend. Used by the inline-validator pass when composing a
  // sub-schema's parser into a parent's generated source — each sub-schema
  // gets a unique prefix to avoid collisions. Default '' (no prefix), which
  // produces byte-identical output to the prior code path.
  readonly symbolPrefix?: string;
  // Emission mode for the v2 backend. 'standalone' (default) emits a fully
  // self-contained file with header (`@ts-nocheck`, runtime helpers, the
  // `State` type, etc.) and the public `export function parse / render /
  // stringify / validate` block. 'inline' suppresses the header, runtime
  // helpers, public exports, and shared type declarations so the result
  // can be concatenated into a parent's generated source by the inline-
  // validator composition pass without symbol or type collisions. Only the
  // internal parse / fused-render / dispatch helpers and the inline-mode
  // wrapper functions are emitted in inline mode. The result is NOT a
  // standalone module on its own.
  readonly emitMode?: 'standalone' | 'inline';
};

export function inferSchema(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): InferredSchema {
  const schemas = resolveCompositionGraph(root);
  const nodeTypes = buildProductions(schemas);
  resolveRecursiveRoles(nodeTypes, root.rootType);
  validate(nodeTypes);
  attachRenderTargets(nodeTypes);
  // Phase 5 detection runs BEFORE inverse derivation so a schema with
  // ambiguous binary shapes (two matching binary productions on the same
  // node type) fails with the actionable "more than one binary production"
  // diagnostic instead of the inverse pass's generic "indistinguishable
  // productions" error. The map is read again at emit time for the Pratt
  // path; recomputing avoids carrying it through deriveInverses.
  detectBinaryProductions(nodeTypes);
  detectUnaryProductions(nodeTypes);
  // Phase 5g — transparent-passthrough productions are detected BEFORE
  // inverse derivation so that pass can skip them; deriving an inverse
  // for `ast: $.inner` (recursive passthrough) would necessarily
  // conflict with whatever the inner production already produces.
  const transparentPassthroughs = detectTransparentPassthroughs(nodeTypes);
  deriveInverses(nodeTypes, transparentPassthroughs);
  const { literals, literalTypeByText, classes, tokenTypeIds } = buildTokenizerProgram(schemas, nodeTypes);
  // Flatten declared operator layers into a single list, deduped and sorted
  // longest-first so .operator() scanners can do longest-match without
  // re-sorting at emit time. Domainless — the layer names carry no meaning
  // here; only the literal set matters for class scanning. Pratt precedence
  // (Phase 5) consumes the layers separately.
  const operatorLiteralSet = new Set<string>();
  // Per-operator precedence index. Layer order in the schema declares
  // loose-to-tight precedence (index 0 = loosest); a higher index binds
  // tighter. The same literal appearing in multiple layers keeps the
  // tightest binding it was first declared in (schema-author error if so).
  // Phase 5 Pratt loop consumes this map directly.
  const operatorPrecedenceMap = new Map<string, number>();
  // Phase 5e — per-operator associativity. Authored as either a bare
  // operator array (legacy form, defaults to 'left') or an object form
  // `{ ops: [...], assoc: 'right' }` per layer. Right-associative ops
  // cause the Pratt loop to recurse at `prec` instead of `prec + 1`, and
  // the paren-aware inverse to swap the left/right paren rules.
  const rightAssociativeOpsSet = new Set<string>();
  for (const schema of schemas) {
    const layerNames = Object.keys(schema.operators);
    for (let i = 0; i < layerNames.length; i++) {
      const layer = schema.operators[layerNames[i]!]!;
      const { ops, assoc } = normalizeLayer(layer);
      for (const op of ops) {
        operatorLiteralSet.add(op);
        if (!operatorPrecedenceMap.has(op)) {
          operatorPrecedenceMap.set(op, i);
        }
        if (assoc === 'right') rightAssociativeOpsSet.add(op);
      }
    }
  }
  // Phase 5f — discover unary-prefix productions and merge their alt
  // literals into operatorLiteralSet so the scanner recognizes them. The
  // precedence map intentionally does NOT receive them: unary operators
  // are not binary, so the climbing loop's `__precTable[op]` lookup
  // should return undefined for a pure-unary operator and the loop
  // breaks naturally.
  const unaryProductions = detectUnaryProductions(nodeTypes);
  for (const info of unaryProductions.values()) {
    for (const op of info.operatorAlts) {
      operatorLiteralSet.add(op);
    }
  }
  const operatorLiterals: ReadonlyArray<string> = [...operatorLiteralSet].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
  );
  const operatorPrecedence: ReadonlyMap<string, number> = operatorPrecedenceMap;
  const rightAssociativeOps: ReadonlySet<string> = rightAssociativeOpsSet;
  // Phase 5 detection: find binary-operator productions of shape
  // [recursive(self), operator, recursive(self)]. Phase 5b's Pratt emit
  // reads this map; today's emit still runs the standard multi-prod
  // dispatcher on these productions (which loops back into the binary
  // alt and errors out on multi-token input). Detection landing first
  // lets schemas declare the shape and lets tooling surface a clear
  // diagnostic later.
  const binaryProductions = detectBinaryProductions(nodeTypes);
  const inferred: InferredSchema = {
    packageName: options.packageName ?? 'parser',
    symbolPrefix: options.symbolPrefix ?? '',
    emitMode: options.emitMode ?? 'standalone',
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    operatorLiterals,
    operatorPrecedence,
    rightAssociativeOps,
    binaryProductions,
    unaryProductions,
    transparentPassthroughs,
    classes,
    tokenTypeIds,
    whitespace: root.whitespace,
    unknownChars: root.unknownChars,
    bom: root.bom,
    unicode: root.unicode,
    newlines: root.newlines,
    caseSensitive: root.caseSensitive,
    defaultTarget: root.defaultTarget,
    validation,
  };
  // Theorem check: the schema must encode a round-trippable language. Done
  // after deriveInverses so the inverse IR is in place. See
  // check/round-trip.ts for the property statement.
  checkRoundTrip(inferred);
  // Theorem check: every multi-production node-type's productions must be
  // statically distinguishable by the parse-time dispatcher (either by
  // disjoint first-byte signatures or by bounded peek/longest-prefix
  // discriminators), and the root node's dispatch must be total. See
  // check/dispatch.ts for the property statement.
  checkDispatch(inferred);
  return inferred;
}

export function generateParser(
  root: SchemaDef,
  validation?: ValidationDef,
  options: GenerateOptions = {},
): string {
  const schema = inferSchema(root, validation, options);
  const backend = options.backend ?? TS_BACKEND;
  return backend.emit(schema);
}

// Phase 5e — normalize an `operators:` layer to its (ops, assoc) pair.
// The legacy bare-array form is left-associative by default; the object
// form `{ ops: [...], assoc?: 'left' | 'right' }` opts into per-layer
// associativity. Exported for reuse by other compiler passes (today:
// infer/tokenizer.ts).
export function normalizeLayer(
  layer: import('@parser2/parser').OperatorLayer,
): { readonly ops: ReadonlyArray<string>; readonly assoc: 'left' | 'right' } {
  if (Array.isArray(layer)) return { ops: layer as ReadonlyArray<string>, assoc: 'left' };
  const obj = layer as { readonly ops: ReadonlyArray<string>; readonly assoc?: 'left' | 'right' };
  return { ops: obj.ops, assoc: obj.assoc ?? 'left' };
}
