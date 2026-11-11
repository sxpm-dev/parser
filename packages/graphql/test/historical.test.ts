// Historical teaching inputs from parser/packages/graphql/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('graphql: historical teaching-input corpus',()=>{for(const source of ["query GetUser { user { id name } }","mutation SavePost($id: ID!) { savePost(id: $id) { ok post { title } } }","{ viewer { login avatarUrl: avatar_url repository(name: \"sx\", first: 10) { id } } }","fragment UserFields on User { id name }"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
