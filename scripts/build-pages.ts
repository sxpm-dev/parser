import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import hljs from 'highlight.js';
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
 const md=new MarkdownIt({html:false,linkify:true,typographer:false,highlight:(code:string,language:string)=>language&&hljs.getLanguage(language)?hljs.highlight(code,{language,ignoreIllegals:true}).value:''});
 const ids=new Map<string,number>();
 const headings:{id:string;text:string;level:number}[]=[];
 md.renderer.rules.heading_open=(tokens:any[],i:number,options:any,_env:any,self:any)=>{
  const text=tokens[i+1]?.content??'';const raw=text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');const count=ids.get(raw)??0;ids.set(raw,count+1);const id=raw+(count?`-${count}`:'');tokens[i].attrSet('id',id);const level=Number(tokens[i].tag.slice(1));if(level<=3)headings.push({id,text:(tokens[i+1]?.children??[]).map((t:any)=>t.content).join('')||text,level});return self.renderToken(tokens,i,options);
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
 if(file==='README.md')headings.push({id:'parsers',text:'Parser catalogue',level:2});
 if(file==='README.md')body+=`<h2 id="parsers">Parser catalogue</h2><ul class="catalogue">${parserPackages.map(n=>`<li><a href="${outputs.has(`packages/${n}/README.md`)?local(`packages/${n}/README.md`):`${repo}/tree/main/packages/${n}`}">${escape(n)}</a></li>`).join('')}</ul>`;
 const chevron='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
 const external='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3H3v10h10v-3M8 3h5v5M7 9l6-6"/></svg>';
 const link=(target:string,label:string,description='')=>`<a href="${local(target)}"${file===target?' aria-current="page"':''}>${escape(label)}${description?`<small>${escape(description)}</small>`:''}</a>`;
 const group=(label:string,content:string,current:boolean,extra='')=>`<details class="nav-group${current?' is-current':''}"><summary>${label}${chevron}</summary><div class="nav-panel ${extra}">${content}</div></details>`;
 const guideMenu=group('Guides',link('docs/example-first-structure-dsl.md','Schema syntax','Examples, metadata and bidirectional outputs')+link('packages/compiler/README.md','Compiler architecture','How inference becomes standalone code')+link('docs/parser-migration.md','Coverage & migration','Supported syntax and package contracts'),['docs/example-first-structure-dsl.md','packages/compiler/README.md','docs/parser-migration.md'].includes(file));
 const families:Record<string,string[]>= {
  'Styles':['css','less','scss','color','css-color','css-length-percentage'],
  'Markup & data':['html','markdown','json','json-flat','yaml','yaml-block','toml','ini','csv'],
  'Languages & queries':['expression','js-expr','graphql','sql','pg-select','proto'],
  'Web & HTTP':['url','route','http','authorization','cache-control','cookie','mime','email','jwt'],
  'Networking & identifiers':['ipv4','ipv6','mac','uuid','ulid','arn','docker-ref'],
  'Versions & packages':['semver','npm-range','spdx'],
  'Time & scheduling':['cron','rrule','duration','iso-duration'],
  'Other languages':['env','log','commits','gitignore','glob','search','filter','mentions'],
 };
 const parserMenu=group('Parsers',`<div class="parser-search"><label for="parser-search">Find a parser</label><input id="parser-search" type="search" placeholder="Search 52 parsers…" autocomplete="off"></div><div class="parser-groups">${Object.entries(families).map(([label,names])=>`<section class="parser-family"><h2>${label}</h2>${names.map(name=>{const target=`packages/${name}/README.md`;const href=outputs.has(target)?local(target):local('docs/example-first-structure-dsl.md')+'#css-less-scss-scope';return `<a href="${href}" data-parser="${name}"${file===target?' aria-current="page"':''}>${name}</a>`;}).join('')}</section>`).join('')}</div><p class="parser-empty" role="status" hidden>No matching parsers. Try another name.</p>`,file.startsWith('packages/')&&!file.startsWith('packages/compiler/'),'parser-panel');
 const reports=[['docs/benchmarks/README.md','Benchmark overview','Methodology, comparisons and gates'],['docs/benchmarks/2026-11-11/RESULTS.md','Initial rebuild','Recorded CSS, Less and SCSS results'],['docs/benchmarks/2026-11-11-performance/RESULTS.md','Performance work','Compiler optimizations and measured results'],['docs/benchmarks/2026-11-11-migration/RESULTS.md','Migration verification','Correctness and competitor checks'],['docs/benchmarks/2026-11-11-all-parsers/README.md','Interrupted comparison','Partial run · awaiting a quiet-machine rerun']];
 const benchMenu=group('Benchmarks',reports.filter(([path])=>outputs.has(path)).map(([path,label,description])=>link(path,label,description)).join(''),file.startsWith('docs/benchmarks/'));
 const sections=headings.filter(h=>h.level>1);if(!sections.length&&headings[0])sections.push({...headings[0],text:'Overview'});
 const contents=`<ul class="toc-links">${sections.map(h=>`<li class="toc-level-${h.level}"><a href="#${escape(h.id)}" data-toc>${escape(h.text)}</a></li>`).join('')}</ul>`;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Parser</title><link rel="stylesheet" href="${posix.relative(base,'assets/site.css')}"><script defer src="${posix.relative(base,'assets/site.js')}"></script></head><body id="page-top"><a class="skip-link" href="#main-content">Skip to content</a><header class="site-header"><div class="header-inner"><a class="brand" href="${local('README.md')}">Parser</a><button class="menu-toggle" aria-controls="primary-nav" aria-expanded="false">Menu${chevron}</button><nav id="primary-nav" class="primary-nav" aria-label="Main"><a class="nav-link" href="${local('README.md')}"${file==='README.md'?' aria-current="page"':''}>Overview</a>${guideMenu}${parserMenu}${benchMenu}<a class="nav-link github-link" href="${repo}">GitHub${external}</a></nav></div></header><div class="page-layout"><div class="article-column"><details class="mobile-toc"><summary>On this page</summary><nav aria-label="Page contents">${contents}</nav></details><main id="main-content" class="article" tabindex="-1">${body}</main></div><aside class="page-toc" aria-label="Page navigation"><p class="toc-title">On this page</p><nav aria-label="Page contents">${contents}</nav><div class="toc-tools"><a href="${repo}/blob/main/${file}">View source${external}</a><a href="#page-top">Back to top</a></div></aside></div><footer class="site-footer">Parser · Example-defined syntax. Compiler-generated runtimes.</footer></body></html>`;
 const target=resolve(destination,output);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,html);
}
for(const {from,to} of generatedLinks)if(!existsSync(resolve(destination,posix.dirname(from),to)))throw Error(`Broken documentation link: ${from} -> ${to}`);
mkdirSync(resolve(destination,'assets'),{recursive:true});
for(const name of ['site.css','site.js'])copyFileSync(resolve(repositoryRoot,'scripts/pages',name),resolve(destination,'assets',name));
writeFileSync(resolve(destination,'.nojekyll'),'');
console.log(`Built ${files.length} documentation pages; verified ${generatedLinks.length} internal links.`);
function readdirSafe(path:string){try{readdirSync(resolve(repositoryRoot,path));return true;}catch{return false;}}
