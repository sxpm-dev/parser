// Small helpers for emitting JavaScript source as strings.

export function jsString(value: string): string {
  return JSON.stringify(value);
}

export function jsIdent(name: string): string {
  // Defensive: replace any non-ident char with underscore.
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}

export function joinLines(lines: ReadonlyArray<string>): string {
  return lines.filter((l) => l !== '').join('\n');
}

export function indent(source: string, level = 1): string {
  const pad = '  '.repeat(level);
  return source.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
