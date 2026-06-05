// Representative JSON seed for bench input scaling.
export const SEED = JSON.stringify({
  name: 'my-project',
  version: '1.0.0',
  tags: ['alpha', 'beta', 'gamma'],
  settings: {
    strict: true,
    timeout: 30,
    retries: 3,
    targets: ['node', 'browser', 'deno'],
    flags: { verbose: false, color: true, exitOnError: true },
  },
  dependencies: Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`pkg-${i}`, `^${i}.0.${i}`]),
  ),
});
