import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { parse } from '../src/_generated/parser.ts';

export type JsConformanceOptions = {
  readonly root: string;
  readonly limit: number;
  readonly allowFailures: boolean;
};

export type JsConformanceResult = {
  files: number;
  passed: number;
  failed: number;
  falseAccepted: number;
  falseRejected: number;
  skipped: number;
  failures: string[];
};

const cwd = process.cwd();

export async function runJsConformance(options: JsConformanceOptions): Promise<JsConformanceResult> {
  const result: JsConformanceResult = {
    files: 0,
    passed: 0,
    failed: 0,
    falseAccepted: 0,
    falseRejected: 0,
    skipped: 0,
    failures: [],
  };

  for await (const file of walk(options.root)) {
    if (options.limit > 0 && result.files >= options.limit) break;
    const source = await readFile(file, 'utf8');
    if (basename(file).includes('_FIXTURE') || source.includes('features: [raw,') || source.includes('features: [raw]')) {
      result.skipped++;
      continue;
    }

    result.files++;
    const expectedFailure = expectsParseFailure(source);
    if (expectedFailure && isOutOfScopeEarlyError(source, file, options.root)) {
      result.skipped++;
      continue;
    }
    const parseSource = hasFlag(source, 'onlyStrict') ? `"use strict";\n${source}` : source;
    let threw = false;
    let error: unknown;
    try {
      parse(parseSource);
    } catch (caught) {
      threw = true;
      error = caught;
    }

    if (expectedFailure === threw) {
      result.passed++;
      continue;
    }

    result.failed++;
    if (expectedFailure) result.falseAccepted++;
    else result.falseRejected++;
    if (result.failures.length < 25) {
      const expectation = expectedFailure ? 'expected SyntaxError' : 'expected parse success';
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'no error';
      result.failures.push(`${relative(cwd, file)}: ${expectation}, got ${threw ? detail : 'success'}`);
    }
  }

  return result;
}

export function formatJsConformance(result: JsConformanceResult, root: string): string[] {
  return [
    'test262 JS syntax conformance',
    `root: ${relative(cwd, root)}`,
    `files=${result.files} passed=${result.passed} failed=${result.failed} falseAccepted=${result.falseAccepted} falseRejected=${result.falseRejected} skipped=${result.skipped}`,
    ...result.failures.map((failure) => `FAIL ${failure}`),
  ];
}

function expectsParseFailure(source: string): boolean {
  const meta = source.match(/\/\*---([\s\S]*?)---\*\//)?.[1] ?? '';
  return /negative:\s*(?:\n|\r\n?)(?:\s+[^\n]*\n)*\s+phase:\s*parse\b/.test(meta)
    || /negative:[\s\S]*?phase:\s*parse\b/.test(meta);
}

function hasFlag(source: string, flag: string): boolean {
  const meta = source.match(/\/\*---([\s\S]*?)---\*\//)?.[1] ?? '';
  return new RegExp(`flags:\\s*\\[[^\\]]*\\b${flag}\\b`).test(meta);
}

function isOutOfScopeEarlyError(source: string, file: string, root: string): boolean {
  const path = relative(root, file);
  if (hasFlag(source, 'onlyStrict')) return true;
  if (/"use strict"|'use strict'/.test(source)) return true;
  return /\b(?:early-errors|scope|strict|directive|duplicate|binding|arguments|eval)\b/i.test(path);
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      yield path;
    }
  }
}

export function parseJsConformanceArgs(args: string[]): JsConformanceOptions {
  let root = join(cwd, '.conformance/test262/test/language');
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

if (isMain()) {
  void main();
}

function isMain(): boolean {
  return import.meta.url === new URL(process.argv[1] ?? '', 'file:').href;
}

async function main(): Promise<void> {
  const options = parseJsConformanceArgs(process.argv.slice(2));
  const result = await runJsConformance(options);
  for (const line of formatJsConformance(result, options.root)) console.log(line);
  if (result.failed > 0 && !options.allowFailures) {
    process.exitCode = 1;
  }
}
