import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
test('self-contained demo script parses and matches restrictive CSP hash',()=>{
 const html=readFileSync(new URL('../pilot/dual-workspace-offline.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);
 assert.ok(html.includes("script-src 'sha256-"+createHash('sha256').update(script).digest('base64')+"'"));
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.doesNotMatch(script,/^import /m);
});
test('entrypoint patch stays OFF, preserves legacy role and uses a bounded dynamic mount',()=>{
 const patch=readFileSync(new URL('../../integration/pilot-entrypoint.patch',import.meta.url),'utf8');
 const additions=patch.split('\n').filter(line=>line.startsWith('+')&&!line.startsWith('+++')).join('\n');
 assert.match(additions,/NCC_DUAL_WORKSPACE_CANDIDATE_ENABLED=false/);
 assert.match(additions,/if\(NCC_DUAL_WORKSPACE_CANDIDATE_ENABLED\)/);
 assert.match(additions,/!host\.isConnected\|\|\(state\.authContextEpoch\|\|0\)!==epoch/);
 assert.doesNotMatch(additions,/state\.(?:profile|org)\s*=/);
 assert.doesNotMatch(additions,/state\.profile\.role\s*=/);
 assert.match(additions,/hasUnsavedDraft/);
});
