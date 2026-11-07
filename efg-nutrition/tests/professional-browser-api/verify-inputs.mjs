import {readFile,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,isAbsolute,join} from 'node:path';
import {HEAD,MODULE_HASHES,requireThat} from './policy.mjs';
export const root=fileURLToPath(new URL('./',import.meta.url));
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const versions=Object.freeze({'@supabase/supabase-js':'2.118.0',esbuild:'0.25.5',playwright:'1.56.1'});
export async function verifyCandidateFiles(candidateRoot=process.env.NCC_CANDIDATE_ROOT||resolve(root,'../../pilot')) {
  const base=await realpath(candidateRoot),files={};
  for(const [name,hash] of Object.entries(MODULE_HASHES)){
    const path=join(base,name),bytes=await readFile(path);requireThat(sha256(bytes)===hash,'MODULE_HASH_MISMATCH');files[name]={bytes,sha256:hash};
  }
  return {candidateModulesSourceHead:HEAD,files};
}
export async function verifyInstalledDependencies(modulePath=process.env.NCC_BRIDGE_NODE_MODULES) {
  requireThat(typeof modulePath==='string'&&isAbsolute(modulePath),'DEPENDENCY_DIRECTORY_REQUIRED');
  const modules=await realpath(modulePath),installRoot=dirname(modules);
  const manifest=JSON.parse(await readFile(join(installRoot,'package.json'),'utf8'));
  requireThat(JSON.stringify(manifest.dependencies)===JSON.stringify(versions),'DEPENDENCY_PINS_MISMATCH');
  const lockBytes=await readFile(join(installRoot,'package-lock.json')),lock=JSON.parse(lockBytes);
  requireThat(lock.lockfileVersion===3&&lock.packages&&Object.keys(lock.packages).length>4,'LOCKFILE_REQUIRED');
  requireThat(JSON.stringify(lock.packages[''].dependencies)===JSON.stringify(versions),'LOCKFILE_PINS_MISMATCH');
  const packages=[];
  for(const [path,p] of Object.entries(lock.packages)) {
    if(!path)continue;
    requireThat(/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(path)&&!path.includes('..'),'LOCK_PATH_REJECTED');
    requireThat(typeof p.version==='string'&&/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/.test(p.version),'LOCK_VERSION_REQUIRED');
    const u=new URL(p.resolved);
    requireThat(u.protocol==='https:'&&u.hostname==='registry.npmjs.org'&&!u.username&&!u.password&&!u.search&&!u.hash,'REGISTRY_REQUIRED');
    requireThat(/^sha512-[A-Za-z0-9+/]+=*$/.test(p.integrity||''),'PACKAGE_INTEGRITY_REQUIRED');
    let installed=false;
    try {
      const actual=JSON.parse(await readFile(join(installRoot,path,'package.json'),'utf8'));
      requireThat(actual.version===p.version,'INSTALLED_VERSION_MISMATCH');installed=true;
    }catch(error){if(error.code!=='ENOENT')throw error;requireThat(p.optional===true,'REQUIRED_PACKAGE_MISSING');}
    packages.push({path,version:p.version,integrity:p.integrity,installed});
  }
  for(const [name,version] of Object.entries(versions))requireThat(packages.some(p=>p.path==='node_modules/'+name&&p.version===version&&p.installed),'REQUIRED_PACKAGE_MISSING');
  packages.sort((a,b)=>a.path.localeCompare(b.path));
  return {modules,installRoot,lockSha256:sha256(lockBytes),packages,versions};
}
export async function verifyBundle(buildDirectory=process.env.NCC_BRIDGE_BUILD_DIR) {
  requireThat(typeof buildDirectory==='string'&&isAbsolute(buildDirectory),'BUILD_DIRECTORY_REQUIRED');
  const directory=await realpath(buildDirectory),report=JSON.parse(await readFile(join(directory,'build-report.json'),'utf8'));
  const sdk=await readFile(join(directory,'supabase-bundle.mjs'));
  requireThat(report.sdkVersion===versions['@supabase/supabase-js']&&report.esbuildVersion===versions.esbuild&&report.bundleSha256===sha256(sdk),'BUNDLE_MISMATCH');
  const dependencies=await verifyInstalledDependencies();requireThat(report.lockSha256===dependencies.lockSha256,'LOCKFILE_CHANGED');
  requireThat(JSON.stringify(report.packages)===JSON.stringify(dependencies.packages),'DEPENDENCY_CLOSURE_CHANGED');
  return {directory,sdk,report,dependencies};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const c=await verifyCandidateFiles(),d=await verifyInstalledDependencies();
    console.log(JSON.stringify({status:'PASS_INPUT_VERIFICATION',candidateModulesSourceHead:c.candidateModulesSourceHead,runCommit:process.env.GITHUB_SHA||null,moduleHashes:MODULE_HASHES,lockSha256:d.lockSha256,lockedPackages:d.packages.length,versions:d.versions}));
  }catch{console.log(JSON.stringify({status:'INPUT_VERIFICATION_FAILED'}));process.exitCode=1;}
}
