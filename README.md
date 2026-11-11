# Example-inferred parsers

Concrete source/output examples + explicit constraints → compile-time inference → small standalone parsers.

The workspace contains a domainless compiler and 52 separate parser packages (including CSS, Less, and SCSS). Generated modules expose `parse`, `stringify`, `validate`, and example-derived TypeScript output types. No parser runtime dependency is shipped. Outputs are defined by examples; an AST is not prescribed.

```sh
npm install
npm run generate
npm test
npm run typecheck
npm run bench:check  # untimed adapter and inverse checks
npm run bench
npm run gate
```

Read [the example syntax and scope](docs/example-first-structure-dsl.md), [compiler architecture](packages/compiler/README.md), and [benchmark methodology/results](docs/benchmarks/README.md).

The previous implementation is backed up at `cab2c26d415a3d9cb5b9b86d4c9307e1caa0f964`. The legacy runtime has been removed; approved parser names now use the example-inference compiler. The benchmark platform and original CSS fixture are preserved. Historical CSS gate baselines are in `docs/benchmarks/legacy/`.

See [migration coverage and benchmark wiring](docs/parser-migration.md) for package scope, comparisons and gate status.

## Published documentation

[Documentation site](https://sxpm-dev.github.io/parser/) · [GitHub repository](https://github.com/sxpm-dev/parser)

`npm run pages:build` renders the documentation and parser catalogue into `dist/pages`. The site includes grouped guide and benchmark menus, a searchable parser catalogue, and heading-based page navigation that stays on the right on desktop and collapses above the article on mobile. GitHub Actions verifies the code and deploys that directory to Pages on pushes to `main`. It does not run timing benchmarks or replace gate baselines.
