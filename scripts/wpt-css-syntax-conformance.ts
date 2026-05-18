import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { countTokens, parse, tokenize } from '../packages/css/src/_generated/parser.ts';

type Options = {
  readonly root: string;
  readonly limit: number;
  readonly allowFailures: boolean;
};

type Result = {
  files: number;
  snippets: number;
  passed: number;
  failed: number;
  failures: string[];
};

const cwd = process.cwd();
const options = parseArgs(process.argv.slice(2));
const result: Result = { files: 0, snippets: 0, passed: 0, failed: 0, failures: [] };

for await (const file of walk(options.root)) {
  if (options.limit > 0 && result.files >= options.limit) break;
  result.files++;
  const source = await readFile(file, 'utf8');
  for (const snippet of extractCssSnippets(file, source)) {
    result.snippets++;
    try {
      parse(snippet);
      const tokens = tokenize(snippet);
      const counted = countTokens(snippet);
      if (tokens.length !== counted) {
        throw new Error(`token count mismatch: tokenize=${tokens.length} countTokens=${counted}`);
      }
      result.passed++;
    } catch (error) {
      result.failed++;
      if (result.failures.length < 25) {
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        result.failures.push(`${relative(cwd, file)}: ${detail}`);
      }
    }
  }
}

console.log('WPT CSS syntax smoke conformance');
console.log(`root: ${relative(cwd, options.root)}`);
console.log(`files=${result.files} snippets=${result.snippets} passed=${result.passed} failed=${result.failed}`);
for (const failure of result.failures) console.log(`FAIL ${failure}`);

if (result.failed > 0 && !options.allowFailures) {
  process.exitCode = 1;
}

function extractCssSnippets(file: string, source: string): string[] {
  const extension = extname(file);
  if (extension === '.css') return [source];

  const snippets: string[] = [];
  const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const match of source.matchAll(stylePattern)) snippets.push(decodeHtml(match[1] ?? ''));

  const cssCallPattern = /\b(?:test_(?:valid|invalid)_[a-zA-Z0-9_]+|supports_css)\s*\(\s*(['"`])([\s\S]*?)\1/g;
  for (const match of source.matchAll(cssCallPattern)) {
    const raw = match[2] ?? '';
    const decoded = decodeJsString(raw, match[1] ?? "'");
    if (decoded.trim().length > 0) snippets.push(decoded);
  }

  return snippets;
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

function parseArgs(args: string[]): Options {
  let root = join(cwd, '.conformance/wpt/css/css-syntax');
  let limit = 0;
  let allowFailures = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--root') {
      root = resolve(cwd, args[++i] ?? '');
    } else if (arg === '--limit') {
      limit = Number(args[++i] ?? '0');
    } else if (arg === '--allow-failures') {
      allowFailures = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { root, limit, allowFailures };
}
