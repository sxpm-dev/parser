import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  formatCssConformance,
  runCssConformance,
} from '../conformance/wpt.ts';

const packageRoot = new URL('..', import.meta.url).pathname;
const enabled = process.env.PARSER2_CONFORMANCE === '1';
const root = resolve(packageRoot, process.env.PARSER2_CSS_CONFORMANCE_ROOT ?? '.conformance/wpt/css');
const limit = Number(process.env.PARSER2_CSS_CONFORMANCE_LIMIT ?? '0');
const verbose = process.env.PARSER2_CONFORMANCE_VERBOSE === '1';

test('WPT CSS conformance extraction', { skip: enabled ? false : 'set PARSER2_CONFORMANCE=1 to run conformance suite' }, async (t) => {
  assert.equal(existsSync(root), true, `missing ${root}; run npm run fetch -w @parser2/css`);
  const result = await runCssConformance({ root, limit, allowFailures: false, verbose });
  for (const line of formatCssConformance(result, root, { verbose })) {
    t.diagnostic(line);
  }
  assert.equal(result.failed, 0);
  assert.equal(result.passed, result.snippets);
});
