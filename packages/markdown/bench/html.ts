import { Parser as CommonmarkParser, HtmlRenderer as CommonmarkHtmlRenderer } from "commonmark";
import MarkdownIt from "markdown-it";
import { marked } from "marked";
import { micromark } from "micromark";
import { render } from "../src/index.ts";
import { type BenchResult, type Contestant, runBenchTable } from "./common.ts";

// Renders markdown straight to HTML. Mirrors the bench:ast harness (same
// release-notes.md fixture, same SIZES_KB cadence via runBenchTable), but
// the contestants are HTML-emitting renderers — not AST parsers. Parser2's
// generated render(input, { target: 'html' }) is compared against every
// markdown library in deps that can produce HTML.

const markdownIt = new MarkdownIt();
const commonmarkReader = new CommonmarkParser();
const commonmarkWriter = new CommonmarkHtmlRenderer();

const contestants: Contestant[] = [
  {
    label: "parser2 render html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: (render(input, { target: "html" }) as string).length,
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
  {
    label: "commonmark html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: commonmarkWriter.render(commonmarkReader.parse(input)).length,
    }),
  },
  {
    label: "micromark html",
    unit: "bytes",
    fn: (input: string): BenchResult => ({
      units: micromark(input).length,
    }),
  },
];

await runBenchTable(
  "Markdown package html - parser2 render(html) vs popular renderers",
  contestants,
);
