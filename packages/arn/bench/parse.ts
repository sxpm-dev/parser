import { parse as parseArn } from '@aws-sdk/util-arn-parser';
import { parse } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = 'arn:aws:lambda:us-east-1:123456789012:function:MyFn\n' +
  'arn:aws:ec2:eu-west-1:987654321098:instance/i-0abcdef\n' +
  'arn:aws:sqs:ap-south-1:444455556666:order-queue\n';
const regex = /^arn:[^:\s]+:[^:\s]+:[^:\s]+:\d+:[^\s]+$/;

const contestants: Contestant[] = [
  { label: 'parser2 arn parse', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { parse(row); }) },
  { label: '@aws-sdk/util-arn-parser', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { parseArn(row); }) },
  { label: 'regex test', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { if (!regex.test(row)) throw new Error('bad'); }) },
];

await runBenchTable({ title: 'ARN package parse - parser2 vs popular parsers', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
