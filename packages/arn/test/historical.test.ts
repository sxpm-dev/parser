// Historical teaching inputs from parser/packages/arn/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('arn: historical teaching-input corpus',()=>{for(const source of ["arn:aws:lambda:us-east-1:123456789012:function:MyFn","arn:aws:ec2:eu-west-1:987654321098:instance/i-0abcdef"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
