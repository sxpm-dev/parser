"""Summarize completed benchmark JSON without treating missing/error rows as wins."""
import json, pathlib, sys
out=pathlib.Path(sys.argv[1]).resolve()
manifest=json.loads((out/'manifest.json').read_text())
summary=[]
for name in manifest['packages']:
    path=out/(name+'.json')
    if not path.exists():continue
    report=json.loads(path.read_text());entry={'package':name,'status':report['status'],'modes':{}}
    for mode in report['modes']:
        rows=[r for r in mode['rows'] if r['label']=='100KB']
        ours=next((r for r in rows if r['contestant'].startswith('generated')),None)
        theirs=next((r for r in rows if not r['contestant'].startswith('generated')),None)
        valid=lambda r: r and r.get('hz',0)>0 and r.get('coverage') and not r.get('error')
        entry['modes'][mode['mode']]={'generatedOpsPerSecond':ours.get('hz') if ours else None,'competitor':theirs.get('contestant') if theirs else None,'competitorOpsPerSecond':theirs.get('hz') if theirs else None,'generatedRmePercent':ours.get('rme') if ours else None,'competitorRmePercent':theirs.get('rme') if theirs else None,'speedRatio':ours['hz']/theirs['hz'] if valid(ours) and valid(theirs) else None,'status':mode['status'],'unsupportedComparisons':mode['unsupportedComparisons']}
    summary.append(entry)
(out/'summary.json').write_text(json.dumps({'label':'100KB','ratioDefinition':'generated ops/s divided by competitor ops/s','packages':summary},indent=2)+'\n')
lines=['# All-parser benchmark results — 12 November 2026','','Run status: **'+manifest['status']+'**. See [environment and run manifest](manifest.json) and [machine-readable summary](summary.json). Each parser has its own JSON report linked below; raw per-mode logs and JSONL rows are retained alongside them.','','The table shows generated throughput divided by competitor throughput at the **100 KB batch/input size**. Above 1× means the generated parser is faster; below 1× means the competitor is faster. Every JSON report retains all five sizes (5, 20, 100, 500, 1000 KB), plus the CSS fixture. These are corpus-specific measurements, not language-wide performance claims.','','Native competitor output shapes, metadata and validation work differ. Generated reverse conversion checks the inverse; competitor printing may not. Unsupported competitor modes are shown as —, never as a win. Relative margins of error are stored per measurement. A † marks a 100 KB ratio where either measurement has relative margin of error above 10%; treat it as noisy, not a precise ranking. Some competitor adapters return cached text for reverse conversion (URL, semver and npm-range), while the generated inverse reconstructs and validates text. Consult [methodology and gates](../README.md) and [package coverage](../../parser-migration.md).','','| Parser | Competitor (parse) | Parse | JSON | Reverse | Round trip |','| --- | --- | ---: | ---: | ---: | ---: |']
for entry in summary:
    def ratio(mode):
        r=entry['modes'].get(mode,{}).get('speedRatio');
        if r is None:return '—'
        measurement=entry['modes'][mode]
        noisy=max(measurement.get('generatedRmePercent') or 0,measurement.get('competitorRmePercent') or 0)>10
        return (f'{r:.2f}×' if r>=0.01 else f'{r:.4f}×')+('†' if noisy else '')
    comp=entry['modes'].get('parse',{}).get('competitor') or '—'
    lines.append('| ['+entry['package']+']('+entry['package']+'.json) | '+comp+' | '+' | '.join(ratio(m) for m in manifest['modes'])+' |')
lines+=['','No gate thresholds or baselines were changed. This report runs the timing benchmarks; it does not certify performance-gate passes.','']
(out/'README.md').write_text('\n'.join(lines))
print('\n'.join(lines))
