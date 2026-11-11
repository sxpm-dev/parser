// One Node test process avoids a separate TypeScript loader startup per package.
import { readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { repositoryRoot } from './parser-packages.ts';
for(const name of readdirSync(`${repositoryRoot}packages`).sort()){
 const dir=`${repositoryRoot}packages/${name}/test`;
 if(!existsSync(dir))continue;
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.test.ts')).sort())await import(pathToFileURL(`${dir}/${file}`).href);
}
