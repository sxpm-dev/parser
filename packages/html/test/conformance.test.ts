/**
 * Phase I conformance: structural equivalence with parse5 on a curated
 * fixture corpus. Masks fields not covered in Phase I:
 *   - parentNode (we always emit null; parse5 emits cyclic refs)
 *   - sourceCodeLocation (different shape; we use auto-attached `source` in raws mode only)
 *   - whitespace-only #text nodes (parse5 emits them between tags; we don't, because whitespace is skipped at tokenization)
 *   - quirks-mode (we always emit 'no-quirks')
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseFragment as parse5ParseFragment } from 'parse5';
import { render } from '../src/index.ts';

// Public `parse()` was removed in Phase 5 of the unified-render-targets
// refactor. The AST shape that used to be returned by parse() is now
// reachable via `render(input, { type: 'ast' })`. Wrap once so the rest of
// the test reads the same as before.
function ourParse(input: string): unknown {
  return render(input, { type: 'ast' });
}

const FIXTURES_DIR = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  'fixtures/phase-1',
);

type P5Node = {
  nodeName: string;
  tagName?: string;
  namespaceURI?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5Node[];
  data?: string;
  value?: string;
  publicId?: string;
  systemId?: string;
  name?: string;
};

type OurNode = {
  nodeName: string;
  tagName?: string;
  namespaceURI?: string;
  attrs?: readonly { readonly name: string; readonly value: string }[];
  childNodes?: readonly OurNode[];
  data?: string;
  value?: string;
  publicId?: string;
  systemId?: string;
  name?: string;
};

function normalizeP5(node: P5Node): OurNode {
  const out: OurNode = { nodeName: node.nodeName };
  if (node.nodeName === '#text') {
    // parse5 stores text content under `value` for text nodes
    out.value = (node as { value?: string }).value ?? '';
    return out;
  }
  if (node.nodeName === '#comment') {
    // Phase I limitation: comment data loses leading/trailing whitespace
    // because `.until()` slices by token offsets and whitespace tokens are
    // skipped. Trim parse5 side to match. See parking lot.
    out.data = (node.data ?? '').trim();
    return out;
  }
  if (node.nodeName === '#documentType') {
    out.name = node.name ?? '';
    out.publicId = node.publicId ?? '';
    out.systemId = node.systemId ?? '';
    return out;
  }
  if (node.nodeName !== '#document' && node.nodeName !== '#document-fragment') {
    out.tagName = node.tagName;
    out.namespaceURI = node.namespaceURI;
    out.attrs = (node.attrs ?? []).map(({ name, value }) => ({ name, value }));
  }
  const kids = (node.childNodes ?? [])
    .filter((kid) => !isWhitespaceOnlyText(kid))
    .map(normalizeP5);
  out.childNodes = kids;
  return out;
}

function normalizeOurs(node: OurNode): OurNode {
  const out: OurNode = { nodeName: node.nodeName };
  if (node.nodeName === '#text') {
    out.value = node.value ?? '';
    return out;
  }
  if (node.nodeName === '#comment') {
    out.data = node.data ?? '';
    return out;
  }
  if (node.nodeName === '#documentType') {
    out.name = node.name ?? '';
    out.publicId = node.publicId ?? '';
    out.systemId = node.systemId ?? '';
    return out;
  }
  if (node.nodeName !== '#document' && node.nodeName !== '#document-fragment') {
    out.tagName = node.tagName;
    out.namespaceURI = node.namespaceURI;
    out.attrs = (node.attrs ?? []).map(({ name, value }) => ({ name, value }));
  }
  const kids = (node.childNodes ?? [])
    .filter((kid) => !isWhitespaceOnlyText(kid))
    .map(normalizeOurs);
  out.childNodes = kids;
  return out;
}

function isWhitespaceOnlyText(node: P5Node | OurNode): boolean {
  if (node.nodeName !== '#text') return false;
  const value = (node as { value?: string }).value ?? '';
  return value.length === 0 || /^\s+$/.test(value);
}

function fixtureNames(): string[] {
  return readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.html')).sort();
}

for (const name of fixtureNames()) {
  test(`phase-1 conformance: ${name}`, () => {
    const source = readFileSync(resolve(FIXTURES_DIR, name), 'utf8');
    const p5 = parse5ParseFragment(source) as unknown as P5Node;
    const ours = ourParse(source) as unknown as OurNode;
    // parse5 fragment is a #document-fragment; our root is #document.
    // Compare child lists directly to factor out the root-node-name diff.
    const oursNorm = normalizeOurs(ours);
    const p5Norm = normalizeP5(p5);
    assert.deepEqual(oursNorm.childNodes, p5Norm.childNodes);
  });
}
