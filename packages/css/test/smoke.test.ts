import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from '../src/index.ts';

// Phase-A+B smoke test, updated for named punctuators + .until() captures.
//
// These smoke tests focus on structural shape only. Raws were removed from
// the AST during the .render(target, body) migration (Phase 6) — the
// .render('ast', ...) body for each production no longer surfaces the
// $.gap / $.tail / $.endsWith / $.commentLeft / $.commentRight synthetic
// refs because the compiler's inverse-derivation pass rejects synthetic
// refs at any position in an object body. Source-level whitespace fidelity
// now flows through the 'source' target instead.

// Phase 5 removed the public parse() export from generated parsers. The
// AST that used to be returned by parse(input, { mode: 'raws' }) is now
// reachable via render(input, { type: 'ast' }); the raws-mode toggle is
// a no-op (every AST is the same regardless of mode).
function parse(input: string, _options?: { mode?: 'fast' | 'raws' }): unknown {
  return render(input, { type: 'ast' });
}

test('parses single rule with simple selector', () => {
  assert.deepEqual(parse('foo { color: red }'), {
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

test('parses single rule with class selector', () => {
  assert.deepEqual(parse('.foo { color: red }'), {
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
  assert.deepEqual(parse('.foo:hover { color: red }'), {
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
  assert.deepEqual(parse('foo { color: red; }'), {
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
  assert.deepEqual(parse('foo { color: red; background: blue }'), {
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
  assert.deepEqual(parse('foo { color: red } bar { background: blue }'), {
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
  assert.deepEqual(parse('.foo, .bar { color: #fff }'), {
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
  assert.deepEqual(parse('.foo > .bar { color: rgb(1,2,3) }'), {
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
  assert.deepEqual(parse('.a { width: 100px; height: 50% }'), {
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
  assert.deepEqual(parse('.a { background: calc(100% - 1px) }'), {
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
  assert.deepEqual(parse('.a { background: url("a.png") }'), {
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
  assert.throws(() => parse('foo { color: `red` }'), SyntaxError);
});

test('reports source frame for unexpected block close after selector fragment', () => {
  assert.throws(
    () => parse('.bar }'),
    (error) => error instanceof SyntaxError
      && error.message.includes("Unexpected '}' at position 5")
      && error.message.includes('1 | .bar }')
      && error.message.includes('  |      ^'),
  );
});
