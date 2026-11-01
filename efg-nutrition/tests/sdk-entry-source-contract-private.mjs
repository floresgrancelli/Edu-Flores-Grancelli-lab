import assert from 'node:assert/strict';
import {localSdkEntrySource,localSdkEntryFlag} from './sdk-entry-source-private.mjs';
const source='import {createClient} from "https://esm.sh/@supabase/supabase-js@2.118.0";\n'+
 'const SUPABASE_URL="https://example.supabase.co";\nconst SUPABASE_PUBLISHABLE="public-placeholder";\n'+
 'const options={emailRedirectTo:"https://efg-nutrition.onrender.com/pilot/"};';
const options={apiUrl:'http://127.0.0.1:54321',publishableKey:'sb_publishable_UNIT_TEST_ONLY_12345',origin:'http://127.0.0.1:4567'};
const transformed=localSdkEntrySource(source,options);
assert.ok(transformed.includes('https://esm.sh/@supabase/supabase-js@2.118.0'));
assert.ok(!transformed.includes('example.supabase.co'));
assert.ok(!transformed.includes('localClient'));
assert.ok(!transformed.includes('__PERSISTED_LOCAL__'));
assert.throws(()=>localSdkEntrySource(source,{...options,apiUrl:'https://example.supabase.co'}));
assert.throws(()=>localSdkEntrySource(source+'\nconst SUPABASE_URL="other";',options));
assert.throws(()=>localSdkEntrySource(source,{...options,publishableKey:'a.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.b'}));
assert.equal(localSdkEntryFlag('/efg-nutrition/pilot/coach-student-journey.js','export const COACH_STUDENT_JOURNEY_ENABLED=false;'),
 'export const COACH_STUDENT_JOURNEY_ENABLED=true;');
assert.equal(localSdkEntryFlag('/other.js','unchanged'),'unchanged');
console.log('PASS local source transform contract. No browser or SDK/network execution claimed.');

// Exercise every server transform against checkout sources, not lookalike fixtures.
// No HTTP server, browser, SQL, SDK request or runtime flag activation here.
const {readFileSync}=await import('node:fs');
const actual=name=>readFileSync(new URL('../pilot/'+name,import.meta.url),'utf8');
const flags={
 'legal-onboarding.js':'LEGAL_ONBOARDING_ENABLED',
 'coach-student-journey.js':'COACH_STUDENT_JOURNEY_ENABLED',
 'coach-legal-bridge.js':'COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED',
 'coach-plan-draft-client.js':'COACH_ATOMIC_PLAN_UI_ENABLED',
 'coach-release-plan-gate.js':'COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED',
 'coach-adapted-workspace.js':'COACH_ADAPTED_GUIDE_PREVIEW_ENABLED'
};
for(const [name,flag] of Object.entries(flags)){
 const original=actual(name),output=localSdkEntryFlag('/efg-nutrition/pilot/'+name,original);
 assert.equal(output,original.replace(new RegExp('export const '+flag+'\\s*=\\s*false;'),'export const '+flag+'=true;'),name);
 assert.notEqual(output,original,name+' must activate only in served test bytes');
 assert.throws(()=>localSdkEntryFlag('/efg-nutrition/pilot/'+name,original.replace(new RegExp('export const '+flag+'\\s*=\\s*false;'),'/* marker removed */')),name+' missing marker must fail');
}
const mode=actual('coach-versioned-mode.js');
assert.equal(localSdkEntryFlag('/efg-nutrition/pilot/coach-versioned-mode.js',mode),mode);
assert.match(mode,/export const COACH_VERSIONED_INTAKE_ENABLED=usesVersionedCoachIntake\(\{/);
assert.match(mode,/studentJourneyEnabled:COACH_STUDENT_JOURNEY_ENABLED/);
assert.match(mode,/return relaunchEnabled===true\|\|studentJourneyEnabled===true;/);
const pilot=actual('pilot.js');
for(const declarationPanel of [false,true]){
 const result=localSdkEntrySource(pilot,{...options,declarationPanel,official:{ids:Array.from({length:9},(_,i)=>'TEST_ONLY_'+i),template:[]}});
 assert.ok(result.includes('https://esm.sh/@supabase/supabase-js@2.118.0'));
 assert.ok(result.includes('const coachPersistedGuideSource=createPersistedGuideProvider('));
 assert.ok(result.includes('const coachBoundPublication=createBoundGuidePublication('));
 assert.ok(result.includes('emailRedirectTo:'+JSON.stringify(options.origin+'/efg-nutrition/pilot/')));
 assert.equal(result.includes('const sdkDeclaration=createStudentRestrictionDeclaration('),declarationPanel);
 assert.ok(!result.includes('const coachPersistedGuideSource=null;'));
 assert.ok(!result.includes('const coachBoundPublication=null;'));
}
console.log('PASS actual checkout markers: pilot source, six literal flags, derived versioned mode preserved. No browser/SQL execution.');
