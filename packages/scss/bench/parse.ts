import competitor from 'postcss-scss';
import * as api from '../src/index.ts';
import {seed} from './cases.ts';
import {runStyleBench} from '../../../scripts/style-bench.ts';
await runStyleBench('scss',api,seed,(s:string)=>competitor.parse(s),'postcss-scss');
