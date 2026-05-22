import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('log parses Apache-style common log fields', () => {
  assert.deepEqual(parse('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326'), {
    type: 'log-entry',
    ip: '192.168.0.1',
    ident: '-',
    user: 'frank',
    date: '10/Oct/2000:13:55:36 -0700',
    request: '"GET /apache_pb.gif HTTP/1.0"',
    status: '200',
    size: '2326',
  });
});

test('log rejects malformed lines', () => {
  assert.throws(() => validate('not a log line'), SyntaxError);
  assert.throws(() => validate('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700 "GET / HTTP/1.0" 200 2326'), SyntaxError);
  assert.throws(() => validate('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] GET / HTTP/1.0 200 2326'), SyntaxError);
  assert.throws(() => validate('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.0" OK 2326'), SyntaxError);
  assert.throws(() => validate('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.0" 200 many'), SyntaxError);
});
