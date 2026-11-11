# Parser migration and benchmark wiring

The 49 approved additions are schema-owned packages alongside CSS, Less and SCSS. Full JavaScript (`js`) is excluded. All entrypoints re-export standalone generated code; no language-specific scanner or external parser fallback is shipped.

Output contracts are intentionally example-defined, not API-compatible copies of historical ASTs. Historical teaching inputs are retained as regression tests where available. These tests establish coverage of those inputs, not full language conformance.

## Package scope

| Package | Implemented scope / exclusions |
| --- | --- |
| [arn](../packages/arn/README.md) | Six ARN fields, including empty region/account. Resource identifiers remain text. |
| [authorization](../packages/authorization/README.md) | Authorization scheme and credential text; credentials are not decoded or authenticated. |
| [cache-control](../packages/cache-control/README.md) | Comma-separated directives, including extension names and raw values. |
| [color](../packages/color/README.md) | Hex, named and functional color syntax. Function arguments are balanced text; channel ranges and the named-color registry are not validated. |
| [commits](../packages/commits/README.md) | Conventional Commit subject lines, optional scope and breaking marker. Bodies/footers are excluded. |
| [cookie](../packages/cookie/README.md) | Cookie header name/value pairs; no Set-Cookie semantics. |
| [cron](../packages/cron/README.md) | Five cron fields with optional command text. Scheduling semantics and numeric range validation are not implemented. |
| [css-color](../packages/css-color/README.md) | Hex, named and functional color syntax. Function arguments are balanced text; channel ranges and the named-color registry are not validated. |
| [css-length-percentage](../packages/css-length-percentage/README.md) | Length dimensions, percentages, zero and balanced math/variable functions; no computed-value evaluation. |
| [csv](../packages/csv/README.md) | Comma-separated rows, quoted fields and doubled quotes. Cells retain their quoted spelling; empty fields need additional support. |
| [docker-ref](../packages/docker-ref/README.md) | Image name with optional tag or digest; registry ports and digest length validation are outside this subset. |
| [duration](../packages/duration/README.md) | Single or compound numeric durations (ms/s/m/h/d/w/y), with ordered unit records and no evaluation. |
| [email](../packages/email/README.md) | Unquoted email address structure; no DNS lookup or full RFC mailbox validation. |
| [env](../packages/env/README.md) | Simple unquoted dotenv assignments. Quoted values are preserved as source text. |
| [expression](../packages/expression/README.md) | Recursive arithmetic, comparison and logical expressions, with explicit precedence tiers, grouping and function calls. Output head/tail sequences preserve operator order. JavaScript statements, object/template literals and assignment are excluded. |
| [filter](../packages/filter/README.md) | Arithmetic/comparison/logical expressions with explicit precedence sequences, grouping, calls, tuples and unary operators. Also accepts and/or/in and dotted field names. Evaluation is not provided. |
| [gitignore](../packages/gitignore/README.md) | Pattern lines, leading negation and comments. Matching, anchoring and directory traversal are not evaluated. |
| [glob](../packages/glob/README.md) | Glob literals, *, **, ?, bracket classes and brace alternatives. No filesystem expansion; extglobs and escaped syntax are excluded. |
| [graphql](../packages/graphql/README.md) | Operation documents, fragments/spreads, aliases, nested selections, argument and variable-definition spans. Argument values remain balanced source text; schema validation and directive semantics are not evaluated. |
| [html](../packages/html/README.md) | Tag/comment/text records and script/style raw-text elements. Attributes remain quoted source text. This output is a token projection, without browser tree construction, entity decoding or error recovery. |
| [http](../packages/http/README.md) | HTTP request line, repeated headers and opaque body. Does not perform content-length/chunk framing, decompression or connection handling. |
| [ini](../packages/ini/README.md) | Section headers and key/value lines, values retained as source text. Multiline values and semantic table resolution are excluded. |
| [ipv4](../packages/ipv4/README.md) | Four decimal octets, range 0–255, no leading zeros. |
| [ipv6](../packages/ipv6/README.md) | Expanded/compressed hexadecimal IPv6 addresses. Embedded IPv4 and zone identifiers are excluded. |
| [iso-duration](../packages/iso-duration/README.md) | ISO date/time duration unit sequences, including date-only, time-only and mixed forms. M is interpreted by its containing date/time field. Unit ordering/range semantics are not enforced. |
| [js-expr](../packages/js-expr/README.md) | Recursive arithmetic, comparison and logical expressions, with explicit precedence tiers, grouping and function calls. Output head/tail sequences preserve operator order. JavaScript statements, object/template literals and assignment are excluded. |
| [json](../packages/json/README.md) | Recursive JSON syntax, including scalar roots, escaped strings, numbers and empty collections. Output retains raw scalar spelling in example-defined records; it is not the native JSON.parse output shape. |
| [json-flat](../packages/json-flat/README.md) | Root object members with raw balanced value spans; does not recursively validate nested JSON values. |
| [jwt](../packages/jwt/README.md) | Three compact JWS segments. Does not decode payloads or verify signatures. |
| [log](../packages/log/README.md) | Common access-log records and timestamp/level/message lines. Values are textual; calendar validation and arbitrary custom log formats are excluded. |
| [mac](../packages/mac/README.md) | Six-octet colon or hyphen MAC address structure. |
| [markdown](../packages/markdown/README.md) | Heading, list-item, blockquote and paragraph lines. Inline markup, code fences and full CommonMark block semantics remain pending. |
| [mentions](../packages/mentions/README.md) | Text with @mentions and #tags. Output retains text between identifiers. |
| [mime](../packages/mime/README.md) | Media type and subtype; parameterized media types remain pending. |
| [npm-range](../packages/npm-range/README.md) | Comparator sets, union, wildcard/partial versions and hyphen ranges. Retains source components; does not evaluate satisfiability. |
| [pg-select](../packages/pg-select/README.md) | SELECT columns FROM table, with optional opaque WHERE expression. Joins, aliases and additional clauses remain pending. |
| [proto](../packages/proto/README.md) | Syntax/package/import declarations, nested messages, plain/repeated/optional fields, enums and RPC services. Source field types and numbers are retained as strings. Options, maps and semantic symbol resolution are excluded.  |
| [route](../packages/route/README.md) | Slash-separated static, named parameter and wildcard segments. No route matching engine. |
| [rrule](../packages/rrule/README.md) | Recurrence key/value structure; does not expand recurrence dates. |
| [search](../packages/search/README.md) | Search terms, quoted phrases, key:value filters and leading negation. Boolean expression/filter evaluation is excluded. |
| [semver](../packages/semver/README.md) | Version components with optional prerelease/build identifiers. Numeric components are retained as strings; prerelease numeric leading-zero semantics are not enforced. |
| [spdx](../packages/spdx/README.md) | License identifiers, WITH exceptions, AND/OR chains and parenthesized expressions. The SPDX registry is not embedded; mixed operators retain source order for consumers. |
| [sql](../packages/sql/README.md) | SQL lexical records with nested parentheses, quoted identifiers/strings, comments and operators. SQL statement semantics are not validated. |
| [toml](../packages/toml/README.md) | Section headers and key/value lines, values retained as source text. Multiline values and semantic table resolution are excluded. |
| [ulid](../packages/ulid/README.md) | Canonical uppercase ULID lexical validation, including 128-bit overflow bound. |
| [url](../packages/url/README.md) | Absolute URLs with authority or root-relative references, optional query and fragment. Percent encoding remains raw; no WHATWG normalization. |
| [uuid](../packages/uuid/README.md) | UUID hexadecimal structure; accepts any version/variant bits. |
| [yaml](../packages/yaml/README.md) | Flat mapping/sequence lines and fenced frontmatter with body text. Values remain raw source strings; full YAML native-value semantics, anchors and block scalars are excluded. |
| [yaml-block](../packages/yaml-block/README.md) | Block mapping, container and sequence lines, with leading indentation retained explicitly in output records. This projection is flat: it retains the evidence of nesting without constructing native YAML values. Block scalars, anchors and indentation validity checks are excluded.  |

