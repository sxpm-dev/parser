import { pathToFileURL } from 'node:url';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { generateParser } from './index.js';
import type { ParserSchema } from '@parser2/parser';
import type { ParserEmitter } from './index.js';

const schemaPath = process.argv[2];
if (!schemaPath) {
  throw new Error('Usage: compiler <schema.ts>');
}

const mod = await import(pathToFileURL(schemaPath).href);
const schema = (mod.default ?? mod.schema) as ParserSchema | undefined;
if (!schema) {
  throw new Error(`No default schema export found in ${schemaPath}`);
}

const emitParser = ((mod.emitParser ?? mod.codegen ?? mod.generate) as ParserEmitter | undefined) ?? await loadAdjacentEmitter(schemaPath);
const outFile = await generateParser(schema, schemaPath, emitParser);
console.log(`generated ${outFile}`);

async function loadAdjacentEmitter(schemaPath: string): Promise<ParserEmitter> {
  const codegenPath = join(dirname(schemaPath), 'codegen.ts');
  try {
    await access(codegenPath);
  } catch {
    throw new Error(`No parser emitter found. Export emitParser from ${schemaPath} or add ${codegenPath}`);
  }
  const codegen = await import(pathToFileURL(codegenPath).href) as {
    readonly default?: unknown;
    readonly emitParser?: unknown;
    readonly codegen?: unknown;
    readonly generate?: unknown;
  };
  const emitParser = codegen.emitParser ?? codegen.default ?? codegen.codegen ?? codegen.generate;
  if (typeof emitParser !== 'function') {
    throw new Error(`No emitter function exported by ${codegenPath}`);
  }
  return emitParser as ParserEmitter;
}
