export {
  DEFAULT_SIZES_KB as SIZES_KB,
  type BenchResult,
  type Contestant,
  fmtNs,
  hashInput,
  repeatToBytes,
} from '../../../scripts/bench-table.ts';
import { runBenchTable as runSharedBenchTable } from '../../../scripts/bench-table.ts';
import type { Contestant } from '../../../scripts/bench-table.ts';

export function generateCss(targetBytes: number): string {
  const chunks: string[] = [];
  let bytes = 0;
  let i = 0;
  while (bytes < targetBytes) {
    const chunk = realisticRule(i);
    chunks.push(chunk);
    bytes += chunk.length;
    i++;
  }
  return chunks.join('');
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  await runSharedBenchTable({ title, contestants, generateInput: generateCss, parserColumnWidth: 22 });
}

function realisticRule(i: number): string {
  switch (i % 5) {
    case 0:
      return `.card-${i}, #panel-${i} { color: red; margin: ${i % 17}px ${i % 11}px; background: url("asset-${i}.svg"); }\n`;
    case 1:
      return `@media screen and (max-width: ${320 + (i % 600)}px) { .card-${i}:hover { border-color: green; transform: translate(${i % 9}px, ${i % 7}px); } }\n`;
    case 2:
      return `/* theme ${i} */ [data-state="open-${i}"]::before { content: "{ item ${i}; }"; padding: calc(100% - ${i % 13}px); }\n`;
    case 3:
      return `@font-face { font-family: "Inter ${i}"; src: url("inter-${i}.woff2"); font-display: swap; }\n`;
    default:
      return `.grid-${i} > .item:not(.disabled), .grid-${i} + .summary { --gap: ${i % 20}px; color: rgb(${i % 255}, ${(i * 2) % 255}, ${(i * 3) % 255}); }\n`;
  }
}
