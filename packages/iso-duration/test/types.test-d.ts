// Compile-only test: types flow through public API after Phase 3.
// Lives in test/ so tsc picks it up (the package's `include: ["src/**/*.ts"]`
// excludes test/ — we run tsc with this path explicitly below in CI).

import { render, stringify } from '../src/index.ts';

// Per-target return types.
const a = render('P1D', { target: 'ast' });
type A = typeof a;

const s = render('P1D', { target: 'source' });
type S = typeof s;

// Default target (= 'ast' on iso-duration's schema).
const d = render('P1D');
type D = typeof d;

// Concrete assertions — fail to type-check if the inferred type drifts.
const _ast: A = { type: 'duration', date: [] };
const _src: S = 'P1D';
const _def: D = { type: 'duration', date: [] };

const _out1: string = stringify({ type: 'duration', date: [] }, { target: 'ast' });
const _out2: string = stringify('P1D', { target: 'source' });
const _out3: string = stringify({ type: 'duration', date: [] });

void _ast; void _src; void _def; void _out1; void _out2; void _out3;
