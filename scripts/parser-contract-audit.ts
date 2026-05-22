import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const packagesDir = join(root, 'packages');
const failures: string[] = [];

auditCompilerDomainlessness();

for (const dirName of readdirSync(packagesDir).sort()) {
  const packageRoot = join(packagesDir, dirName);
  const packageJsonPath = join(packageRoot, 'package.json');
  if (!existsSync(packageJsonPath)) continue;

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    readonly name?: string;
    readonly scripts?: Record<string, string>;
  };
  if (
    packageJson.name === undefined ||
    !packageJson.name.startsWith('@parser2/') ||
    packageJson.name === '@parser2/parser' ||
    packageJson.name === '@parser2/compiler'
  ) {
    continue;
  }

  const schemaPath = join(packageRoot, 'src', 'schema.ts');
  if (!existsSync(schemaPath)) continue;

  const label = packageJson.name;
  const indexPath = join(packageRoot, 'src', 'index.ts');
  const generatedPath = join(packageRoot, 'src', '_generated', 'parser.ts');
  const benchPath = join(packageRoot, 'bench');
  const testPath = join(packageRoot, 'test');
  const scripts = packageJson.scripts ?? {};

  requireFile(label, indexPath, 'src/index.ts');
  requireFile(label, generatedPath, 'src/_generated/parser.ts');
  requireFile(label, join(benchPath, 'perf-baseline.json'), 'bench/perf-baseline.json');
  requireFile(label, join(benchPath, 'size-baseline.json'), 'bench/size-baseline.json');
  requireDirWith(label, benchPath, (name) => name.endsWith('.ts'), 'bench/*.ts');
  requireDirWith(label, testPath, (name) => name.endsWith('.test.ts'), 'test/*.test.ts');
  requireScript(label, scripts, 'bench');
  requireScript(label, scripts, 'baseline');
  requireScript(label, scripts, 'gate');
  requireScript(label, scripts, 'perf:baseline');
  requireScript(label, scripts, 'perf:gate');
  requireScript(label, scripts, 'size:baseline');
  requireScript(label, scripts, 'size:gate');

  const hotBenchScripts = Object.keys(scripts).filter((script) => script.startsWith('bench:'));
  if (hotBenchScripts.length === 0) failures.push(`${label}: missing named hot-path bench script`);

  if (existsSync(indexPath)) {
    const indexSource = readFileSync(indexPath, 'utf8').trim();
    const lines = indexSource.split(/\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith('export ') || !line.includes('./_generated/parser.ts')) {
        failures.push(`${label}: src/index.ts must only re-export generated parser symbols`);
        break;
      }
    }
    if (/\b(function|class|const|let|var)\b/.test(indexSource)) {
      failures.push(`${label}: src/index.ts must not contain custom code or custom functions`);
    }
  }
}

if (failures.length > 0) {
  console.error('Parser contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('parser contract audit ok');

function auditCompilerDomainlessness(): void {
  const compilerSrc = join(root, 'packages', 'compiler', 'src');
  for (const file of walkTs(compilerSrc)) {
    const source = readFileSync(file, 'utf8');
    const relative = file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file;
    const forbiddenChecks = [
      /\b(?:schema\.)?rootSchemaName\s*(?:={2,3}|!==?)\s*['"`][^'"`]+['"`]/,
      /\bschema\.name\s*(?:={2,3}|!==?)\s*['"`][^'"`]+['"`]/,
      /\broot\.name\s*(?:={2,3}|!==?)\s*['"`][^'"`]+['"`]/,
    ];
    for (const pattern of forbiddenChecks) {
      if (pattern.test(source)) {
        failures.push(`${relative}: compiler must not branch on schema/package/domain names; infer behavior from schema shape/examples`);
        break;
      }
    }
  }
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkTs(path));
    else if (entry.endsWith('.ts')) out.push(path);
  }
  return out;
}

function requireFile(label: string, path: string, display: string): void {
  if (!existsSync(path)) failures.push(`${label}: missing ${display}`);
}

function requireScript(label: string, scripts: Record<string, string>, name: string): void {
  if (scripts[name] === undefined) failures.push(`${label}: missing script ${name}`);
}

function requireDirWith(label: string, path: string, predicate: (name: string) => boolean, display: string): void {
  if (!existsSync(path) || !readdirSync(path).some(predicate)) failures.push(`${label}: missing ${display}`);
}
