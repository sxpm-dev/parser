import { repeatToBytes } from '../../../scripts/bench-table.ts';
export const seed=".card, #panel { color: red; margin: 12px 4px; background: url(\"asset.svg\"); }\n@media screen and (min-width: 600px) { .card:hover { padding: calc(100% - 2px); } }\n[data-x=\"a,b\"]::before { content: \"{x;y}\"; }\n";
export const cases=[5,20,100].map(kb=>({name:`parse:${kb}KB`,kb,input:repeatToBytes(seed,kb*1024),run:(api:any,input:string)=>api.parse(input)}));
