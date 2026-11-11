import { strict as assert } from 'node:assert';
import test from 'node:test';
import { parse, stringify } from '../src/index.ts';
test('Less variables, mixin calls/definitions, guards, interpolation and nesting', () => {
  const source = `// theme
@brand: #abc;
.rounded(@r: 4px) when (@r > 0) { border-radius: @r; }
.button, #button {
  .rounded(8px);
  color: @brand;
  &.icon { margin: 2px; }
  #icon { display: block; }
  .@{name} { @{property}: @brand; }
}
@media screen { .a { .rounded(); } }`;
  const v: any = parse(source);
  assert.equal(v.children[0].variable, '@brand');
  assert.equal(v.children[2].children[0].call, '.rounded(8px)');
  assert.deepEqual(parse(stringify(v)), v);
});
test('Less interpolation and blocks must close', () => {
  assert.throws(() => parse('.@{name { color: red; }'), SyntaxError);
  assert.throws(() => parse('.mixin(2px;'), SyntaxError);
});
test('Less URLs, detached rulesets and escaped values', () => {
  const source='@rules: { color: red; }; a { background: url(https://example.com/a.png); width: ~"calc(100% - 2px)"; }';
  const v:any=parse(source);
  assert.equal(v.children[0].value,'{ color: red; }');
  assert.deepEqual(parse(stringify(v)),v);
});
test('mixed-case URL function names protect slash pairs from line comments', () => {
  for(const name of ['url','urL','uRl','uRL','Url','UrL','URl','URL']) {
    const source=`a { background: ${name}(https://example.com/a.png); }`;
    assert.deepEqual(parse(stringify(parse(source))),parse(source));
  }
});
