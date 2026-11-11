document.documentElement.classList.add('js');
const menuButton=document.querySelector('.menu-toggle');
const menu=document.querySelector('#primary-nav');
const groups=[...document.querySelectorAll('.nav-group')];
menuButton?.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(open));if(!open)groups.forEach(g=>g.open=false);});
for(const group of groups)group.addEventListener('toggle',()=>{if(group.open)for(const other of groups)if(other!==group)other.open=false;});
document.addEventListener('click',event=>{for(const group of groups)if(!group.contains(event.target))group.open=false;});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=groups.find(g=>g.open);if(open){open.open=false;open.querySelector('summary').focus();}else if(menu?.classList.contains('is-open')){menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.focus();}});
const search=document.querySelector('#parser-search');
search?.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();let count=0;for(const family of document.querySelectorAll('.parser-family')){let visible=0;for(const link of family.querySelectorAll('[data-parser]')){link.hidden=!link.dataset.parser.includes(query);if(!link.hidden)visible++;}family.hidden=visible===0;count+=visible;}document.querySelector('.parser-empty').hidden=count!==0;});
const tocLinks=[...document.querySelectorAll('[data-toc]')];
const headings=[...new Set(tocLinks.map(a=>document.getElementById(decodeURIComponent(a.hash.slice(1)))))] .filter(Boolean);
let queued=false;
function updateSection(){queued=false;let active=headings[0];for(const heading of headings){if(heading.getBoundingClientRect().top<=128)active=heading;else break;}if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)active=headings.at(-1);for(const link of tocLinks){if(link.hash==='#'+active?.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}
function queueUpdate(){if(!queued){queued=true;requestAnimationFrame(updateSection);}}
window.addEventListener('scroll',queueUpdate,{passive:true});window.addEventListener('resize',queueUpdate);window.addEventListener('hashchange',queueUpdate);window.addEventListener('load',queueUpdate);updateSection();
