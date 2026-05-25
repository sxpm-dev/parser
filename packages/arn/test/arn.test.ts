import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

function parseAst(input: string): unknown {
  return render(input, { type: 'ast' });
}

test('arn parses AWS ARN fields through generated schema parser', () => {
  assert.deepEqual(parseAst('arn:aws:lambda:us-east-1:123456789012:function:MyFn'), {
    type: 'arn',
    partition: 'aws',
    service: 'lambda',
    region: 'us-east-1',
    account: '123456789012',
    resource: { type: 'resource', kind: 'function', name: 'MyFn', separator: ':' },
  });
});

test('arn generalizes service and resource names', () => {
  assert.deepEqual(parseAst('arn:aws:sqs:ap-south-1:444455556666:order-queue'), {
    type: 'arn',
    partition: 'aws',
    service: 'sqs',
    region: 'ap-south-1',
    account: '444455556666',
    resource: { type: 'resource', name: 'order-queue' },
  });
});

test('arn parses slash-separated resources', () => {
  assert.deepEqual(parseAst('arn:aws:ec2:us-west-2:123456789012:instance/i-0abcdef'), {
    type: 'arn',
    partition: 'aws',
    service: 'ec2',
    region: 'us-west-2',
    account: '123456789012',
    resource: { type: 'resource', kind: 'instance', name: 'i-0abcdef', separator: '/' },
  });
});

test('arn accepts hyphenated partition and region fields', () => {
  assert.deepEqual(parseAst('arn:aws-cn:s3:cn-north-1:123456789012:bucket-name'), {
    type: 'arn',
    partition: 'aws-cn',
    service: 's3',
    region: 'cn-north-1',
    account: '123456789012',
    resource: { type: 'resource', name: 'bucket-name' },
  });
});

test('arn rejects non-ARN input', () => {
  assert.throws(() => validate('not-an-arn'), SyntaxError);
});

test('arn rejects malformed field boundaries', () => {
  assert.throws(() => validate('arn:aws:lambda:us-east-1:123456789012'), SyntaxError);
  assert.throws(() => validate('arn:aws:lambda:us-east-1:not-an-account:function:MyFn'), SyntaxError);
  assert.throws(() => validate('arn:aws:lambda:us-east-1:123456789012:function:'), SyntaxError);
});
