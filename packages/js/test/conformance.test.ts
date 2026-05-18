import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  formatJsConformance,
  runJsConformance,
} from '../conformance/test262.ts';

const packageRoot = new URL('..', import.meta.url).pathname;
const enabled = process.env.PARSER2_CONFORMANCE === '1';
const strict = process.env.PARSER2_JS_CONFORMANCE_STRICT === '1';
const root = resolve(packageRoot, process.env.PARSER2_JS_CONFORMANCE_ROOT ?? '.conformance/test262/test/language');
const limit = Number(process.env.PARSER2_JS_CONFORMANCE_LIMIT ?? '0');

test('test262 JS syntax conformance', { skip: enabled ? false : 'set PARSER2_CONFORMANCE=1 to run conformance suite' }, async (t) => {
  assert.equal(existsSync(root), true, `missing ${root}; run npm run fetch -w @parser2/js`);
  const result = await runJsConformance({ root, limit, allowFailures: !strict });
  for (const line of formatJsConformance(result, root)) t.diagnostic(line);
  if (strict) {
    assert.equal(result.failed, 0);
  } else {
    t.diagnostic('JS conformance is diagnostic by default; set PARSER2_JS_CONFORMANCE_STRICT=1 to make failures fail the test.');
  }
});
