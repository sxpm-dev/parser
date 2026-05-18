import { pathToFileURL } from 'node:url';
import { generateParser } from './index.js';
import type { ParserSchema } from '@parser2/parser';

const schemaPath = process.argv[2];
if (!schemaPath) {
  throw new Error('Usage: compiler <schema.ts>');
}

const mod = await import(pathToFileURL(schemaPath).href);
const schema = (mod.default ?? mod.schema) as ParserSchema | undefined;
if (!schema) {
  throw new Error(`No default schema export found in ${schemaPath}`);
}

const outFile = await generateParser(schema, schemaPath);
console.log(`generated ${outFile}`);
