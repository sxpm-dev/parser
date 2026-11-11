import { strict as assert } from 'node:assert';
import test from 'node:test';
import { parse, stringify } from '../src/index.ts';
test('SCSS variables, interpolation, mixins, directives, loops and nested rules', () => {
  const source = `// theme
$brand: #abc;
@mixin size($n) { width: $n; }
.button, #button {
  @include size(12px);
  color: $brand;
  &.icon { margin: 2px; }
  #icon { display: block; }
  .item-#{$name} { #{$property}: calc(100% - #{$gap}); }
}
@for $i from 1 through 3 { .col-#{$i} { width: $i * 10%; } }`;
  const v: any = parse(source);
  assert.equal(v.children[0].variable, '$brand');
  assert.equal(v.children[2].children[3].selectors[0], '#icon');
  assert.deepEqual(parse(stringify(v)), v);
});
test('SCSS interpolation is balanced and malformed input is rejected', () => {
  assert.throws(() => parse('.x-#{$name { color: red; }'), SyntaxError);
  assert.throws(() => parse('$x red;'), SyntaxError);
});
test('SCSS URLs, maps, escaped values and nested properties', () => {
  const source='$map: (primary: red, secondary: blue); a { background: url(https://example.com/a.png); font: { size: 12px; weight: bold; } }';
  const v:any=parse(source);
  assert.deepEqual(v.children[1].children[1],{property:'font',children:[{property:'size',value:'12px'},{property:'weight',value:'bold'}]});
  assert.deepEqual(parse(stringify(v)),v);
});
test('inferred punctuation accepts minified nested property groups', () => {
  const v:any=parse('a{font:{size:12px;}}');
  assert.equal(v.children[0].children[0].property,'font');
});
test('mixed-case URL function names protect slash pairs from line comments', () => {
  for(const name of ['url','urL','uRl','uRL','Url','UrL','URl','URL']) {
    const source=`a { background: ${name}(https://example.com/a.png); }`;
    assert.deepEqual(parse(stringify(parse(source))),parse(source));
  }
});
