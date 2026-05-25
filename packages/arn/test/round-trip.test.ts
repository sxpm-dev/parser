import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the arn schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)

const FIXTURES: ReadonlyArray<string> = [
  'arn:aws:lambda:us-east-1:123456789012:function:MyFn',
  'arn:aws:sqs:ap-south-1:444455556666:order-queue',
  'arn:aws:ec2:us-west-2:123456789012:instance/i-0abcdef',
  'arn:aws-cn:s3:cn-north-1:123456789012:bucket-name',
];

for (const fixture of FIXTURES) {
  test(`round-trip 'ast' target (value-stable): ${fixture}`, () => {
    const target = 'ast' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.deepEqual(v2, v1);
  });
}

for (const fixture of FIXTURES) {
  test(`round-trip 'source' target (value-stable): ${fixture}`, () => {
    const target = 'source' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.equal(v2, v1, `value-stability failed for ${fixture}`);
  });
}
