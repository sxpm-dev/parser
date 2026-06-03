import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import { render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable as runSharedBenchTable } from "../../../scripts/bench-table.ts";

// Focused bench: parser2 (fast) vs postcss, one real fixture, AST→AST.
// Node count is the same-job sanity check — postcss reports every
// Rule/AtRule/Decl/Comment via .walk(); parser2 emits an analogous tree.

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, "fixture", "huge-page.css"), "utf8");

const contestants: Contestant[] = [
  {
    label: "parser2 css fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(render(input, { target: "ast", mode: "fast" })),
    }),
  },
  {
    label: "postcss",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countPostcssNodes(postcss.parse(input)),
    }),
  },
];

await runSharedBenchTable({
  title: "CSS focused — parser2 fast vs postcss (AST)",
  contestants,
  namedInputs: [{ label: "huge-page", input: fixture }],
  sizesKb: [],
  parserColumnWidth: 22,
});

function countParser2Nodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as {
    readonly children?: readonly unknown[];
    readonly nodes?: readonly unknown[];
  };
  const kids = node.children ?? node.nodes;
  let count = 1;
  if (kids) for (const child of kids) count += countParser2Nodes(child);
  return count;
}

function countPostcssNodes(root: unknown): number {
  // postcss .walk() visits every nested node exactly once. +1 for root.
  const r = root as { walk: (cb: () => void) => void };
  let count = 1;
  r.walk(() => { count++; });
  return count;
}
