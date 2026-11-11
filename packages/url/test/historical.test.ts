// Historical teaching inputs from parser/packages/url/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('url: historical teaching-input corpus',()=>{for(const source of ["/","/foo/bar","/foo/bar?user=tj&pet=fluffy","http://localhost:8888/foo/bar?user=tj&pet=fluffy","https://example.com/search?q=hello+world#top"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
