import MarkdownIt from "markdown-it";
import { marked } from "marked";
import { render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable } from "./common.ts";

// Renders the markdown source straight to html. Compares parser2's
// generated render(input, { target: 'html' }) against markdown-it and
// marked. v1 ships render = stringify ∘ parse (no fusion yet); the fused
// codepath is staged as Task 8B in the implementation plan and will
// replace this benchmark's parser2 numbers once it lands.

const markdownIt = new MarkdownIt();

const contestants: Contestant[] = [
  {
    label: "parser2 render html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: render(input, { target: "html" }).length,
    }),
  },
  {
    label: "markdown-it render",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: markdownIt.render(input).length,
    }),
  },
  {
    label: "marked parse",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: (marked.parse(input) as string).length,
    }),
  },
];

await runBenchTable(
  "Markdown package render - parser2 render(html) vs popular renderers",
  contestants,
);
