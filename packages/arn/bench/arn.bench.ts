import { Bench } from 'tinybench';
import { parse as parseArn } from '@aws-sdk/util-arn-parser';
import { parse } from '../src/index.ts';

const seed =
  'arn:aws:lambda:us-east-1:123456789012:function:MyFn\n' +
  'arn:aws:ec2:eu-west-1:987654321098:instance/i-0abcdef\n' +
  'arn:aws:sqs:ap-south-1:444455556666:order-queue\n';
const regex = /^arn:[^:\s]+:[^:\s]+:[^:\s]+:\d+:[^\s]+$/;

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 arn parse', () => count(rows, (row) => { parse(row); }));
  bench.add('@aws-sdk/util-arn-parser', () => count(rows, (row) => { parseArn(row); }));
  bench.add('regex test', () => count(rows, (row) => { if (!regex.test(row)) throw new Error('bad'); }));
  await bench.run();
  console.log(`arn ${kb}KB (${rows.length} rows)`);
  for (const task of bench.tasks) console.log(`${task.name}: ${Math.round(task.result?.hz ?? 0)} ops/s`);
}

function count(rows: string[], fn: (value: string) => void): number {
  let ok = 0;
  for (const row of rows) {
    fn(row);
    ok++;
  }
  return ok;
}

function expand(seedText: string, bytes: number): string {
  let out = '';
  while (out.length < bytes) out += seedText;
  return out;
}
