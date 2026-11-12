"""Run the existing benchmark matrix sequentially, retaining per-parser JSON and raw logs."""
import datetime, hashlib, json, os, pathlib, platform, subprocess, sys, time
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
if (out/'manifest.json').exists():raise RuntimeError('Use a new output directory; existing runs are immutable.')
packages = sorted(p.name for p in (root/'packages').iterdir() if p.name != 'compiler' and (p/'src/schema.ts').exists())
node = subprocess.check_output(['fnm','exec','--using','22.16.0','node','-p','process.execPath'], text=True).strip()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(path, value):
    temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(value,indent=2)+'\n');temp.replace(path)
def cpu():
    return subprocess.check_output(['top','-l','1','-n','0'],text=True).splitlines()[:7]
manifest = {'formatVersion':1,'startedAt':now(),'status':'running','gitCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'node':subprocess.check_output([node,'--version'],text=True).strip(),'platform':platform.platform(),'cpu':subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string'],text=True).strip(),'cpuCount':os.cpu_count(),'memoryBytes':int(subprocess.check_output(['sysctl','-n','hw.memsize'],text=True)),'lockfileSha256':hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest(),'sizesKB':[5,20,100,500,1000],'modes':['parse','json','stringify','round-trip'],'packages':packages,'cpuStart':cpu(),'completed':[],'notes':['Sequential runs using existing harness timing settings.','Generated outputs and native competitor outputs can have different shapes and validation work.','Reverse conversion validates generated output; competitor printers may perform less validation.','Missing competitor modes are unsupported, not wins.','Existing Less competitor skips above 110 KiB retained.','No performance or size baselines modified.']}
lock=json.loads((root/'package-lock.json').read_text())
manifest['dependencyVersions']={name:lock['packages'].get('node_modules/'+name,{}).get('version') for name in json.loads((root/'package.json').read_text())['devDependencies']}
write(out/'manifest.json',manifest)
for name in packages:
    report={'formatVersion':1,'package':name,'startedAt':now(),'status':'running','modes':[]}
    for mode in manifest['modes']:
        stem=f'{name}-{mode}'
        raw=out/(stem+'.jsonl'); log=out/(stem+'.log')
        if raw.exists():raise RuntimeError(f'Refusing to overwrite {raw}')
        env={k:v for k,v in os.environ.items() if k not in ['PARSER_BENCH_SIZES_KB','PARSER_BENCH_JSONL','PARSER_BENCH_PACKAGE','PARSER_BENCH_MODE']}
        env.update(PARSER_BENCH_JSONL=str(raw),PARSER_BENCH_PACKAGE=name,PARSER_BENCH_MODE=mode)
        command=[node,'--import','tsx',f'packages/{name}/bench/parse.ts']+([] if mode=='parse' else ['--'+mode])
        started=now(); before=cpu();begin=time.monotonic()
        with log.open('w') as stream:
            try:
                result=subprocess.run(command,cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT,timeout=900)
                code=result.returncode
            except subprocess.TimeoutExpired:code=124
        rows=[json.loads(line) for line in raw.read_text().splitlines()] if raw.exists() else []
        text=log.read_text()
        omitted=[line for line in text.splitlines() if 'comparison omitted' in line]
        errors=[r for r in rows if r.get('error')]
        item={'mode':mode,'startedAt':started,'finishedAt':now(),'durationSeconds':round(time.monotonic()-begin,2),'exitCode':code,'status':'complete' if code==0 and not errors else 'failed','cpuBefore':before,'unsupportedComparisons':omitted,'log':log.name,'rows':rows}
        report['modes'].append(item);write(out/(name+'.json'),report)
        print(f'{name:24} {mode:12} {item["status"]:8} {len(rows):2} rows {item["durationSeconds"]:7.1f}s',flush=True)
    report['status']='complete' if all(m['status']=='complete' for m in report['modes']) else 'failed'
    report['finishedAt']=now();write(out/(name+'.json'),report)
    manifest['completed'].append(name);write(out/'manifest.json',manifest)
manifest.update(status='complete',finishedAt=now(),cpuEnd=cpu())
manifest['failedPackages']=[n for n in packages if json.loads((out/(n+'.json')).read_text())['status']!='complete']
if manifest['failedPackages']:manifest['status']='completed-with-errors'
write(out/'manifest.json',manifest)
print('FINISHED '+manifest['status'],flush=True)
