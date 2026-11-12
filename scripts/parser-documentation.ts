import { deepStrictEqual } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
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
${benchmarkDocumentation(name)}

## Schema and source

- [Schema examples and metadata](src/schema.ts)
- [Generated parser](src/_generated/parser.ts)
- [Package scripts](package.json)
`;
}

function benchmarkDocumentation(name: string): string {
  const reportDirectory = 'docs/benchmarks/2026-11-12-all-parsers';
  const path = resolve(repositoryRoot, reportDirectory, `${name}.json`);
  if (!existsSync(path)) return '## Benchmark results\n\n**Awaiting results.**';
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const rows = report.modes.map((mode: any) => {
    const selected = mode.rows.filter((row: any) => row.label === '100KB');
    const ours = selected.find((row: any) => row.contestant.startsWith('generated'));
    const theirs = selected.find((row: any) => !row.contestant.startsWith('generated'));
    const valid = (row: any) => row?.hz > 0 && row.coverage && !row.error;
    const rate = (row: any) => valid(row) ? `${row.hz.toFixed(1)} ±${row.rme.toFixed(1)}%` : '—';
    const ratio = valid(ours) && valid(theirs) ? ours.hz / theirs.hz : null;
    const noisy = Math.max(ours?.rme ?? 0, theirs?.rme ?? 0) > 10;
    const comparison = ratio === null ? '—' : `${ratio.toFixed(ratio < 0.01 ? 4 : 2)}×${noisy ? '†' : ''}`;
    const label = {parse:'Parse',json:'JSON',stringify:'Reverse conversion','round-trip':'Round trip'}[mode.mode as string] ?? mode.mode;
    return `| ${label} | ${rate(ours)} | ${theirs?.contestant ?? 'Unsupported in adapter'} | ${rate(theirs)} | ${comparison} |`;
  });
  return `## Benchmark results

Measured **12 November 2026**, Node 22.16.0 on Apple M2 Max. These are **100 KB** input/batch results. Rates are operations per second with relative margin of error; one operation processes the whole input/batch.

| Mode | Generated ops/s | Competitor | Competitor ops/s | Throughput ratio |
| --- | ---: | --- | ---: | ---: |
${rows.join('\n')}

Above 1× means higher generated throughput; below 1× means higher competitor throughput. † marks relative margin of error above 10% for either measurement. A dash means no supported comparison, not a win.

Output shapes, supported syntax and validation work differ. Generated reverse conversion reconstructs and validates source; some competitor adapters return stored text. These measurements describe the benchmark corpus, not every input in the language.

[Download full per-parser JSON](../../${reportDirectory}/${name}.json) · [All-parser report and methodology](../../${reportDirectory}/README.md) · [Environment and dependency versions](../../${reportDirectory}/manifest.json)

The JSON includes all five sizes (5, 20, 100, 500 and 1000 KB), plus the CSS fixture where applicable, errors/skips, timing uncertainty and CPU snapshots. Runtime-size results are still pending for this report. Performance gates were not run and their thresholds were not changed.
`;
}
