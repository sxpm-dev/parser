import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { parse as parse5Parse } from "parse5";
import { render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable as runSharedBenchTable } from "../../../scripts/bench-table.ts";

// Focused bench: parser2 (fast) vs parse5, one real fixture, AST→AST.
// Each contestant returns a count of tree nodes — both parsers build a
// full tree, so the units column doubles as a same-job sanity check.

const fixture = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "../test/fixtures/huge-page.html"),
  "utf8",
);

const contestants: Contestant[] = [
  {
    label: "parser2 html fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(render(input, { type: "ast", mode: "fast" })),
    }),
  },
  {
    label: "parse5",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParse5Nodes(parse5Parse(input)),
    }),
  },
];

await runSharedBenchTable({
  title: "HTML focused — parser2 fast vs parse5 (AST)",
  contestants,
  namedInputs: [{ label: "huge-page", input: fixture }],
  sizesKb: [],
  parserColumnWidth: 26,
});

function countParser2Nodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as {
    readonly childNodes?: readonly unknown[];
    readonly attrs?: readonly unknown[];
  };
  let count = 1;
  if (node.childNodes) for (const child of node.childNodes) count += countParser2Nodes(child);
  if (node.attrs) for (const attr of node.attrs) count += countParser2Nodes(attr);
  return count;
}

function countParse5Nodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as {
    readonly childNodes?: readonly unknown[];
    readonly attrs?: readonly unknown[];
  };
  let count = 1;
  if (node.childNodes) for (const child of node.childNodes) count += countParse5Nodes(child);
  if (node.attrs) for (const attr of node.attrs) count += countParse5Nodes(attr);
  return count;
}
