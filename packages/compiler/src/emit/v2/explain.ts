// Codegen decision report (--explain). Same registry pattern as
// until-guard.ts: the CLI (or a test) opens a collection, the emitters
// record decisions at their natural choke points while emission runs
// synchronously, and the caller drains the entries afterwards. When no
// collection is open every record() is a no-op, so normal generation pays
// nothing.
//
// Entries are data, not prose paragraphs — the CLI formats them. `node` is
// the node type (or role) the decision concerns; `kind` is a stable
// machine-checkable tag (tests assert on kind+detail substrings, never on
// CLI formatting).

export type ExplainEntry = {
  readonly node: string;
  readonly kind:
    | 'dispatch'          // strategy chosen for a multi-production node
    | 'dispatch-gate'     // an alt gated by a viability pre-scan
    | 'union-guard'       // a role probe gated in a body-union ladder
    | 'fusion'            // structured-fused (production, target)
    | 'fusion-merged';    // until-divergence merged dispatcher
  readonly detail: string;
};

let entries: ExplainEntry[] | null = null;

export function beginExplain(): void {
  entries = [];
}

export function recordExplain(entry: ExplainEntry): void {
  if (entries !== null) entries.push(entry);
}

export function drainExplain(): ExplainEntry[] {
  const out = entries ?? [];
  entries = null;
  return out;
}

/** Group + format entries for terminal output. Formatting is intentionally
 *  not pinned by tests — assert on the entries themselves. */
export function formatExplain(report: ReadonlyArray<ExplainEntry>): string {
  const byNode = new Map<string, ExplainEntry[]>();
  for (const e of report) {
    const list = byNode.get(e.node) ?? [];
    list.push(e);
    byNode.set(e.node, list);
  }
  const lines: string[] = [];
  for (const [node, list] of [...byNode.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${node}`);
    for (const e of list) lines.push(`  [${e.kind}] ${e.detail}`);
  }
  return lines.join('\n');
}
