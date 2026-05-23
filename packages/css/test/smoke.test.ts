import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from '../src/index.ts';

// Phase-A+B smoke test, updated for named punctuators + .until() captures.
//
// These smoke tests focus on structural shape only — strip `raws` before
// comparing. The fixture-driven cases.test.ts checks raw spacing end-to-end.

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'raws') continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

function parseStripped(input: string): unknown {
  return strip(parse(input));
}

test('parses single rule with simple selector', () => {
  assert.deepEqual(parseStripped('foo { color: red }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: 'foo',
        nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
      },
    ],
  });
});

test('defaults to fast mode without formatting metadata', () => {
  const ast = parse('foo { color: red }') as Record<string, unknown>;
  assert.equal('source' in ast, false);
  assert.equal('raws' in ast, false);
});

test('can parse with raw spacing metadata when requested', () => {
  const ast = parse('foo { color: red }', { mode: 'raws' }) as Record<string, unknown>;
  assert.equal('source' in ast, false);
  assert.equal(typeof ast.raws, 'object');
});

test('parses single rule with class selector', () => {
  assert.deepEqual(parseStripped('.foo { color: red }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.foo',
        nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
      },
    ],
  });
});

test('parses compound selector with pseudo-class', () => {
  assert.deepEqual(parseStripped('.foo:hover { color: red }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.foo:hover',
        nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
      },
    ],
  });
});

test('parses trailing semicolon tolerantly', () => {
  assert.deepEqual(parseStripped('foo { color: red; }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: 'foo',
        nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
      },
    ],
  });
});

test('parses multiple declarations separated by semicolons', () => {
  assert.deepEqual(parseStripped('foo { color: red; background: blue }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: 'foo',
        nodes: [
          { type: 'decl', prop: 'color', value: 'red' },
          { type: 'decl', prop: 'background', value: 'blue' },
        ],
      },
    ],
  });
});

test('parses multiple rules', () => {
  assert.deepEqual(parseStripped('foo { color: red } bar { background: blue }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: 'foo',
        nodes: [{ type: 'decl', prop: 'color', value: 'red' }],
      },
      {
        type: 'rule',
        selector: 'bar',
        nodes: [{ type: 'decl', prop: 'background', value: 'blue' }],
      },
    ],
  });
});

test('parses selector list and hex value', () => {
  assert.deepEqual(parseStripped('.foo, .bar { color: #fff }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.foo, .bar',
        nodes: [{ type: 'decl', prop: 'color', value: '#fff' }],
      },
    ],
  });
});

test('parses combinator and function value', () => {
  assert.deepEqual(parseStripped('.foo > .bar { color: rgb(1,2,3) }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.foo > .bar',
        nodes: [{ type: 'decl', prop: 'color', value: 'rgb(1,2,3)' }],
      },
    ],
  });
});

test('parses dimensions and percentages in values', () => {
  assert.deepEqual(parseStripped('.a { width: 100px; height: 50% }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.a',
        nodes: [
          { type: 'decl', prop: 'width', value: '100px' },
          { type: 'decl', prop: 'height', value: '50%' },
        ],
      },
    ],
  });
});

test('parses balanced parens in values', () => {
  assert.deepEqual(parseStripped('.a { background: calc(100% - 1px) }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.a',
        nodes: [{ type: 'decl', prop: 'background', value: 'calc(100% - 1px)' }],
      },
    ],
  });
});

test('parses strings inside values', () => {
  assert.deepEqual(parseStripped('.a { background: url("a.png") }'), {
    type: 'root',
    nodes: [
      {
        type: 'rule',
        selector: '.a',
        nodes: [{ type: 'decl', prop: 'background', value: 'url("a.png")' }],
      },
    ],
  });
});

test('rejects unrecognized characters', () => {
  // Backtick is not whitespace, not a declared punctuator/delim, not a class start.
  assert.throws(() => parseStripped('foo { color: `red` }'), SyntaxError);
});

test('reports source frame for unexpected block close after selector fragment', () => {
  assert.throws(
    () => parseStripped('.bar }'),
    (error) => error instanceof SyntaxError
      && error.message.includes("Unexpected '}' at position 5")
      && error.message.includes('1 | .bar }')
      && error.message.includes('  |      ^'),
  );
});
