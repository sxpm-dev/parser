import { mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

type PackageName = 'css' | 'js' | 'json';

const packageNames = new Set<PackageName>(['css', 'js', 'json']);
const explicitPackage = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const packageName = resolvePackageName(explicitPackage);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(root, 'packages', packageName);
const outfile = join(packageRoot, 'dist', 'browser', 'index.min.js');

await mkdir(dirname(outfile), { recursive: true });
await esbuild.build({
  entryPoints: [join(packageRoot, 'src', 'index.ts')],
  outfile,
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  treeShaking: true,
  legalComments: 'none',
  sourcemap: false,
  logLevel: 'silent',
});

console.log(`browser built ${relative(outfile)}`);

function resolvePackageName(arg: string | undefined): PackageName {
  const candidate = arg ?? basename(process.cwd());
  if (packageNames.has(candidate as PackageName)) return candidate as PackageName;
  throw new Error(`usage: tsx scripts/browser-build.ts <${[...packageNames].join('|')}>`);
}

function relative(path: string): string {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}
