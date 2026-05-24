import {
  Parser as CommonmarkParser,
  type Node as CommonmarkNode,
} from "commonmark";
import MarkdownIt from "markdown-it";
import { marked } from "marked";
import { micromark } from "micromark";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable } from "./common.ts";

const markdownIt = new MarkdownIt();
const commonmarkReader = new CommonmarkParser();
const remark = unified().use(remarkParse);

const contestants: Contestant[] = [
  {
    label: "parser2 markdown fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(parse(input, { mode: "fast" })),
    }),
  },
  {
    label: "parser2 markdown raws",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(parse(input, { mode: "raws" })),
    }),
  },
  {
    label: "markdown-it parse",
    unit: "tokens",
    fn: (input: string): BenchResult => ({
      units: markdownIt.render(input, {}).length,
    }),
  },
  {
    label: "marked parse",
    unit: "tokens",
    fn: (input: string): BenchResult => ({ units: marked.lexer(input).length }),
  },
  {
    label: "commonmark parse",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countCommonmarkNodes(commonmarkReader.parse(input)),
    }),
  },
  {
    label: "remark-parse",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countUnistNodes(remark.parse(input)),
    }),
  },
  {
    label: "micromark html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({ units: micromark(input).length }),
  },
];

await runBenchTable(
  "Markdown package AST parse - parser2 vs popular parsers",
  contestants,
);

function countParser2Nodes(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const node = value as { readonly children?: readonly unknown[] };
  let count = 1;
  if (node.children) {
    for (const child of node.children) count += countParser2Nodes(child);
  }
  return count;
}

function countCommonmarkNodes(root: CommonmarkNode): number {
  let count = 0;
  const walker = root.walker();
  let event;
  while ((event = walker.next())) {
    if (event.entering) count++;
  }
  return count;
}

function countUnistNodes(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const children = (node as { readonly children?: readonly unknown[] })
    .children;
  let count = 1;
  if (children) {
    for (const child of children) count += countUnistNodes(child);
  }
  return count;
}
