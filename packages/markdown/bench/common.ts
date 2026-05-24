import { readFileSync } from 'node:fs';
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

const fixture = readFileSync(new URL('../test/fixtures/release-notes.md', import.meta.url), 'utf8').trim();
// Real-world fixture: a CLAUDE.md / app rules file (~40KB) sampled from a
// production repo. Runs FIRST in every bench so the table opens with a
// realistic, non-synthetic measurement before the repeated-fixture sizes.
const appRulesFixture = readFileSync(new URL('./fixtures/app-rules-fixture.md', import.meta.url), 'utf8');

export function generateMarkdown(targetBytes: number): string {
  const chunks: string[] = [];
  let bytes = 0;
  while (bytes < targetBytes) {
    const chunk = `${fixture}\n\n`;
    chunks.push(chunk);
    bytes += chunk.length;
  }
  return chunks.join('');
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  await runSharedBenchTable({
    title,
    contestants,
    generateInput: generateMarkdown,
    parserColumnWidth: 26,
    namedInputs: [{ label: 'app-rules', input: appRulesFixture }],
  });
}
