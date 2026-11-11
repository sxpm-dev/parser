import { repeatToBytes } from '../../../scripts/bench-table.ts';
export const seed="$brand: #abc;\n@mixin size($n) { width: $n; }\n.button, #button { color: $brand; @include size(12px); &.icon { margin: 2px; } #icon { display: block; } .item-#{$name} { width: calc(100% - #{$gap}); } }\n";
export const cases=[5,20,100].map(kb=>({name:`parse:${kb}KB`,kb,input:repeatToBytes(seed,kb*1024),run:(api:any,input:string)=>api.parse(input)}));
