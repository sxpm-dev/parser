/** Benchmark-only adapters. These never enter generated parser bundles. */
export interface Competitor { label:string; contract:string; parse:(source:string)=>unknown; stringify?:(value:any)=>string; }
const load=async(name:string)=>{const mod=await import(name);return mod.default??mod;};
export async function competitor(name:string):Promise<Competitor>{
 const native=(label:string,parse:Competitor['parse'],stringify?:Competitor['stringify'],contract='Native library output; output shape and validation work differ.')=>({label,parse,stringify,contract});
 switch(name){
 case 'json':case 'json-flat':return native('JSON.parse',JSON.parse,JSON.stringify);
 case 'yaml':case 'yaml-block':{const m=await load('yaml');return native('yaml',m.parse,m.stringify);}
 case 'toml':{const m=await load('@iarna/toml');return native('@iarna/toml',m.parse,m.stringify);}
 case 'ini':{const m=await load('ini');return native('ini',m.parse,m.stringify);}
 case 'env':{const m=await load('dotenv');return native('dotenv',m.parse);}
 case 'csv':{const m=await load('csv-parse/sync');return native('csv-parse',m.parse);}
 case 'html':{const m=await load('htmlparser2');return native('htmlparser2',m.parseDocument);}
 case 'markdown':{const M=await load('markdown-it');const m=new M();return native('markdown-it',s=>m.parse(s,{}));}
 case 'expression':case 'js-expr':case 'filter':{const m=await load('jsep');return native('jsep',m);}
 case 'graphql':{const m=await load('graphql');return native('graphql',m.parse,m.print);}
 case 'sql':case 'pg-select':{const m=await load('node-sql-parser');const p=new m.Parser();return native('node-sql-parser',s=>p.astify(s),v=>p.sqlify(v));}
 case 'proto':{const m=await load('protobufjs');return native('protobufjs',s=>m.parse(s));}
 case 'url':return native('WHATWG URL',s=>new URL(s,'https://benchmark.example'),v=>v.href);
 case 'route':{const m=await load('path-to-regexp');return native('path-to-regexp',m.parse);}
 case 'cookie':{const m=await load('cookie');return native('cookie',m.parse);}
 case 'mime':{const m=await load('content-type');return native('content-type',m.parse,m.format);}
 case 'cache-control':{const m=await load('parse-cache-control');return native('parse-cache-control',m);}
 case 'email':{const m=await load('email-addresses');return native('email-addresses',m.parseOneAddress);}
 case 'arn':{const m=await load('@aws-sdk/util-arn-parser');return native('@aws-sdk/util-arn-parser',m.parse);}
 case 'ipv4':case 'ipv6':{const m=await load('ipaddr.js');return native('ipaddr.js',m.parse,v=>v.toString());}
 case 'semver':{const m=await load('semver');return native('semver',s=>new m.SemVer(s),v=>v.version);}
 case 'npm-range':{const m=await load('semver');return native('semver.Range',s=>new m.Range(s),v=>v.range);}
 case 'ulid':{const m=await load('ulid');return native('ulid.decodeTime',m.decodeTime,undefined,'Timestamp decoder only; less output than the generated parser.');}
 case 'cron':{const m=await load('cron-parser');return native('cron-parser',s=>m.parseExpression(s));}
 case 'rrule':{const m=await load('rrule');return native('rrule',m.rrulestr,v=>v.toString().replace(/^RRULE:/,''));}
 case 'duration':{const m=await load('ms');return native('ms',m);}
 case 'iso-duration':{const m=await load('@js-temporal/polyfill');return native('Temporal.Duration',s=>m.Temporal.Duration.from(s),v=>v.toString());}
 case 'color':case 'css-color':{const m=await load('color-string');return native('color-string',m.get);}
 case 'css-length-percentage':{const m=await load('css-tree');return native('css-tree value',s=>m.parse(s,{context:'value'}),m.generate);}
 case 'spdx':{const m=await load('spdx-expression-parse');return native('spdx-expression-parse',m);}
 case 'commits':{const m=await load('conventional-commits-parser');return native('conventional-commits-parser',s=>m.sync(s));}
 case 'gitignore':case 'glob':{const m=await load('picomatch');return native('picomatch.parse',s=>m.parse(s),undefined,'Pattern compiler/parser; does more work than source-record extraction.');}
 // Small independent baselines for formats without a dedicated installed parser.
 case 'authorization':return native('regexp auth fields',s=>{const m=/^(\S+)\s+(.+)$/.exec(s);if(!m)throw Error('authorization');return {scheme:m[1],credentials:m[2]};},v=>`${v.scheme} ${v.credentials}`,'Independent two-field regexp baseline.');
 case 'mac':return native('regexp MAC octets',s=>{if(!/^(?:[\da-f]{2}[:-]){5}[\da-f]{2}$/i.test(s))throw Error('mac');return s.split(/[:-]/);},v=>v.join(':'),'Independent lexical/field baseline.');
 case 'uuid':return native('regexp UUID fields',s=>{if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s))throw Error('uuid');return s.split('-');},v=>v.join('-'),'Independent lexical/field baseline.');
 case 'jwt':return native('compact JWS split',s=>{const a=s.split('.');if(a.length!==3||a.some(x=>!/^[\w-]+$/.test(x)))throw Error('jwt');return a;},v=>v.join('.'),'Segment splitting/validation only, without authentication.');
 case 'docker-ref':return native('regexp image reference',s=>{const m=/^([^@:]+)(?::([^@]+)|@(.+))?$/.exec(s);if(!m)throw Error('image');return {name:m[1],tag:m[2],digest:m[3]};},undefined,'Independent image-reference field baseline.');
 case 'mentions':return native('regexp mentions',s=>Array.from(s.matchAll(/[@#][\w]+/g),m=>m[0]),undefined,'Extracts identifiers only, dropping intervening text.');
 case 'search':return native('regexp query tokens',s=>s.match(/-?[^:\s"]+:[^\s"]+|-?"(?:\\.|[^"])*"|-?[^\s"]+/gu),undefined,'Token extraction, without output projection or inverse validation.');
 case 'log':return native('regexp log fields',s=>{const m=/^(\S+) (\S+) (.+)$/.exec(s);if(!m)throw Error('log');return m.slice(1);},v=>v.join(' '),'Independent log field extraction.');
 case 'http':{const {HTTPParser}=await load('http-parser-js');return native('http-parser-js',s=>{const p=new HTTPParser(HTTPParser.REQUEST);const headers:any[]=[];p[HTTPParser.kOnHeadersComplete]=(v:any)=>{headers.push(v);};const result=p.execute(Buffer.from(s));if(result instanceof Error)throw result;return headers;});}
 default:throw Error(`Missing competitor for ${name}`);
 }
}
