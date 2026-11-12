# All-parser benchmark results — 12 November 2026

Run status: **complete**. See [environment and run manifest](manifest.json) and [machine-readable summary](summary.json). Each parser has its own JSON report linked below; raw per-mode logs and JSONL rows are retained alongside them.

The table shows generated throughput divided by competitor throughput at the **100 KB batch/input size**. Above 1× means the generated parser is faster; below 1× means the competitor is faster. Every JSON report retains all five sizes (5, 20, 100, 500, 1000 KB), plus the CSS fixture. These are corpus-specific measurements, not language-wide performance claims.

Native competitor output shapes, metadata and validation work differ. Generated reverse conversion checks the inverse; competitor printing may not. Unsupported competitor modes are shown as —, never as a win. Relative margins of error are stored per measurement. A † marks a 100 KB ratio where either measurement has relative margin of error above 10%; treat it as noisy, not a precise ranking. Some competitor adapters return cached text for reverse conversion (URL, semver and npm-range), while the generated inverse reconstructs and validates text. Consult [methodology and gates](../README.md) and [package coverage](../../parser-migration.md).

| Parser | Competitor (parse) | Parse | JSON | Reverse | Round trip |
| --- | --- | ---: | ---: | ---: | ---: |
| [arn](arn.json) | @aws-sdk/util-arn-parser | 0.58× | 0.83× | — | — |
| [authorization](authorization.json) | regexp auth fields | 0.41× | 0.78× | 0.05× | 0.17× |
| [cache-control](cache-control.json) | parse-cache-control | 1.04× | 0.93× | — | — |
| [color](color.json) | color-string | 1.82×† | 1.48× | — | — |
| [commits](commits.json) | conventional-commits-parser | 52.71× | 31.16× | — | — |
| [cookie](cookie.json) | cookie | 0.48× | 0.47× | — | — |
| [cron](cron.json) | cron-parser | 6.06× | 6.76× | — | — |
| [css](css.json) | postcss | 2.68× | 2.86× | 0.38× | 1.43× |
| [css-color](css-color.json) | color-string | 1.46× | 1.46× | — | — |
| [css-length-percentage](css-length-percentage.json) | css-tree value | 7.21× | 5.91×† | 0.32× | 2.55× |
| [csv](csv.json) | csv-parse | 19.06× | 13.72× | — | — |
| [docker-ref](docker-ref.json) | regexp image reference | 0.36× | 0.81× | — | — |
| [duration](duration.json) | ms | 0.42×† | 0.40× | — | — |
| [email](email.json) | email-addresses | 127.36× | 119.39×† | — | — |
| [env](env.json) | dotenv | 1.22× | 0.96× | — | — |
| [expression](expression.json) | jsep | 0.66× | 0.49× | — | — |
| [filter](filter.json) | jsep | 0.61×† | 0.49× | — | — |
| [gitignore](gitignore.json) | picomatch.parse | 3.80×† | 1.00×† | — | — |
| [glob](glob.json) | picomatch.parse | 5.48×† | 9.47×† | — | — |
| [graphql](graphql.json) | graphql | 1.64×† | 2.60× | 0.81× | 0.78×† |
| [html](html.json) | htmlparser2 | 1.65× | — | — | — |
| [http](http.json) | http-parser-js | 2.70×† | 1.98× | — | — |
| [ini](ini.json) | ini | 6.03× | 4.84× | 2.01×† | 3.28×† |
| [ipv4](ipv4.json) | ipaddr.js | 2.73× | 1.76× | 0.21×† | 0.75×† |
| [ipv6](ipv6.json) | ipaddr.js | 11.92× | 9.86× | 2.53× | 7.84× |
| [iso-duration](iso-duration.json) | Temporal.Duration | 4.82×† | 4.75×† | 1.75× | 3.50×† |
| [js-expr](js-expr.json) | jsep | 0.90× | 0.61× | — | — |
| [json](json.json) | JSON.parse | 0.84× | 0.65× | 0.14× | 0.30×† |
| [json-flat](json-flat.json) | JSON.parse | 0.82× | 0.73× | 0.19× | 0.37× |
| [jwt](jwt.json) | compact JWS split | 0.80× | 0.81× | 0.16× | 0.39× |
| [less](less.json) | postcss-less | 115.44× | 93.04× | 0.31× | 43.36× |
| [log](log.json) | regexp log fields | 0.21× | 0.29× | 0.10× | 0.13× |
| [mac](mac.json) | regexp MAC octets | 0.45× | 0.55× | 0.09× | 0.17× |
| [markdown](markdown.json) | markdown-it | 4.43× | 7.05× | — | — |
| [mentions](mentions.json) | regexp mentions | 1.40× | 0.87× | — | — |
| [mime](mime.json) | content-type | 0.57× | 1.27× | 0.26× | 0.35× |
| [npm-range](npm-range.json) | semver.Range | 0.84×† | 2.68× | 0.0039× | 0.32× |
| [pg-select](pg-select.json) | node-sql-parser | 119.26× | 91.64× | 2.21× | 44.78× |
| [proto](proto.json) | protobufjs | 6.55× | 5.75× | — | — |
| [route](route.json) | path-to-regexp | 2.40× | 1.83× | — | — |
| [rrule](rrule.json) | rrule | 8.09× | 10.08× | 0.94× | 2.88× |
| [scss](scss.json) | postcss-scss | 1.72× | 2.15× | 0.29× | 1.04× |
| [search](search.json) | regexp query tokens | 0.34× | 0.33× | — | — |
| [semver](semver.json) | semver | 1.26× | 1.69× | 0.0024× | 0.48× |
| [spdx](spdx.json) | spdx-expression-parse | 2.91× | 2.24× | — | — |
| [sql](sql.json) | node-sql-parser | 92.90× | 47.45×† | 1.06× | 26.93× |
| [toml](toml.json) | @iarna/toml | 6.13× | 4.01× | 0.99× | 2.64× |
| [ulid](ulid.json) | ulid.decodeTime | 6.03× | 3.69× | — | — |
| [url](url.json) | WHATWG URL | 1.50× | 1.13× | 0.0074× | 0.57× |
| [uuid](uuid.json) | regexp UUID fields | 0.68× | 0.65× | 0.17× | 0.37× |
| [yaml](yaml.json) | yaml | 31.54× | 19.30× | 8.45× | 16.90× |
| [yaml-block](yaml-block.json) | yaml | 26.77× | 17.59× | 8.21× | 15.71× |

No gate thresholds or baselines were changed. This report runs the timing benchmarks; it does not certify performance-gate passes.
