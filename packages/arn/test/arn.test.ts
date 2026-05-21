import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('arn parses AWS ARN fields through generated schema parser', () => {
  assert.deepEqual(parse('arn:aws:lambda:us-east-1:123456789012:function:MyFn'), {
    type: 'arn',
    partition: 'aws',
    service: 'lambda',
    region: 'us-east-1',
    account: '123456789012',
    resource: { type: 'resource', kind: 'function', name: 'MyFn', separator: ':' },
  });
});

test('arn generalizes service and resource names', () => {
  assert.deepEqual(parse('arn:aws:sqs:ap-south-1:444455556666:order-queue'), {
    type: 'arn',
    partition: 'aws',
    service: 'sqs',
    region: 'ap-south-1',
    account: '444455556666',
    resource: { type: 'resource', name: 'order-queue' },
  });
});

test('arn rejects non-ARN input', () => {
  assert.throws(() => validate('not-an-arn'), SyntaxError);
});
