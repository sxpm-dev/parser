import ts from 'typescript';
import { parserPackages } from './parser-packages.ts';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
for(const name of parserPackages) {
  const root=`packages/${name}`;
  assert.deepEqual(readdirSync(`${root}/src`).sort(),['_generated','index.ts','schema.ts']);
  assert.equal(readFileSync(`${root}/src/index.ts`,'utf8'),"export * from './_generated/parser.ts';\n");
  assert.deepEqual(readdirSync(`${root}/src/_generated`),['parser.ts']);
  const source=ts.createSourceFile('parser.ts',readFileSync(`${root}/src/_generated/parser.ts`,'utf8'),ts.ScriptTarget.Latest,true);
  function check(node:ts.Node){
    assert.ok(!ts.isImportDeclaration(node)&&!(ts.isExportDeclaration(node)&&node.moduleSpecifier),`${name}: runtime dependency`);
    assert.ok(!(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))),`${name}: dynamic runtime dependency`);
    ts.forEachChild(node,check);
  }
  check(source);
  const {scripts}=JSON.parse(readFileSync(`${root}/package.json`,'utf8'));
  for(const key of ['bench','bench:parse','bench:json','bench:round-trip','baseline','gate']) assert.ok(scripts[key]);
}
assert.equal(parserPackages.length,52);
assert.deepEqual(readdirSync('packages').filter(n=>n!=='compiler'&&!n.startsWith('.')).sort(),parserPackages);
console.log(`Parser contract: ${parserPackages.length} schema-owned standalone parsers.`);
