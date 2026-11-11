import { deepStrictEqual } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Schema } from '../packages/compiler/src/schema.ts';
import { repositoryRoot } from './parser-packages.ts';

// Documentation uses the schema's root example and verifies it against the
// generated public API. No language-specific examples or output shapes live here.
export async function parserDocumentation(name: string): Promise<string> {
  const directory = resolve(repositoryRoot, 'packages', name);
  const { default: schema }: { default: Schema } = await import(pathToFileURL(resolve(directory, 'src/schema.ts')).href);
  const runtime = await import(pathToFileURL(resolve(directory, 'src/index.ts')).href);
  const metadata = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const example = schema.productions[schema.root].examples[0];
  const source = example[schema.input];
  const value = runtime.parse(source);
  deepStrictEqual(value, example[schema.output], `${name}: documented parse output`);
  const canonical = runtime.stringify(value);
  deepStrictEqual(runtime.parse(canonical), value, `${name}: documented reverse conversion`);
  runtime.validate(source);
  const code = (language: string, text: string) => {
    const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(m => m[0].length + 1)));
    return `${fence}${language}\n${text}\n${fence}`;
  };
  const jsonEncoding = Object.entries(schema.encodings ?? {}).find(([, encoding]) => encoding.from === schema.output && encoding.format === 'json');
  let jsonUsage = '';
  if (jsonEncoding) {
    const output = jsonEncoding[0];
    const encoded = runtime.parse(source, { output });
    deepStrictEqual(JSON.parse(encoded), value, `${name}: documented JSON output`);
    deepStrictEqual(runtime.stringify(encoded, { input: output }), canonical, `${name}: documented JSON inverse`);
    jsonUsage = `\n### JSON conversion\n\n${code('ts', `const json = parse(source, { output: ${JSON.stringify(output)} });\nconst restored = stringify(json, { input: ${JSON.stringify(output)} });`)}\n\nJSON encodes the example-defined output shown above. It does not change the parser's output contract.\n`;
  }
  return `
## Usage

Use this package from the repository workspace after installing dependencies and running \`npm run generate\`. Run TypeScript examples with \`npx tsx\`. These imports refer to workspace packages; an npm registry release is not required.

${code('ts', `import { parse, stringify, validate } from ${JSON.stringify(metadata.name)};\n\nconst source = ${JSON.stringify(source)};\nconst value = parse(source);\nconst canonical = stringify(value);\nvalidate(source); // throws SyntaxError if parsing fails\n\nconsole.log(value);\nconsole.log(canonical);`)}

### Parsed output

${code('json', JSON.stringify(value, null, 2))}

This example comes from the schema's root production. The documentation build checks the output and reverse conversion against the generated public API.

### Reverse conversion

\`stringify(value)\` produces the following canonical source string (shown as a JSON string so escapes and line breaks are explicit):

${code('json', JSON.stringify(canonical))}

Parsing this canonical source reproduces the value above. You can modify the value and stringify it again, provided it satisfies the schema. Reverse conversion is checked; it does not promise preservation of original whitespace or skipped comments.
${jsonUsage}
## Benchmark results

**Awaiting results.** This section is reserved for a future measured comparison. No timings or speedup claims are published here yet.

| Measurement | This parser | Competitor | Comparison |
| --- | --- | --- | --- |
| Parse | Pending | Pending | Pending |
| JSON conversion | Pending | Pending | Pending |
| Reverse conversion | Pending | Pending | Pending |
| Parse + reverse round trip | Pending | Pending | Pending |
| Minified / gzip runtime size | Pending | Pending | Pending |

The report will identify the competitor and version, fixture sizes, machine and runtime, measurement uncertainty, and differences in supported syntax or output shape. Unsupported comparisons will be marked explicitly.

See [benchmark methodology and gates](../../docs/benchmarks/README.md) for the existing harness and [coverage and competitor wiring](../../docs/parser-migration.md) for package details.

## Schema and source

- [Schema examples and metadata](src/schema.ts)
- [Generated parser](src/_generated/parser.ts)
- [Package scripts](package.json)
`;
}
