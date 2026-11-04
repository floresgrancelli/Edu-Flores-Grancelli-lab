// NCC PRE-GO only. Generate a reviewable cache-bust patch outside the repository.
// NO merge, deployment, hosted calls, source edits or approvals. An OPTIONAL
// pilot UI activation proposal lives ONLY outside the repo until explicit GO.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const pilotDir=join(repoRoot,'efg-nutrition','pilot');
const projectDir=join(repoRoot,'efg-nutrition');
const indexPath=join(pilotDir,'index.html');
const entryPath=join(pilotDir,'pilot.js');
// Exact, reviewed entry-flow switches; stage ON only in a TEMP review proposal.
// This is NOT authorization to merge or flip hosted switches. Student journey
// and relaunch onboarding are mutually exclusive in the actual PWA.
const pilotActivation=Object.freeze([
 ['coach-student-journey.js','COACH_STUDENT_JOURNEY_ENABLED'],
 ['coach-plan-draft-client.js','COACH_ATOMIC_PLAN_UI_ENABLED'],
 ['coach-release-plan-gate.js','COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED'],
 ['coach-legal-bridge.js','COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED'],
 ['legal-onboarding.js','LEGAL_ONBOARDING_ENABLED'],
 ['coach-shared-recipes-read-client.js','COACH_SHARED_STUDENT_RECIPES_UI_ENABLED'],
 ['student-restriction-declaration.js','PRIVATE_HEALTH_DECLARATION_UI_ENABLED'],
 ['major-release-client.js','MAJOR_RELEASE_FLOW_ENABLED'],
 ['release-communications.js','RELEASE_COMMUNICATIONS_ENABLED'],
 ['science-welcome.js','SCIENCE_WELCOME_ENABLED']
]);
const keepDisabled=Object.freeze([
 ['coach-relaunch-onboarding.js','COACH_RELAUNCH_ONBOARDING_ENABLED'],
 ['coach-adapted-workspace.js','COACH_ADAPTED_GUIDE_PREVIEW_ENABLED'],
 ['qa-reviewed-sources.js','QA_REVIEWED_SOURCES_ENABLED'],
 ['personal-workspace.js','PERSONAL_WORKSPACE_ENABLED'],
 ['pilot-participation-demo.js','PILOT_PARTICIPATION_ENABLED']
]);
const activationByPath=new Map(pilotActivation.map(([file,flag])=>[join(pilotDir,file),flag]));
function checkedSwitchSource(path,flag){
 const s=readFileSync(path,'utf8'),needle='export const '+flag+'=false;';
 assert.equal(s.split(needle).length,2,
  'Refuse pilot UI proposal: expected one OFF switch '+flag);
 return s;
}
function assertPilotActivationBaseline(){
 for(const [file,flag]of [...pilotActivation,...keepDisabled])
  checkedSwitchSource(join(pilotDir,file),flag);
 const app=readFileSync(entryPath,'utf8');
 assert.ok(app.includes('if(COACH_RELAUNCH_ONBOARDING_ENABLED)throw Error("Ingreso piloto duplicado'),
  'New intake journey conflict guard changed: review actual routing');
 assert.ok(app.includes('const COACH_PILOT_PROMOTION_ENABLED=false;'),
  'Post-GO coach promotion must remain disabled');
 assert.ok(app.includes('generateFlexibleGuidedDay(foods,goal'),
  'The automatic six-meal Coach generator must remain connected');
}
const sha256=text=>createHash('sha256').update(text).digest('hex');
const within=(path,root)=>path===root||path.startsWith(root+sep);
const basePart=reference=>reference.split(/[?#]/,1)[0];
const modulePattern=/(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g;
const cssPattern=/(<link\b[^>]*\brel="stylesheet"[^>]*\bhref=")([^"]+)(")/g;
const buildPattern=/(<meta\s+name="efg-build"\s+content=")([^"]+)(")/g;
const entryPattern=/(<script\s+type="module"\s+src=")(\.\/pilot\.js(?:\?[^"]*)?)(")/g;

function resolveLocal(base,reference){
 const target=resolve(dirname(base),basePart(reference));
 assert.ok(within(target,projectDir),'An asset path escapes the NCC application: '+reference);
 assert.ok(existsSync(target),'Missing NCC asset: '+relative(repoRoot,target));
 return target;
}
function versioned(reference,build){
 const clean=basePart(reference);
 const question=reference.indexOf('?'),hash=reference.indexOf('#');
 const end=hash<0?reference.length:hash;
 const params=new URLSearchParams(question>=0&&question<end?reference.slice(question+1,end):'');
 params.set('v',build);
 return clean+'?'+params.toString()+(hash<0?'':reference.slice(hash));
}
const originalHtml=readFileSync(indexPath,'utf8');
const currentBuild=[...originalHtml.matchAll(buildPattern)].map(x=>x[2]);
const currentEntrypoint=[...originalHtml.matchAll(entryPattern)].map(x=>x[2]);
assert.equal(currentBuild.length,1,'PWA must have exactly one release build meta');
assert.equal(currentEntrypoint.length,1,'PWA must have exactly one local entry module');
assert.equal(currentEntrypoint[0].split('?v=')[1],currentBuild[0],
 'The current meta build and entry query must match before release preparation');
const styles=[...originalHtml.matchAll(cssPattern)].map(x=>x[2]);
assert.ok(styles.length>=20,'PWA stylesheet inventory unexpectedly shrank');
for(const style of styles){
 assert.match(basePart(style),/\.css$/,'Only local stylesheets may be rewritten');
 resolveLocal(indexPath,style);
}
assert.ok(existsSync(entryPath),'PWA entry module missing');
const nodes=new Map();
function walk(file,build,{pilotUiDraft=false}={}){
 if(nodes.has(file))return;
 const source=readFileSync(file,'utf8');
 const node={source,staged:'',imports:[]};
 nodes.set(file,node);
 node.staged=source.replace(modulePattern,(whole,prefix,quote,reference)=>{
  const asset=basePart(reference);
  if(!/\.m?js$/i.test(asset))return whole;
  const target=resolveLocal(file,reference);
  node.imports.push(relative(repoRoot,target));
  walk(target,build,{pilotUiDraft});
  return prefix+quote+versioned(reference,build)+quote;
 });
 if(pilotUiDraft&&activationByPath.has(file)){
  const flag=activationByPath.get(file);
  const from='export const '+flag+'=false;',to='export const '+flag+'=true;';
  assert.ok(node.staged.includes(from),'Activation flag changed: '+flag);
  node.staged=node.staged.replace(from,to);
 }
}
function render(build,{pilotUiDraft=false}={}){
 assertPilotActivationBaseline();
 nodes.clear();
 walk(entryPath,build,{pilotUiDraft});
 for(const [file,flag]of pilotActivation){
  const resolved=join(pilotDir,file),node=nodes.get(resolved);
  assert.ok(node,'Activation module not in actual PWA dependency graph: '+file);
  assert.ok(node.staged.includes('export const '+flag+'='+(pilotUiDraft?'true':'false')+';'),
   'Staged switch did not match reviewed activation mode: '+flag);
 }
 // Keep redundant intake, experimental workspace, Personal and QA source overrides OFF.
 // Major-release UI is only staged; its signed server manifest is a separate prerequisite.
 for(const [file,flag]of keepDisabled){
  const node=nodes.get(join(pilotDir,file));
  assert.ok(node&&node.staged.includes('export const '+flag+'=false;'),
   'A post-GO or conflicting module was enabled: '+flag);
 }
 const css=originalHtml.replace(cssPattern,(whole,before,href,after)=>
  before+versioned(href,build)+after);
 const html=css.replace(buildPattern,(whole,before,_old,after)=>before+build+after)
  .replace(entryPattern,(whole,before,path,after)=>before+versioned(path,build)+after);
 assert.equal((html.match(/<meta name="efg-build"/g)||[]).length,1);
 assert.ok(html.includes('name="efg-build" content="'+build+'"'));
 assert.ok(html.includes('src="./pilot.js?v='+build+'"'));
 const entries=[...nodes.entries()].map(([path,node])=>({
  path:relative(repoRoot,path),sourceSha256:sha256(node.source),
  stagedSha256:sha256(node.staged),updated:node.staged!==node.source,
  directImports:node.imports.length
 })).sort((a,b)=>a.path.localeCompare(b.path));
 const summary={
  status:'PREPARE_ONLY_NOT_GO',currentBuild:currentBuild[0],
  proposedBuild:build,stylesheets:styles.length,jsModules:entries.length,
  rewrittenModules:entries.filter(x=>x.updated).length,
  files:entries,htmlSourceSha256:sha256(originalHtml),
  htmlStagedSha256:sha256(html),
  preparationMode:pilotUiDraft?'PILOT_UI_ACTIVATION_PROPOSAL_NOT_GO':'ASSETS_ONLY',
  pilotUiDraft,activationFlags:pilotUiDraft?pilotActivation.map(([file,flag])=>({
   file:'efg-nutrition/pilot/'+file,flag,from:false,proposed:true
  })):[],
  deliberatelyDisabledFlags:keepDisabled.map(([file,flag])=>({
   file:'efg-nutrition/pilot/'+file,flag,enabled:false
  })),
  // A true UI flag without server-owned onboarding/atomic/diary switches is
  // NOT GO and is never permitted by this helper.
  hostedPrerequisitesUnverified:true,
  noHostedCalls:true,noProductionEdits:true,noPublicationAuthorization:true
 };
 return {html,summary};
}
const args=process.argv.slice(2);
const option=name=>args.find(x=>x.startsWith('--'+name+'='))?.slice(name.length+3);
const emit=args.includes('--emit');
const check=args.includes('--check');
const pilotUiDraft=args.includes('--pilot-ui-draft');
assert.ok(emit!==check,'Use exactly one mode: --check OR --emit');
assert.ok(!pilotUiDraft||emit,'Pilot UI draft only permitted with --emit review mode');
if(check){
 assert.deepEqual(args,['--check'],'--check accepts no write or release arguments');
 const output=render('ncc-pilot-pre-go-preview');
 console.log(JSON.stringify({
  status:'BASELINE_VALID_PRE_GO',currentBuild:output.summary.currentBuild,
  stylesheets:output.summary.stylesheets,
  jsModules:output.summary.jsModules,
  rewrittenModules:output.summary.rewrittenModules,
  activationCandidates:pilotActivation.length,
  deliberatelyDisabled:keepDisabled.length,
  writes:0,hostedCalls:0
 }));
}else{
 assert.equal(option('ack'),'PREPARE_ONLY_NOT_GO','Explicit review-only acknowledgment required');
 const expected=option('expected-sha')||'';
 assert.match(expected,/^[a-f0-9]{40}$/,'Pin the entire reviewed Git HEAD');
 const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
 assert.equal(actual,expected,'HEAD changed: re-run review before preparing asset patch');
 assert.equal(execFileSync('git',['status','--porcelain','--','efg-nutrition/pilot'],{cwd:repoRoot,encoding:'utf8'}).trim(),'','Refuse dirty pilot sources: use exact reviewed checkout');
 const build=option('build')||'';
 assert.equal(build,'ncc-pilot-'+expected.slice(0,12),
  'Proposed build must match the exact reviewed HEAD prefix');
 assert.notEqual(build,currentBuild[0],'A pilot cutover needs a fresh version identifier');
 const destination=option('out');
 assert.ok(destination,'Write proposal only to an explicit output directory outside the repository');
 const out=resolve(destination);
 assert.ok(!within(out,repoRoot),'Never write staged files into the repository or live PWA');
 const {html,summary}=render(build,{pilotUiDraft});
 const staged=[{path:indexPath,source:originalHtml,staged:html},
  ...[...nodes.entries()].filter(([,node])=>node.source!==node.staged)
   .map(([path,node])=>({path,source:node.source,staged:node.staged}))];
 for(const entry of staged){
  const path=join(out,relative(repoRoot,entry.path));
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,entry.staged);
 }
 writeFileSync(join(out,'review-manifest.json'),JSON.stringify({
  ...summary,expectedGitSha:expected,
  stagedChangedPaths:staged.map(x=>relative(repoRoot,x.path)).sort(),
  instruction:'Review only. Do NOT deploy or merge without explicit GO.'
 },null,2)+'\n');
 console.log(JSON.stringify({
  status:'STAGED_OUTSIDE_REPO_NOT_PUBLISHED',
  build,expectedGitSha:expected,outputDirectory:out,
  preparationMode:summary.preparationMode,
  activationFlagsProposed:summary.activationFlags.length,
  stagedFiles:staged.length,jsModules:summary.jsModules,
  stylesheets:summary.stylesheets,hostedCalls:0
 }));
}
