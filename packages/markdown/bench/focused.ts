import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  Parser as CommonmarkParser,
  HtmlRenderer as CommonmarkHtmlRenderer,
  type Node as CommonmarkNode,
} from "commonmark";
import MarkdownIt from "markdown-it";
import { parse, render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable as runSharedBenchTable } from "../../../scripts/bench-table.ts";

// Focused markdown bench: two suites, one real fixture each.
//   1. AST          — parser2 fast vs commonmark vs markdown-it
//   2. md-to-html   — parser2 render vs commonmark+writer vs markdown-it.render
// units column doubles as a same-job sanity check:
//   - AST suite: node count (markdown-it's token-stream length is the
//     comparable structural count)
//   - md-to-html suite: HTML byte count (same job for all contestants)

const fixture = readFileSync(
  fileURLToPath(new URL("./fixtures/app-rules-fixture.md", import.meta.url)),
  "utf8",
);

const cmParser = new CommonmarkParser();
const cmReader = new CommonmarkParser();
const cmWriter = new CommonmarkHtmlRenderer();
const md = new MarkdownIt();

const astContestants: Contestant[] = [
  {
    label: "parser2 markdown fast",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countParser2Nodes(parse(input)),
    }),
  },
  {
    label: "commonmark parse",
    unit: "nodes",
    fn: (input: string): BenchResult => ({
      units: countCommonmarkNodes(cmParser.parse(input)),
    }),
  },
  {
    label: "markdown-it parse",
    unit: "nodes",
    fn: (input: string): BenchResult => {
      const tokens = md.parse(input, {});
      return { units: Array.isArray(tokens) ? tokens.length : 0 };
    },
  },
];

const htmlContestants: Contestant[] = [
  {
    label: "parser2 render html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: render(input, { target: "html" }).length,
    }),
  },
  {
    label: "commonmark html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: cmWriter.render(cmReader.parse(input)).length,
    }),
  },
  {
    label: "markdown-it render",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: md.render(input).length,
    }),
  },
];

await runSharedBenchTable({
  title: "Markdown focused — AST: parser2 fast vs commonmark vs markdown-it",
  contestants: astContestants,
  namedInputs: [{ label: "app-rules", input: fixture }],
  sizesKb: [],
  parserColumnWidth: 26,
});

console.log("");

await runSharedBenchTable({
  title: "Markdown focused — md-to-html: parser2 vs commonmark vs markdown-it",
  contestants: htmlContestants,
  namedInputs: [{ label: "app-rules", input: fixture }],
  sizesKb: [],
  parserColumnWidth: 26,
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

function countCommonmarkNodes(root: CommonmarkNode): number {
  const walker = root.walker();
  let count = 0;
  let event = walker.next();
  while (event !== null) {
    if (event.entering) count++;
    event = walker.next();
  }
  return count;
}
