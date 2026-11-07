import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {syntheticResponse,clientRoot,startSyntheticServer} from './dual-workspace-fullapp-server.mjs';
const pilot=readFileSync(new URL('../pilot/pilot.js',import.meta.url),'utf8');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const baselineRoot=process.env.NCC_R4_BASELINE_ROOT||resolve(root,'baseline');
const treePath=process.env.NCC_R4_BASE_TREE_JSON||resolve(root,'base-tree.json');
assert.ok(isAbsolute(baselineRoot)&&isAbsolute(treePath),'Baseline inputs must be absolute local paths');
const tree=JSON.parse(readFileSync(treePath));
const original=readFileSync(resolve(baselineRoot,'efg-nutrition/pilot/pilot.js'),'utf8');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
test('complete app is exact locked baseline plus reviewed integration sites',()=>{
 assert.equal(tree.base,'9aaddfe21d77302224f93ea82be3b215c86769d6');
 assert.equal(blob(Buffer.from(original)),tree.files.find(x=>x.path==='efg-nutrition/pilot/pilot.js').sha);
 assert.ok(pilot.length>450000,'This is the real app, not a detached demo');
 assert.match(pilot,/function frame\(content\)\{\s*dualWorkspaceFrame.prepareFrame\(\);/);
 assert.match(pilot,/dualWorkspaceFrame\.wrap\(content\)/);
 assert.match(pilot,/dualWorkspaceFrame\.mountFrame\(root\)/);
 assert.match(pilot,/function resetPrivateSession\(\)\{\s*dualWorkspaceBootstrap.invalidate\(\);state.dualCandidateCoach=false;\s*dualWorkspaceFrame.invalidate\(\)/);
 assert.match(pilot,/isDualWorkspaceField\(el\)\|\|dualWorkspaceFrame.isProfessional\(\)/);
 assert.match(pilot,/readSession:\(\)=>\(\{userId:state.session\?\.user\?\.id,sessionId:state.session\?\.session_id,epoch:state.authContextEpoch\|\|0\}\)/);
 const integration=pilot.slice(pilot.indexOf('const dualWorkspaceFrame='),pilot.indexOf('const versionNotice='));
 assert.doesNotMatch(integration,/state\.(profile|org)\s*=|state\.profile\.role\s*=/);
});
test('local SDK fixture executes full pilot source and removes all remote module URLs',()=>{
 const patched=syntheticResponse('/efg-nutrition/pilot/pilot.js',pilot);
 assert.ok(patched.length>450000);
 assert.match(patched,/from "\.\.\/tests\/dual-workspace-fullapp-sdk.mjs"/);
 assert.match(patched,/bindApp\(syntheticHooks\)/);
 assert.doesNotMatch(patched,/https?:\/\//);
 assert.doesNotMatch(patched,/sb_publishable_/);
 assert.match(patched,/const SUPABASE_URL=new URL\("\/__ncc_fixture__\/supabase",location.origin\)\.href/);
});
test('flag OFF on disk; enabled only in explicit served candidate response',async()=>{
 const path='/efg-nutrition/pilot/dual-workspace-candidate.mjs';
 const source=readFileSync(resolve(clientRoot,'.'+path),'utf8');
 assert.match(source,/DUAL_WORKSPACE_RELEASE_ENABLED = false/);
 assert.match(syntheticResponse(path,source,{enabled:false}),/DUAL_WORKSPACE_RELEASE_ENABLED = false/);
 assert.match(syntheticResponse(path,source,{enabled:true}),/DUAL_WORKSPACE_RELEASE_ENABLED = true/);
 assert.equal(readFileSync(resolve(clientRoot,'.'+path),'utf8'),source);
 const before=process.env.NCC_R4_SYNTHETIC_FULL_APP;delete process.env.NCC_R4_SYNTHETIC_FULL_APP;
 await assert.rejects(startSyntheticServer(),/Opt in/);
 if(before!==undefined)process.env.NCC_R4_SYNTHETIC_FULL_APP=before;
});
test('all local JavaScript imports in complete app graph exist',()=>{
 const dir=resolve(clientRoot,'efg-nutrition/pilot'),missing=[];
 for(const entry of readdirSync(dir,{recursive:true,withFileTypes:true})){
  if(!entry.isFile()||!/(\.js|\.mjs)$/.test(entry.name))continue;
  const file=resolve(entry.parentPath,entry.name),source=readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.[^"']+)["']/g)){
   const imported=resolve(dirname(file),match[1].split('?')[0]);
   if(!existsSync(imported))missing.push([relative(clientRoot,file),match[1]]);
  }
 }
 assert.deepEqual(missing,[]);
});
test('SDK fixture uses synthetic service only, never fetch or real auth tokens',()=>{
 const sdk=readFileSync(new URL('./dual-workspace-fullapp-sdk.mjs',import.meta.url),'utf8');
 assert.match(sdk,/createSyntheticService/);assert.match(sdk,/location.hostname/);
 assert.doesNotMatch(sdk,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|refresh_token/);
 assert.match(sdk,/Legacy writes blocked by fixture/);assert.match(sdk,/access_token:'synthetic\.'/);assert.match(sdk,/not-signed/);
});

test('new candidate coach routes before private render/load, pull refresh and timer remain restricted',()=>{
 assert.match(pilot,/const menu=state.dualCandidateCoach\?\[\]:role/);
 assert.ok(pilot.indexOf('if(state.dualCandidateCoach){\n  frame(')<pilot.indexOf('await state.foodRestrictionReader.refresh()'));
 assert.match(pilot,/async function refreshVisibleWorkspace\(\)\{\s*if\(state.dualCandidateCoach\)return refresh\(\);/);
 assert.match(pilot,/async function updateAtDayChange\(\)\{\s*if\(state.dualCandidateCoach\)return;/);
 assert.match(pilot,/if\(state.dualCandidateCoach\)\{state.tab="home";return contextRead\(render\(\)\);\}/);
 assert.match(pilot,/if\(!bootstrap.skipLegacyClaim\)\{/);
});
