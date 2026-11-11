import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { strict as assert } from 'node:assert';
import { compile, type Schema } from './index.ts';

const paths=process.argv.slice(2);
if(!paths.length) throw new Error('Usage: tsx cli.ts <schema.ts> ...');
for(const path of paths) {
  const { default: schema }: { default: Schema } = await import(pathToFileURL(resolve(path)).href);
  const source=compile(schema, {typescript:true});
  // Check every production independently as well as the public root. Changing
  // the entry point is a compile-time test operation, never a runtime fallback.
  for(const [name,p] of Object.entries(schema.productions)) {
    const isolated=await import(`data:text/javascript;base64,${Buffer.from(compile({...schema,root:name})).toString('base64')}`);
    for(const ex of p.examples) for(const output of Object.keys(ex).filter(k=>k!==schema.input)) {
      assert.deepEqual(isolated.parse(ex[schema.input],{output}),ex[output],`${name}: example output ${output}`);
      assert.deepEqual(isolated.parse(isolated.stringify(ex[output],{input:output}),{output}),ex[output],`${name}: inverse ${output}`);
    }
  }
  const destination=resolve(dirname(path),'_generated/parser.ts');
  await mkdir(dirname(destination),{recursive:true});
  let old=''; try { old=await readFile(destination,'utf8'); } catch {}
  if(old!==source) await writeFile(destination,source);
  console.log(`generated ${destination} (${Buffer.byteLength(source)} bytes)`);
}
