import {readFileSync} from 'node:fs';
import competitor from 'postcss';
import * as api from '../src/index.ts';
import {seed} from './cases.ts';
import {runStyleBench} from '../../../scripts/style-bench.ts';
await runStyleBench('css',api,seed,(s:string)=>competitor.parse(s),'postcss',[{label:'fixture',input:readFileSync(new URL('./fixture/huge-page.css',import.meta.url),'utf8')}]);
