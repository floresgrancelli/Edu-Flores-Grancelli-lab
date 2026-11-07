// CI-only build from the complete npm-installed SDK; never a CDN parity claim.
import {mkdir,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join,isAbsolute,resolve,sep} from 'node:path';
import {verifyInstalledDependencies,sha256,root} from './verify-inputs.mjs';
import {requireThat} from './policy.mjs';
export async function buildSdk() {
  requireThat(process.env.GITHUB_ACTIONS==='true'&&process.platform==='linux'&&process.env.NCC_SYNTHETIC_BROWSER_API==='1','CI_BUILD_ONLY');
  const deps=await verifyInstalledDependencies(),out=process.env.NCC_BRIDGE_BUILD_DIR;
  requireThat(typeof out==='string'&&isAbsolute(out)&&!resolve(out).startsWith(resolve(root)+sep),'EXTERNAL_BUILD_DIRECTORY_REQUIRED');
  await mkdir(out,{recursive:true});
  const loaded=await import(pathToFileURL(join(deps.modules,'esbuild/lib/main.js')).href),esbuild=loaded.default||loaded;
  requireThat(esbuild.version===deps.versions.esbuild,'ESBUILD_VERSION_MISMATCH');
  const result=await esbuild.build({stdin:{contents:'export {createClient} from "@supabase/supabase-js";\nexport const sdkVersion="2.118.0";\n',resolveDir:deps.installRoot,sourcefile:'ncc-sdk-entry.mjs',loader:'js'},
    nodePaths:[deps.modules],bundle:true,platform:'browser',format:'esm',target:['es2022'],write:false,metafile:true,logLevel:'silent',legalComments:'none',sourcemap:false});
  requireThat(result.outputFiles?.length===1,'SDK_BUILD_OUTPUT_MISMATCH');
  const bytes=result.outputFiles[0].contents;
  const inputs=Object.keys(result.metafile.inputs).sort();
  requireThat(inputs.some(p=>p.includes('@supabase/supabase-js')),'SDK_SOURCE_MISSING');
  // No runtime CDN/import fallback. esbuild resolves the complete npm graph.
  requireThat(Object.values(result.metafile.outputs).every(o=>o.imports.length===0),'EXTERNAL_RUNTIME_IMPORT_REJECTED');
  const report={scope:'CI generated browser bundle from npm SDK, not a published browser bundle or esm.sh parity',sdkVersion:deps.versions['@supabase/supabase-js'],esbuildVersion:deps.versions.esbuild,
    lockSha256:deps.lockSha256,packages:deps.packages,bundleSha256:sha256(bytes),bundleBytes:bytes.length,inputCount:inputs.length};
  await writeFile(join(out,'supabase-bundle.mjs'),bytes);await writeFile(join(out,'build-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{console.log(JSON.stringify({build:await buildSdk()}));}catch{console.log(JSON.stringify({status:'BUILD_FAILED',code:'SDK_BUILD_OR_PROVENANCE_REJECTED'}));process.exitCode=1;}
}
