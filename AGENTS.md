# Parser3 Codex Agent Rules

## Non-Negotiable Architecture Invariant

This repository is schema-first and compiler-generated.

The parser is ONLY the schema. The parser re-exports the codegen file. The
compiler is domainless.

Parser packages are ONLY:

- `src/schema.ts`
- `src/_generated/parser.ts`
- `src/index.ts` that re-exports `./_generated/parser.ts`
- tests, benches, fixtures, package metadata

`src/index.ts` in every parser package MUST stay:

```ts
export * from './_generated/parser.ts';
```

Do not add handwritten parser, renderer, validator, scanner, tokenizer,
semantic fallback, external parser fallback, package-local codegen, or
domain-specific performance path to any parser package.

The compiler is domainless. The compiler MUST NOT branch on package names,
schema names, languages, targets, or domains. No CSS-specific compiler logic.
No HTML-specific compiler logic. No Markdown-specific compiler logic. No
URL/ARN/cron/protobuf/log-specific compiler logic.

All parser behavior must come from schema examples and generic schema
configuration. All performance improvements must be implemented as generic
compiler codegen triggered by schema shape, literals, modifiers, refinements,
or other domain-neutral structural patterns.

## Before Editing

Before changing parser runtime behavior, read:

- `packages/compiler/README.md`
- `docs/example-first-structure-dsl.md`
- any relevant plan under `docs/superpowers/plans/`

If a desired performance optimization seems to require handwritten package
logic, stop. The correct task is to improve generic compiler codegen or extend
the schema DSL with a reusable domainless primitive.

## Allowed Performance Work

Allowed:

- Generic compiler optimizations inferred from schema structure.
- Generated parser changes produced by running codegen.
- Schema changes that express behavior declaratively.
- Tests and benches that prove the generated behavior.

Forbidden:

- Handwritten `render()` in `packages/markdown/src/index.ts`.
- Handwritten `validate()` in `packages/css-color/src/index.ts`.
- Handwritten scanners in package entrypoints.
- Domain-specific compiler branches such as `if (packageName === "markdown")`.
- External parser fallbacks in package runtime code.

## Repair Rule

If you accidentally add handwritten domain behavior to a parser package, revert
that package code immediately before doing anything else. Then reimplement the
idea through schema or domainless compiler codegen.
