import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
const { parse } = await import('../packages/js/src/_generated/parser.ts') as {
  readonly parse: (input: string) => unknown;
};

type Options = {
  readonly root: string;
  readonly limit: number;
  readonly allowFailures: boolean;
};

type Result = {
  files: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: string[];
};

const cwd = process.cwd();
const options = parseArgs(process.argv.slice(2));
const result: Result = { files: 0, passed: 0, failed: 0, skipped: 0, failures: [] };

for await (const file of walk(options.root)) {
  if (options.limit > 0 && result.files >= options.limit) break;
  const source = await readFile(file, 'utf8');
  if (source.includes('features: [raw,') || source.includes('features: [raw]')) {
    result.skipped++;
    continue;
  }

  result.files++;
  const expectedFailure = expectsParseFailure(source);
  let threw = false;
  let error: unknown;
  try {
    parse(source);
  } catch (caught) {
    threw = true;
    error = caught;
  }

  if (expectedFailure === threw) {
    result.passed++;
    continue;
  }

  result.failed++;
  if (result.failures.length < 25) {
    const expectation = expectedFailure ? 'expected SyntaxError' : 'expected parse success';
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'no error';
    result.failures.push(`${relative(cwd, file)}: ${expectation}, got ${threw ? detail : 'success'}`);
  }
}

console.log(`test262 JS syntax conformance`);
console.log(`root: ${relative(cwd, options.root)}`);
console.log(`files=${result.files} passed=${result.passed} failed=${result.failed} skipped=${result.skipped}`);
for (const failure of result.failures) console.log(`FAIL ${failure}`);

if (result.failed > 0 && !options.allowFailures) {
  process.exitCode = 1;
}

function expectsParseFailure(source: string): boolean {
  const meta = source.match(/\/\*---([\s\S]*?)---\*\//)?.[1] ?? '';
  return /negative:\s*(?:\n|\r\n?)(?:\s+[^\n]*\n)*\s+phase:\s*parse\b/.test(meta)
    || /negative:[\s\S]*?phase:\s*parse\b/.test(meta);
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

function parseArgs(args: string[]): Options {
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
