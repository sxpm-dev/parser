import { parse } from './src/index.ts';
import { readFileSync } from 'node:fs';

for (const name of ['atrule-no-semicolon', 'prop', 'inside']) {
  const css = readFileSync(`./test/cases/${name}.css`, 'utf8');
  console.log(`=== ${name} ===`);
  console.log('INPUT:', JSON.stringify(css.slice(0, 100)));
  try {
    const result = parse(css, { mode: 'raws' });
    console.log('OUTPUT:', JSON.stringify(result, null, 2).slice(0, 800));
  } catch (e: any) {
    console.log('THREW:', e.message.split('\n')[0]);
  }
  console.log();
}
