import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

const INPUTS: ReadonlyArray<string> = [
  'null', 'true', 'false', '0', '42', '-3.14', '1e10',
  '""', '"hello"', '"a\\nb"', '"\\u00e9"',
  '[]', '[1,2,3]', '[[1,2],[3]]',
  '{}', '{"a":1}', '{"a":{"b":[1,2,3]}}',
  '{"name":"my-project","version":"1.0.0","tags":["a","b"]}',
];

for (const input of INPUTS) {
  test(`round-trip: ${input.slice(0, 50)}`, () => {
    const v1 = render(input, { target: 'ast' });
    const s = stringify(v1, { target: 'ast' });
    const v2 = render(s as string, { target: 'ast' });
    assert.deepEqual(v2, v1);
  });
}

// No source-target round-trip test here. json's source target uses
// `.coerce()` on JsonString and JsonNumber, so the rendered source-value
// is the native JS string/number rather than the source slice
// ('"hello"' becomes 'hello', the surrounding quotes drop). Round-tripping
// that back via re-render fails for unquoted-string inputs. The AST-target
// round-trip above is the contract that matters for JSON consumers.
