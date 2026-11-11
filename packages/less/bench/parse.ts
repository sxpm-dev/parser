// @ts-expect-error postcss-less publishes no TypeScript declarations.
import competitor from 'postcss-less';
import * as api from '../src/index.ts';
import {seed} from './cases.ts';
import {runStyleBench} from '../../../scripts/style-bench.ts';
await runStyleBench('less',api,seed,(s:string)=>competitor.parse(s),'postcss-less');
