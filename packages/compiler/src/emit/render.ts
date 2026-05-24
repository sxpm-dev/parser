import type { InferredSchema } from '../model.ts';

// Emit the public render(input, options) export. v1 ships the simplest
// correct implementation:
//
//   render(input, opts) === stringify(parse(input, opts), opts)
//
// This is functionally complete but allocates the intermediate Structure on
// every call. The fused, no-Structure-allocation codepath is the perf goal
// for the markdown bench:render gate — that is Task 8B in
// docs/superpowers/plans/2026-05-24-stringify-templates-plan.md and lands
// after markdown integration so the parity test pins agreement.
//
// Per the spec acceptance criterion #7, this emit must not branch on target
// names. The `target` value flows through unchanged into the stringify call;
// stringify's per-target dispatch handles routing.
export function emitRender(_schema: InferredSchema): string {
  return `export function render(input: string, options?: { target?: string; mode?: 'fast' | 'raws' }): string {
  const target = options?.target ?? "source";
  const parsed = options?.mode ? parse(input, { mode: options.mode }) : parse(input);
  return stringify(parsed, { target });
}`;
}
