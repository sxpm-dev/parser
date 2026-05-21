import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const packageRoot = new URL('..', import.meta.url).pathname;
const root = resolve(packageRoot, process.env.PARSER2_CSS_CONFORMANCE_ROOT ?? '.conformance/wpt/css');
const helper = resolve(packageRoot, 'conformance/wpt.ts');
const limit = Number(process.env.PARSER2_CSS_CONFORMANCE_LIMIT ?? '0');
const verbose = process.env.PARSER2_CONFORMANCE_VERBOSE !== '0';

test('WPT CSS conformance extraction', async (t) => {
  if (!existsSync(helper)) {
    t.skip(`missing ${helper}; run npm run fetch -w @parser2/css`);
    return;
  }
  if (!existsSync(root)) {
    t.skip(`missing ${root}; run npm run fetch -w @parser2/css`);
    return;
  }

  const { formatCssConformance, runCssConformance } = await import('../conformance/wpt.ts');
  const result = await runCssConformance({ root, limit, allowFailures: false, verbose });
  for (const line of formatCssConformance(result, root, { verbose })) {
    t.diagnostic(line);
  }
  assert.equal(result.failed, 0);
  assert.equal(result.falseRejects, 0);
  assert.equal(result.falseAccepts, 0);
  assert.equal(result.passed, result.snippets);
});
