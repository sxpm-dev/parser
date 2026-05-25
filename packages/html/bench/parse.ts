import { parseDocument as htmlparser2ParseDocument } from "htmlparser2";
import { parseHTML } from "linkedom";
import { parse as parseHtml } from "node-html-parser";
import { parse as parse5 } from "parse5";
import { render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable } from "./common.ts";

const contestants: Contestant[] = [
  {
    label: "parser2 html parse fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(
        render(input, {
          type: "ast",
          mode: "fast",
        }),
      ),
    }),
  },
  {
    label: "parser2 html parse raws",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(
        render(input, {
          type: "ast",
          mode: "raws",
        }),
      ),
    }),
  },
  {
    label: "parse5 parse",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countGenericNodes(parse5(input)),
    }),
  },
  {
    label: "htmlparser2 parse",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countGenericNodes(htmlparser2ParseDocument(input)),
    }),
  },
  {
    label: "node-html-parser",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countGenericNodes(parseHtml(input)),
    }),
    // Skip inputs >= 200KB: node-html-parser exhibits quadratic+ behavior
    // on large or markup-dense HTML (huge-page.html runs >10 minutes per
    // call). Keep it in the comparison for smaller sizes where it's fine.
    skipFor: (input: string) => input.length >= 200 * 1024,
  },
  {
    label: "linkedom parseHTML",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countDomNodes(parseHTML(input).document),
    }),
  },
];

await runBenchTable(
  "HTML package parse - parser2 vs popular parsers",
  contestants,
);

function countParser2Nodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as { readonly childNodes?: readonly unknown[]; readonly children?: readonly unknown[] };
  const kids = node.childNodes ?? node.children;
  let count = 1;
  if (kids) {
    for (const child of kids) count += countParser2Nodes(child);
  }
  return count;
}

function countGenericNodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as {
    readonly childNodes?: readonly unknown[];
    readonly children?: readonly unknown[];
    readonly nodes?: readonly unknown[];
  };
  const children = node.childNodes ?? node.children ?? node.nodes ?? [];
  let count = 1;
  for (const child of children) count += countGenericNodes(child);
  return count;
}

function countDomNodes(value: Node): number {
  let count = 1;
  value.childNodes.forEach((child) => {
    count += countDomNodes(child);
  });
  return count;
}
