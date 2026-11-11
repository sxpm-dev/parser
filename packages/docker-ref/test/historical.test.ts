// Historical teaching inputs from parser/packages/docker-ref/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('docker-ref: historical teaching-input corpus',()=>{for(const source of ["nginx:latest","redis:7.2-alpine","library/postgres:16","ghcr.io/owner/image:v1.0.0"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
