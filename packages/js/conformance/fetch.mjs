#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cacheDir = join(packageRoot, '.conformance');
const suite = {
  name: 'test262',
  url: 'https://github.com/tc39/test262.git',
  branch: 'main',
  dir: join(cacheDir, 'test262'),
  paths: ['test/language'],
};

await mkdir(cacheDir, { recursive: true });

if (!existsSync(join(suite.dir, '.git'))) {
  run('git', [
    'clone',
    '--depth=1',
    '--filter=blob:none',
    '--sparse',
    '--branch',
    suite.branch,
    suite.url,
    suite.dir,
  ]);
} else {
  run('git', ['-C', suite.dir, 'fetch', '--depth=1', 'origin', suite.branch]);
  run('git', ['-C', suite.dir, 'checkout', suite.branch]);
  run('git', ['-C', suite.dir, 'reset', '--hard', `origin/${suite.branch}`]);
}

run('git', ['-C', suite.dir, 'sparse-checkout', 'set', ...suite.paths]);
console.log(`${suite.name}: ${suite.paths.join(', ')} ready in ${relative(suite.dir)}`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: packageRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function relative(path) {
  return path.startsWith(packageRoot + '/') ? path.slice(packageRoot.length + 1) : path;
}
