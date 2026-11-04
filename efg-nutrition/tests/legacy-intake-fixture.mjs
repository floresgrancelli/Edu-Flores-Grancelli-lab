import './approved-release-flags.mjs';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function legacyIntakeFixture(){
 const dir=mkdtempSync(join(tmpdir(),'ncc-legacy-intake-'));
 try{
  cpSync(new URL('../pilot/',import.meta.url),dir,{recursive:true});
  for(const [file,flag] of [['coach-student-journey.js','COACH_STUDENT_JOURNEY_ENABLED'],['coach-plan-draft-client.js','COACH_ATOMIC_PLAN_UI_ENABLED']]){
   const path=join(dir,file);writeFileSync(path,readFileSync(path,'utf8').replace(flag+'=true',flag+'=false'));
  }
  return await import(pathToFileURL(join(dir,'coach-intake-flow.js')));
 }finally{rmSync(dir,{recursive:true,force:true});}
}
