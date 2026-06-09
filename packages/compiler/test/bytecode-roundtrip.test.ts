import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inferSchema } from '../src/index.ts';
import { BYTECODE_BACKEND } from '../src/emit/bytecode/index.ts';

test('bytecode backend: cron emits a runnable parser', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const source = BYTECODE_BACKEND.emit(schema);
  // Write to a temp dir INSIDE this package so the generated file's import
  // `@parser2/compiler/bytecode/runtime` resolves via the workspace's
  // node_modules. (System tmpdir is outside the repo and node module
  // resolution would never find @parser2/* from there.)
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-roundtrip-'));
  const file = join(dir, 'cron.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    const captures = mod.__parse('* * * * * date');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
    const rendered = mod.render('* * * * * date', { target: 'source' });
    assert.equal(rendered, '* * * * * date');
    // Inverse stringify of an AST value rebuilds the source. (Cron's
    // inverse only encodes ast-shaped productions in the bytecode runtime
    // today, so the dispatch key is 'ast' even though the output is source
    // text.)
    const ast = mod.render('* * * * * date', { target: 'ast' });
    const back = mod.stringify(ast, { target: 'ast' });
    assert.equal(back, '* * * * * date');
    // Missing target raises a helpful error (cron doesn't set defaultTarget).
    assert.throws(
      () => mod.render('* * * * * date'),
      /render: missing target/,
    );
    // Syntax errors surface from __parse.
    assert.throws(() => mod.__parse('not a cron line'), /Unexpected/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bytecode backend: .operator() longest-match scan + capture end-to-end', async () => {
  // Synthetic minimal schema covering the SCAN_CLASS OPERATOR path:
  // `<lhs> <op> <rhs>` where `<op>` is one of `!=` / `<=` / `>=` / `=`
  // / `<` / `>`. The longest-match dispatch must pick `!=` over `!`
  // etc., and the captured `op` value must equal the matched literal.
  //
  // pg-select itself uses additional primitives (sep-bearing repeats,
  // stopBefore, prefix-share dispatcher) that the bytecode runtime
  // doesn't yet support, so the end-to-end test uses this trimmed
  // shape instead — but the .operator() path it exercises is the same
  // one pg-select would hit once those primitives land.
  const {
    $: dsl,
    defineSchema,
    parse,
    relation,
    span,
    tpl,
  } = await import('@parser2/parser');
  const schemaInput = defineSchema({
    rootType: 'Compare',
    operators: {
      cmp: ['!=', '<=', '>=', '=', '<', '>'],
    },
    examples: [
      relation('Compare', {
        input: 'a = b',
        encodings: {
          parse: parse([
            span('lhs', 'a').ident(),
            span('op', '=').operator(),
            span('rhs', 'b').ident(),
          ]),
          ast: { type: 'cmp', lhs: dsl.lhs, op: dsl.op, rhs: dsl.rhs },
          source: tpl`${dsl.lhs} ${dsl.op} ${dsl.rhs}`,
        },
      }),
    ],
  });
  const schema = inferSchema(schemaInput);
  const source = BYTECODE_BACKEND.emit(schema);
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-operator-'));
  const file = join(dir, 'compare.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    const cases: Array<[string, string]> = [
      ['a = b', '='],
      ['a != b', '!='],
      ['a <= b', '<='],
      ['a >= b', '>='],
      ['a < b', '<'],
      ['a > b', '>'],
    ];
    for (const [input, op] of cases) {
      const ast = mod.render(input, { target: 'ast' }) as { op: string };
      assert.equal(ast.op, op, `expected op ${op} for ${input}`);
      const back = mod.stringify(ast, { target: 'ast' });
      assert.equal(back, input, `round-trip failed for ${input}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
