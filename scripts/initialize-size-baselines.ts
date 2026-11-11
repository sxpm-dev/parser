/** Explicit first baselines for newly migrated packages; never replaces an existing baseline. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { parserPackages,repositoryRoot } from './parser-packages.ts';
if(!process.argv.includes('--write-missing'))throw Error('Pass --write-missing to initialize new package size baselines');
for(const name of parserPackages){
 const root=`${repositoryRoot}packages/${name}`;const baseline=`${root}/bench/size-baseline.json`;
 if(existsSync(baseline))continue;
 const asset='dist/browser/index.min.js';mkdirSync(`${root}/dist/browser`,{recursive:true});
 await build({entryPoints:[`${root}/src/index.ts`],outfile:`${root}/${asset}`,bundle:true,minify:true,platform:'browser',format:'esm',target:'es2020',treeShaking:true,legalComments:'none',sourcemap:false,logLevel:'silent'});
 const bytes=readFileSync(`${root}/${asset}`);let hash=0x811c9dc5;for(const byte of bytes){hash^=byte;hash=Math.imul(hash,0x01000193);}
 const entry={bytes:bytes.length,gzipBytes:gzipSync(bytes).length,hash:(hash>>>0).toString(16).padStart(8,'0')};
 writeFileSync(baseline,JSON.stringify({[asset]:entry},null,2)+'\n',{flag:'wx'});
 console.log(`${name}: ${entry.bytes} bytes / ${entry.gzipBytes} gzip (new baseline)`);
}
