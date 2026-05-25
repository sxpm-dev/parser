import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the arn schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).

const FIXTURES: ReadonlyArray<string> = [
  'arn:aws:lambda:us-east-1:123456789012:function:MyFn',
  'arn:aws:sqs:ap-south-1:444455556666:order-queue',
  'arn:aws:ec2:us-west-2:123456789012:instance/i-0abcdef',
  'arn:aws-cn:s3:cn-north-1:123456789012:bucket-name',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
