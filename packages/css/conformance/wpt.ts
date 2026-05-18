import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { countTokens, parse, tokenize } from '../src/_generated/parser.ts';

export type CssConformanceOptions = {
  readonly root: string;
  readonly limit: number;
  readonly allowFailures: boolean;
  readonly verbose: boolean;
};

export type CssConformanceSnippet = {
  readonly kind: string;
  readonly tokenText: string;
  readonly parseText: string;
  readonly expectFailure?: boolean;
};

export type CssConformanceResult = {
  files: number;
  snippets: number;
  cssFiles: number;
  styleTags: number;
  styleAttrs: number;
  linkedCss: number;
  jsStrings: number;
  skippedFiles: number;
  rejected: number;
  passed: number;
  failed: number;
  failures: string[];
};

const cwd = process.cwd();

export async function runCssConformance(options: CssConformanceOptions): Promise<CssConformanceResult> {
  const result: CssConformanceResult = {
    files: 0,
    snippets: 0,
    cssFiles: 0,
    styleTags: 0,
    styleAttrs: 0,
    linkedCss: 0,
    jsStrings: 0,
    skippedFiles: 0,
    rejected: 0,
    passed: 0,
    failed: 0,
    failures: [],
  };

  for await (const file of walk(options.root)) {
    if (options.limit > 0 && result.files >= options.limit) break;
    result.files++;
    const source = await readFile(file, 'utf8');
    const snippets = await extractCssSnippets(file, source, options.root, result);
    if (snippets.length === 0) result.skippedFiles++;

    for (const snippet of snippets) {
      result.snippets++;
      const caseNumber = result.snippets;
      try {
        parse(snippet.parseText);
        if (snippet.expectFailure) {
          throw new Error('expected parse failure, got success');
        }
        const tokens = tokenize(snippet.tokenText);
        const counted = countTokens(snippet.tokenText);
        if (tokens.length !== counted) {
          throw new Error(`token count mismatch: tokenize=${tokens.length} countTokens=${counted}`);
        }
        result.passed++;
      } catch (error) {
        if (error instanceof SyntaxError) {
          result.rejected++;
          result.passed++;
          continue;
        }
        result.failed++;
        if (result.failures.length < 25) {
          const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          result.failures.push(
            `case=${caseNumber} file=${relative(cwd, file)} kind=${snippet.kind} error=${detail} snippet=${preview(snippet.tokenText)}`,
          );
        }
      }
    }
  }

  return result;
}

export function formatCssConformance(result: CssConformanceResult, root: string, options?: { readonly verbose?: boolean }): string[] {
  const lines = [
    'WPT CSS extraction conformance',
    `root: ${relative(cwd, root)}`,
    `tests=${result.snippets} accepted=${result.passed - result.rejected} rejected=${result.rejected} failed=${result.failed} skippedFiles=${result.skippedFiles}`,
    ...result.failures.map((failure) => `FAIL ${failure}`),
  ];
  if (options?.verbose) {
    lines.splice(
      3,
      0,
      `files=${result.files}`,
      `sources=cssFiles:${result.cssFiles} styleTags:${result.styleTags} styleAttrs:${result.styleAttrs} linkedCss:${result.linkedCss} jsStrings:${result.jsStrings}`,
    );
  }
  return lines;
}

