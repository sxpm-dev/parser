import { Bench } from 'tinybench';
import protobufjs from 'protobufjs';
import pbSchema from 'protocol-buffers-schema';
import protoParser from 'proto-parser';
import { parse } from '../src/index.ts';

const unit = 'message User_NNN { string name = 1; int32 age = 2; }\n';

for (const kb of [5, 20, 100]) {
  const input = rewriteForCompetitors(expand(unit, kb * 1024));
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 proto parse', () => parse(input));
  bench.add('protobufjs parse', () => protobufjs.parse(input, { keepCase: true }));
  bench.add('protocol-buffers-schema', () => pbSchema.parse(input));
  bench.add('proto-parser', () => protoParser.parse(input));
  await bench.run();
  console.log(`proto ${kb}KB`);
  for (const task of bench.tasks) console.log(`${task.name}: ${Math.round(task.result?.hz ?? 0)} ops/s`);
}

function expand(seedText: string, bytes: number): string {
  let out = '';
  while (out.length < bytes) out += seedText;
  return out.trim();
}

function rewriteForCompetitors(input: string): string {
  let counter = 0;
  const body = input.replace(/_NNN/g, () => `_${(counter++).toString(36)}`);
  return `syntax = "proto3"; package example.v1; ${body}`;
}
