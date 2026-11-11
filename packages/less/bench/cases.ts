import { repeatToBytes } from '../../../scripts/bench-table.ts';
export const seed="@brand: #abc;\n.rounded(@r: 4px) when (@r > 0) { border-radius: @r; }\n.button, #button { .rounded(8px); color: @brand; &.icon { margin: 2px; } #icon { display: block; } .@{name} { width: 12px; } }\n";
export const cases=[5,20,100].map(kb=>({name:`parse:${kb}KB`,kb,input:repeatToBytes(seed,kb*1024),run:(api:any,input:string)=>api.parse(input)}));
