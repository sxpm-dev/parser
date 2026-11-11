import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { repositoryRoot, parserPackages } from './parser-packages.ts';
const markdownModule='markdown-it';
const {default:MarkdownIt}=await import(markdownModule);
const destination=resolve(repositoryRoot,'dist/pages');
const repo='https://github.com/sxpm-dev/parser';
const files=['README.md','docs/example-first-structure-dsl.md','docs/parser-migration.md','packages/compiler/README.md',...parserPackages.map(n=>`packages/${n}/README.md`).filter(p=>existsSync(resolve(repositoryRoot,p)))];
function collect(dir:string){for(const entry of readdirSync(resolve(repositoryRoot,dir),{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())collect(path);else if(entry.name.endsWith('.md'))files.push(path);}}
collect('docs/benchmarks');
const outputPath=(path:string)=>path.endsWith('README.md')?path.slice(0,-9)+'index.html':path.replace(/\.md$/,'.html');
const outputs=new Map(files.map(p=>[p,outputPath(p)]));
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const generatedLinks:{from:string,to:string}[]=[];
rmSync(destination,{recursive:true,force:true});mkdirSync(destination,{recursive:true});
for(const file of files){
 const output=outputs.get(file)!;const base=posix.dirname(output);
 const local=(target:string)=>posix.relative(base,outputs.get(target)!)||'index.html';
 const md=new MarkdownIt({html:false,linkify:true,typographer:false});
 const ids=new Map<string,number>();
 md.renderer.rules.heading_open=(tokens:any[],i:number,options:any,_env:any,self:any)=>{
  const text=tokens[i+1]?.content??'';const raw=text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');const count=ids.get(raw)??0;ids.set(raw,count+1);tokens[i].attrSet('id',raw+(count?`-${count}`:''));return self.renderToken(tokens,i,options);
 };
 function rewrite(href:string){
  if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href))return href;
  const match=/^([^?#]*)(.*)$/.exec(href)!;let path:string;
  try{path=posix.normalize(posix.join(posix.dirname(file),decodeURI(match[1])));}catch{return href;}
  const doc=outputs.has(path)?path:outputs.has(`${path}/README.md`)?`${path}/README.md`:undefined;
  if(doc){const to=local(doc);generatedLinks.push({from:output,to});return to+match[2];}
  return `${repo}/${existsSync(resolve(repositoryRoot,path))&&readdirSafe(path)?'tree':'blob'}/main/${path.split('/').map(encodeURIComponent).join('/')}${match[2]}`;
 }
 const renderLink=md.renderer.rules.link_open??((tokens:any[],i:number,options:any,_env:any,self:any)=>self.renderToken(tokens,i,options));
 md.renderer.rules.link_open=(tokens:any[],i:number,options:any,env:any,self:any)=>{tokens[i].attrSet('href',rewrite(tokens[i].attrGet('href')??''));return renderLink(tokens,i,options,env,self);};
 const source=readFileSync(resolve(repositoryRoot,file),'utf8');const title=/^#\s+(.+)$/m.exec(source)?.[1]??'Parser documentation';
 let body=md.render(source);
 if(file==='README.md')body+=`<h2 id="parsers">Parser catalogue</h2><ul class="catalogue">${parserPackages.map(n=>`<li><a href="${outputs.has(`packages/${n}/README.md`)?local(`packages/${n}/README.md`):`${repo}/tree/main/packages/${n}`}">${escape(n)}</a></li>`).join('')}</ul>`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Parser</title><style>
 :root{color-scheme:light dark;font:16px/1.6 system-ui,sans-serif;background:#fafafa;color:#20242b}*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:1120px;margin:auto;padding:24px}header{display:flex;align-items:center;gap:24px;border-bottom:1px solid #d4d8de;flex-wrap:wrap}header strong{font-size:22px;margin-right:auto}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#165fc2;text-underline-offset:3px}h1{font-size:2.3rem;line-height:1.15;letter-spacing:-.035em}h2{margin-top:2em}pre{padding:20px;background:#eef1f5;overflow:auto;border-radius:8px}code{font-family:ui-monospace,monospace;font-size:.9em}table{display:block;overflow-x:auto;border-collapse:collapse;max-width:100%}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #d4d8de;vertical-align:top}th{white-space:nowrap}.catalogue{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;list-style:none;padding:0}footer{border-top:1px solid #d4d8de;font-size:.85rem;color:#626a76}img{max-width:100%}@media(prefers-color-scheme:dark){:root{background:#16191f;color:#e2e6ed}a{color:#8fbcff}pre{background:#222832}header,footer,th,td{border-color:#39404c}footer{color:#a4adbb}}@media(max-width:600px){header,main,footer{padding:18px}h1{font-size:1.9rem}}
 </style></head><body><header><strong>Parser</strong><nav aria-label="Main"><a href="${local('README.md')}">Overview</a><a href="${local('docs/example-first-structure-dsl.md')}">Schema syntax</a><a href="${local('docs/benchmarks/README.md')}">Benchmarks</a><a href="${repo}">GitHub</a></nav></header><main>${body}</main><footer><a href="${repo}/blob/main/${file}">View source</a> · Documentation generated from the repository.</footer></body></html>`;
 const target=resolve(destination,output);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);
}
for(const {from,to} of generatedLinks)if(!existsSync(resolve(destination,posix.dirname(from),to)))throw Error(`Broken documentation link: ${from} -> ${to}`);
writeFileSync(resolve(destination,'.nojekyll'),'');
console.log(`Built ${files.length} documentation pages; verified ${generatedLinks.length} internal links.`);
function readdirSafe(path:string){try{readdirSync(resolve(repositoryRoot,path));return true;}catch{return false;}}