async function extractCssSnippets(
  file: string,
  source: string,
  root: string,
  result: CssConformanceResult,
): Promise<CssConformanceSnippet[]> {
  const extension = extname(file);
  if (extension === '.css') {
    result.cssFiles++;
    return [{ kind: 'css-file', tokenText: source, parseText: source }];
  }

  const snippets: CssConformanceSnippet[] = [];
  const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const match of source.matchAll(stylePattern)) {
    const text = decodeHtml(match[1] ?? '');
    if (text.trim().length === 0) continue;
    result.styleTags++;
    snippets.push({ kind: 'style-tag', tokenText: text, parseText: text });
  }

  const styleAttrPattern = /\sstyle\s*=\s*(['"])([\s\S]*?)\1/gi;
  for (const match of source.matchAll(styleAttrPattern)) {
    const text = decodeHtml(match[2] ?? '');
    if (text.trim().length === 0) continue;
    result.styleAttrs++;
    snippets.push({ kind: 'style-attr', tokenText: text, parseText: `*{${text}}` });
  }

  const linkPattern = /<link\b[^>]*rel\s*=\s*(['"]?)stylesheet\1[^>]*>/gi;
  for (const link of source.matchAll(linkPattern)) {
    const tag = link[0] ?? '';
    const href = tag.match(/\shref\s*=\s*(['"])([\s\S]*?)\1/i)?.[2] ?? tag.match(/\shref\s*=\s*([^\s>]+)/i)?.[1];
    if (!href || href.startsWith('http:') || href.startsWith('https:') || href.startsWith('/')) continue;
    const linked = resolve(dirname(file), decodeHtml(href));
    if (!linked.startsWith(root)) continue;
    try {
      const text = await readFile(linked, 'utf8');
      result.linkedCss++;
      snippets.push({ kind: 'linked-css', tokenText: text, parseText: text });
    } catch {
      // Some WPT links depend on the WPT server pipeline or headers.
    }
  }

  const cssCallPattern = /\b(?:test_(?:valid|invalid)_[a-zA-Z0-9_]+|supports_css|parseRule|parseDeclaration|insertRule|replaceSync|replace)\s*\(\s*(['"`])([\s\S]*?)\1/g;
  for (const match of source.matchAll(cssCallPattern)) {
    const raw = match[2] ?? '';
    const text = decodeJsString(raw, match[1] ?? "'");
    if (text.trim().length === 0) continue;
    result.jsStrings++;
    snippets.push(normalizeJsSnippet(match[0] ?? '', text));
  }

  return snippets;
}

function normalizeJsSnippet(callPrefix: string, text: string): CssConformanceSnippet {
  if (/parseDeclaration\b/.test(callPrefix)) {
    return { kind: 'js-declaration', tokenText: text, parseText: `*{${text}}` };
  }
  if (/supports_css\b/.test(callPrefix) && !/[{};]/.test(text)) {
    return { kind: 'js-supports', tokenText: text, parseText: `*{${text}}` };
  }
  return { kind: 'js-stylesheet', tokenText: text, parseText: text, expectFailure: hasExtraTopLevelBlockEnd(text) };
}

function hasExtraTopLevelBlockEnd(input: string): boolean {
  let depth = 0;
  let quote = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (quote !== 0) {
      if (code === 92) i++;
      else if (code === quote) quote = 0;
      continue;
    }
    if (code === 34 || code === 39) {
      quote = code;
      continue;
    }
    if (code === 123) depth++;
    else if (code === 125) {
      if (depth === 0) return true;
      depth--;
    }
  }
  return false;
}

function decodeHtml(input: string): string {
  return input
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function decodeJsString(input: string, quote: string): string {
  if (quote === '`') {
    return input.replace(/\\([\\`])/g, '$1').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
  }
  try {
    return JSON.parse(`${quote === "'" ? '"' : quote}${input.replace(/"/g, '\\"').replace(/\\'/g, "'")}${quote === "'" ? '"' : quote}`) as string;
  } catch {
    return input.replace(/\\([\\'"`])/g, '$1').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && /\.(?:css|html|xhtml|js)$/i.test(entry.name)) {
      yield path;
    }
  }
}

export function parseCssConformanceArgs(args: string[]): CssConformanceOptions {
  let root = join(cwd, '.conformance/wpt/css');
  let limit = 0;
  let allowFailures = false;
  let verbose = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--root') {
      root = resolve(cwd, args[++i] ?? '');
    } else if (arg === '--limit') {
      limit = Number(args[++i] ?? '0');
    } else if (arg === '--allow-failures') {
      allowFailures = true;
    } else if (arg === '--verbose') {
      verbose = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { root, limit, allowFailures, verbose };
}

if (isMain()) {
  const options = parseCssConformanceArgs(process.argv.slice(2));
  const result = await runCssConformance(options);
  for (const line of formatCssConformance(result, options.root, { verbose: options.verbose })) console.log(line);
  if (result.failed > 0 && !options.allowFailures) {
    process.exitCode = 1;
  }
}

function preview(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim();
  return JSON.stringify(normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized);
}

function isMain(): boolean {
  return import.meta.url === new URL(process.argv[1] ?? '', 'file:').href;
}
