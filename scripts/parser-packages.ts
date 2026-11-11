import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const repositoryRoot=fileURLToPath(new URL('../',import.meta.url));
export const parserPackages=readdirSync(`${repositoryRoot}packages`).filter(name=>name!=='compiler'&&existsSync(`${repositoryRoot}packages/${name}/src/schema.ts`)).sort();
