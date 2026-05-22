/**
 * Compare @parser2/html output with parse5 on a fixture file.
 * Run: tsx scripts/html-compare.ts [path]
 *   default path: packages/html/test/fixtures/huge-page.html
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parse5Parse } from 'parse5';
import { parse as ourParse } from '../packages/html/src/_generated/parser.ts';

type Loc = { line: number; column: number; offset: number };

const DEFAULT = 'packages/html/test/fixtures/huge-page.html';
const fixturePath = resolve(process.argv[2] ?? DEFAULT);
const source = readFileSync(fixturePath, 'utf8');
const bytes = Buffer.byteLength(source, 'utf8');

console.log(`fixture: ${fixturePath}`);
console.log(`size:    ${bytes.toLocaleString()} bytes / ${source.length.toLocaleString()} chars`);
console.log('');

// ---- Ours --------------------------------------------------------
console.log('--- our parser (@parser2/html) ---');
let ours: unknown = null;
let oursError: unknown = null;
const oursStart = performance.now();
try {
  ours = ourParse(source, { mode: 'raws' });
} catch (err) {
  oursError = err;
}
const oursMs = performance.now() - oursStart;

if (oursError) {
  const msg = oursError instanceof Error ? oursError.message : String(oursError);
  console.log(`status:  FAIL after ${oursMs.toFixed(1)}ms`);
  console.log(`error:   ${msg}`);

  const loc = locateFailure(source, msg);
  if (loc) {
    console.log(`location: line ${loc.line}, column ${loc.column}, offset ${loc.offset}`);
    const window = sourceWindow(source, loc.offset, 80);
    console.log('context:');
    console.log(indent(window, '  '));
  }
} else {
  console.log(`status:  OK after ${oursMs.toFixed(1)}ms`);
  console.log(`shape:   ${summariseOurs(ours)}`);
}
console.log('');

// ---- parse5 ------------------------------------------------------
console.log('--- parse5 ---');
const p5Start = performance.now();
const p5Doc = parse5Parse(source);
const p5Ms = performance.now() - p5Start;
console.log(`status:  OK after ${p5Ms.toFixed(1)}ms`);

const stats = walkParse5(p5Doc);
console.log(`stats:   elements=${stats.elements.toLocaleString()}  text=${stats.text.toLocaleString()}  comments=${stats.comments.toLocaleString()}  doctype=${stats.doctypes}  depth_max=${stats.maxDepth}`);

const tagCounts = [...stats.tagCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);
console.log('top tags:');
for (const [tag, n] of tagCounts) {
  console.log(`  ${tag.padEnd(12)} ${n.toString().padStart(6)}`);
}
console.log('');

// ---- Coverage gap summary ---------------------------------------
console.log('--- coverage gap (parse5 features vs our schema) ---');
const gaps = analyseGaps(source, stats);
for (const gap of gaps) console.log(`  - ${gap}`);

// ---- Helpers -----------------------------------------------------
function summariseOurs(node: unknown): string {
  if (!isObj(node)) return typeof node;
  const t = String(node['type'] ?? 'unknown');
  const children = Array.isArray(node['children']) ? node['children'].length : 0;
  return `type=${t} top-level-children=${children}`;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function locateFailure(src: string, msg: string): Loc | null {
  const m = msg.match(/at\s+(\d+)/i) ?? msg.match(/offset\s+(\d+)/i) ?? msg.match(/position\s+(\d+)/i);
  if (!m) return null;
  const offset = Number(m[1]);
  if (!Number.isFinite(offset) || offset < 0 || offset > src.length) return null;
  return offsetToLoc(src, offset);
}

function offsetToLoc(src: string, offset: number): Loc {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1, offset };
}

function sourceWindow(src: string, offset: number, radius: number): string {
  const start = Math.max(0, offset - radius);
  const end = Math.min(src.length, offset + radius);
  const before = src.slice(start, offset);
  const after = src.slice(offset, end);
  return `${escapeWs(before)}<<HERE>>${escapeWs(after)}`;
}

function escapeWs(s: string): string {
  return s.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

function indent(s: string, prefix: string): string {
  return s.split('\n').map((line) => prefix + line).join('\n');
}

type Stats = {
  elements: number;
  text: number;
  comments: number;
  doctypes: number;
  maxDepth: number;
  tagCounts: Map<string, number>;
  hasCdata: boolean;
  hasTemplate: boolean;
  hasSvgOrMath: boolean;
};

type P5Node = {
  nodeName: string;
  tagName?: string;
  childNodes?: P5Node[];
  attrs?: { name: string }[];
};

function walkParse5(root: P5Node): Stats {
  const stats: Stats = {
    elements: 0,
    text: 0,
    comments: 0,
    doctypes: 0,
    maxDepth: 0,
    tagCounts: new Map(),
    hasCdata: false,
    hasTemplate: false,
    hasSvgOrMath: false,
  };
  const stack: { node: P5Node; depth: number }[] = [{ node: root, depth: 0 }];
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (depth > stats.maxDepth) stats.maxDepth = depth;
    if (node.nodeName === '#text') stats.text++;
    else if (node.nodeName === '#comment') stats.comments++;
    else if (node.nodeName === '#documentType') stats.doctypes++;
    else if (node.nodeName === '#document' || node.nodeName === '#document-fragment') {
      // root
    } else {
      stats.elements++;
      const tag = node.tagName ?? node.nodeName;
      stats.tagCounts.set(tag, (stats.tagCounts.get(tag) ?? 0) + 1);
      if (tag === 'template') stats.hasTemplate = true;
      if (tag === 'svg' || tag === 'math') stats.hasSvgOrMath = true;
    }
    const kids = node.childNodes;
    if (kids?.length) for (const k of kids) stack.push({ node: k, depth: depth + 1 });
  }
  return stats;
}

function analyseGaps(src: string, stats: Stats): string[] {
  const gaps: string[] = [];
  if (stats.maxDepth > 2) gaps.push(`nested elements (depth ${stats.maxDepth}) — schema only models a single text child`);
  if (stats.comments > 0) gaps.push(`HTML comments <!-- ... --> (${stats.comments.toLocaleString()} found)`);
  if (/<script[\s>]/i.test(src)) gaps.push('<script> with raw-text content (contains arbitrary JS, possibly with `<`)');
  if (/<style[\s>]/i.test(src)) gaps.push('<style> with raw-text CSS content');
  if (/&[a-zA-Z]+;|&#[0-9]+;|&#x[0-9a-fA-F]+;/.test(src)) gaps.push('character references / HTML entities (&amp; etc.)');
  if (/=\s*[A-Za-z0-9_\-]+(\s|>|\/>)/.test(src)) gaps.push('unquoted attribute values (e.g. `lang=en`)');
  if (/=\s*'[^']*'/.test(src)) gaps.push("single-quoted attribute values");
  if (stats.hasTemplate) gaps.push('<template> element');
  if (stats.hasSvgOrMath) gaps.push('foreign content (svg / math)');
  if (/<!\[CDATA\[/i.test(src)) gaps.push('CDATA sections');
  if (/<(br|hr|img|meta|input|link|source|wbr|area|base|col|embed|param|track)(\s[^>]*)?>(?!\s*<\/)/i.test(src)) {
    gaps.push('void elements without trailing slash (`<br>`, `<meta charset=…>`, `<img>` etc.)');
  }
  if (/<\?[^>]*\?>/.test(src)) gaps.push('processing instructions');
  return gaps;
}