## Benchmarks

Every parser provides `bench:parse`, `bench:json`, `bench:stringify`, `bench:round-trip`, browser builds and size/performance gate commands. Root generation, tests and audits discover packages automatically.

`npm run bench:check` runs the 49 new competitor adapters without timing, checking seeds, generated inverse reconstruction, JSON serialization and available native inverse APIs. Competitors are dev dependencies or explicitly labeled independent regexp baselines. CSS/Less/SCSS retain the PostCSS benchmark harness.

New benchmark rows process batches of complete independent documents; they do not concatenate standalone values into invalid language inputs. Preparation and stringify pre-parsing occur outside timing. Native output shapes differ and each adapter states the comparison contract. Native APIs without inverse support are omitted from inverse comparisons. Cyclic native outputs are omitted from JSON comparisons. No native serialization is presented as equivalent to the generated checked inverse.

## Gates and timing status

- Existing CSS/Less/SCSS baselines and tolerance thresholds are unchanged. Their minified/gzip sizes remain 15109/2527, 22353/2849 and 21834/2839 bytes respectively, and all three size gates pass.
- New packages have measured initial size baselines, with the existing 5% default gate tolerance. The initializer refuses to overwrite an existing baseline.
- New performance gates are wired but require measured initial baselines. No synthetic or zero baselines are installed.
- The previously requested quiet-machine timing run remains paused until the user says to continue. No new performance wins or passing performance gates are claimed.

To establish new performance baselines once timing is authorized, run `npm run perf:baseline -w @parser3/<package>`, then `npm run perf:gate -w @parser3/<package>`. Do not run the root `baseline` command to initialize only new packages: it would replace existing style baselines.

## Verification

Compiler regression tests cover scalar recursive references, adjacent captures, token delimiters, empty-list evidence, repeated-list termination, significant line boundaries and trailing separators. Each migrated package has example-output/JSON-inverse checks and unseen/rejection tests; historical teaching-input regressions are included when a source corpus exists.
