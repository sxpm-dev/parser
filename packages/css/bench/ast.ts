import * as cssTree from "css-tree";
import postcss from "postcss";
import CSSOM from "cssom";
import rework from "rework";
import { render, validate } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable } from "./common.ts";

const contestants: Contestant[] = [
  {
    label: "parser2 css fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countAst(render(input, { type: "ast", mode: "fast" })),
    }),
  },
  {
    label: "parser2 css raws",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countAst(render(input, { type: "ast", mode: "raws" })),
    }),
  },
  {
    label: "parser2 css validate",
    unit: "bytes",
    fn: (input: string): BenchResult => {
      validate(input);
      return { units: input.length };
    },
  },
  {
    label: "postcss parse",
    unit: "nodes",
    fn: (input: string): BenchResult => {
      const root = postcss.parse(input, { from: undefined });
      let nodes = 0;
      root.walk(() => {
        nodes++;
      });
      return { units: nodes };
    },
  },
  {
    label: "css-tree parse",
    unit: "nodes",
    fn: (input: string): BenchResult => {
      const ast = cssTree.parse(input, { positions: false });
      let nodes = 0;
      cssTree.walk(ast, () => {
        nodes++;
      });
      return { units: nodes };
    },
  },
  {
    label: "cssom parse",
    unit: "rules",
    fn: (input: string): BenchResult => ({
      units: CSSOM.parse(input).cssRules.length,
    }),
  },
  {
    label: "rework parse",
    unit: "rules",
    fn: (input: string): BenchResult => {
      const obj = rework(input).obj as { stylesheet?: { rules: unknown[] } };
      return { units: obj.stylesheet?.rules.length ?? 0 };
    },
  },
];

await runBenchTable(
  "CSS package AST parse - parser2 vs popular parsers",
  contestants,
);

function countAst(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as { readonly nodes?: readonly unknown[] };
  let count = 1;
  if (node.nodes) for (const child of node.nodes) count += countAst(child);
  return count;
}
