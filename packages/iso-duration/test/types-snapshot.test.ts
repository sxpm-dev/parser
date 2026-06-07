// Phase 3 snapshot — asserts the generated `// --- Inferred types ---` block
// and the per-target `render` / `stringify` overloads stay locked to the
// expected baseline. If a schema change or compiler change shifts these,
// the test surfaces the diff so the reviewer can decide whether the new
// types are intended.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const generated = readFileSync(
  join(here, '..', 'src', '_generated', 'parser.ts'),
  'utf8',
);

function extractBlock(start: RegExp, end: RegExp): string {
  const startMatch = start.exec(generated);
  if (!startMatch) throw new Error(`start marker not found: ${start}`);
  const tail = generated.slice(startMatch.index);
  const endMatch = end.exec(tail);
  if (!endMatch) throw new Error(`end marker not found: ${end}`);
  return tail.slice(0, endMatch.index).trimEnd();
}

test('iso-duration: generated parser embeds the expected inferred-type aliases', () => {
  const aliases = extractBlock(
    /\/\/ --- Inferred types ---/,
    /\nfunction parse/,
  );
  assert.equal(
    aliases,
    [
      '// --- Inferred types ---',
      'export type DateUnit_ast = { type: "years"; value: string } | { type: "months"; value: string } | { type: "weeks"; value: string } | { type: "days"; value: string };',
      'export type DateUnit_source = string;',
      'export type TimeUnit_ast = { type: "hours"; value: string } | { type: "minutes"; value: string } | { type: "seconds"; value: string };',
      'export type TimeUnit_source = string;',
      'export type Duration_ast = { type: "duration"; date: DateUnit_ast[] } | { type: "duration"; date: DateUnit_ast[]; time: TimeUnit_ast[] };',
      'export type Duration_source = string;',
    ].join('\n'),
  );
});

test('iso-duration: render overloads cover every declared target plus default', () => {
  const overloads = extractBlock(
    /export function render\(input: string, options: \{ target: "ast"/,
    /\nexport function render\(input: string, options\?: \{ target\?: string;/,
  );
  assert.equal(
    overloads,
    [
      'export function render(input: string, options: { target: "ast"; mode?: ParseMode }): Duration_ast;',
      'export function render(input: string, options: { target: "source"; mode?: ParseMode }): Duration_source;',
      'export function render(input: string, options?: { target?: undefined; mode?: ParseMode }): Duration_ast;',
    ].join('\n'),
  );
});

test('iso-duration: stringify overloads cover every declared target plus default', () => {
  const overloads = extractBlock(
    /export function stringify\(value: Duration_ast/,
    /\nexport function stringify\(value: unknown, options\?: \{ target\?: string \}\)/,
  );
  assert.equal(
    overloads,
    [
      'export function stringify(value: Duration_ast, options: { target: "ast" }): string;',
      'export function stringify(value: Duration_source, options: { target: "source" }): string;',
      'export function stringify(value: Duration_ast, options?: { target?: undefined }): string;',
    ].join('\n'),
  );
});
