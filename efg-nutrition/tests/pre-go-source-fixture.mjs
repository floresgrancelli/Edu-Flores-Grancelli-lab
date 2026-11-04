import './approved-release-flags.mjs';
import {mkdtempSync,rmSync,cpSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
export function createPreGoFixture(){
const sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
const repoRoot=mkdtempSync(join(tmpdir(),'ncc-pre-go-fixture-'));
process.on('exit',()=>rmSync(repoRoot,{recursive:true,force:true}));
cpSync(join(sourceRoot,'efg-nutrition'),join(repoRoot,'efg-nutrition'),{recursive:true});
const approved=JSON.parse(readFileSync(join(sourceRoot,'efg-nutrition/docs/p30k-closure/asset-manifest.json'),'utf8'));
for(const item of approved.activationFlags){
 const path=join(repoRoot,item.file);writeFileSync(path,readFileSync(path,'utf8').replace(item.flag+'=true;',item.flag+'=false;'));
}
execFileSync('git',['init','-q'],{cwd:repoRoot});
execFileSync('git',['add','efg-nutrition'],{cwd:repoRoot});
execFileSync('git',['-c','user.name=NCC QA','-c','user.email=qa@example.invalid','commit','-qm','Isolated pre-GO fixture'],{cwd:repoRoot});
return repoRoot;
}
