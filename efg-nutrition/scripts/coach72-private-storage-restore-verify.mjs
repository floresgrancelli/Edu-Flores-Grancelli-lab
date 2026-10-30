// COACH72 — OFFLINE byte-level private receipt restore verifier.
// This is NOT a Storage export tool: stage files must be obtained securely,
// outside GitHub/CI, with independently verified private access controls.
// No network, no database writes, no receipt filenames or hashes logged.
import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {lstat,readFile,readdir,realpath} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";

const SOURCE="cyjvddhimbsfipjfctsl",BUCKET="efg-receipts";
const HEX=/^[a-f0-9]{64}$/i, SAFE=/^[a-zA-Z0-9_-]{1,72}\.bin$/;
const inside=(child,parent)=>child===parent||child.startsWith(parent+sep);

export function validatePrivateReceiptManifest(m){
 const fail=()=>{throw Error("COACH72 STOP: invalid/incomplete private-storage inventory");};
 if(!m||m.evidence_kind!=="EFG_PRIVATE_STORAGE_RESTORE_V1"||
    m.source_project!==SOURCE||typeof m.restored_project!=="string"||
    m.restored_project.length<5||m.restored_project===SOURCE||
    m.bucket!==BUCKET||m.source_private!==true||m.restored_private!==true||
    !Array.isArray(m.objects)||m.objects.length<1)fail();
 const names=new Set();
 let bytes=0;
 for(const o of m.objects){
  if(!o||typeof o.file!=="string"||!SAFE.test(o.file)||
     names.has(o.file)||!Number.isSafeInteger(o.bytes)||o.bytes<=0||
     typeof o.sha256!=="string"||!HEX.test(o.sha256))fail();
  names.add(o.file);bytes+=o.bytes;
  if(!Number.isSafeInteger(bytes))fail();
 }
 if(m.expected_objects!==m.objects.length||m.expected_bytes!==bytes)fail();
 return {objects:m.objects.length,bytes};
}
async function hash(file){
 const h=createHash("sha256");let size=0;
 for await(const data of createReadStream(file)){size+=data.length;h.update(data);}
 return {bytes:size,sha256:h.digest("hex")};
}
async function checkedDirectory(d){
 if(typeof d!=="string"||!d.startsWith("/"))throw Error("COACH72 STOP: absolute local directories required");
 const st=await lstat(d);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error("COACH72 STOP: real local directory required");
 return realpath(d);
}
export async function verifyPrivateReceiptRestore({manifest,sourceDir,restoredDir}={}){
 const summary=validatePrivateReceiptManifest(manifest);
 const src=await checkedDirectory(sourceDir),dst=await checkedDirectory(restoredDir);
 if(src===dst||inside(src,dst)||inside(dst,src))throw Error("COACH72 STOP: source and restored evidence must be independent");
 const expected=new Set(manifest.objects.map(o=>o.file));
 // Any unlisted file (or missing file) makes a purported complete inventory fail.
 for(const dir of [src,dst]){
  const names=await readdir(dir);
  if(names.length!==expected.size||names.some(n=>!expected.has(n)))
   throw Error("COACH72 STOP: incomplete or extra receipt bytes");
 }
 for(const o of manifest.objects){
  const sourceFile=resolve(src,o.file),restoredFile=resolve(dst,o.file);
  const hashes=[];
  for(const [dir,name] of [[src,sourceFile],[dst,restoredFile]]){
   if(!inside(name,dir))throw Error("COACH72 STOP: invalid file path");
   const st=await lstat(name);
   if(!st.isFile()||st.isSymbolicLink()||st.size!==o.bytes)
    throw Error("COACH72 STOP: missing/replaced receipt or incorrect length");
   hashes.push({dev:st.dev,ino:st.ino});
   const actual=await hash(name);
   if(actual.bytes!==o.bytes||actual.sha256.toLowerCase()!==o.sha256.toLowerCase())
    throw Error("COACH72 STOP: restored receipt SHA-256 mismatch");
  }
  // Two directory entries hardlinked to the SAME inode are not independent backups.
  if(hashes[0].dev===hashes[1].dev&&hashes[0].ino===hashes[1].ino)
   throw Error("COACH72 STOP: source and destination are the same physical file");
 }
 return {verified_objects:summary.objects,verified_bytes:summary.bytes,
  source_and_restored_bytes_equal:true,scope:"OFFLINE_BYTES_ONLY_NOT_ACL_OR_RLS"};
}
async function main(){
 if(process.env.CI==="true"||process.env.GITHUB_ACTIONS==="true"||
    process.env.EFG_RESTORE_MANUAL_ACK!=="I_ACCEPT_LOCAL_PRIVATE_RESTORE")
  throw Error("COACH72 STOP: manual private restore verification only; NEVER in CI");
 const [mfile,sdir,ddir]=process.argv.slice(2);
 if(!mfile||!sdir||!ddir)throw Error("COACH72 STOP: manifest, sourceDir and restoredDir required");
 const project=await realpath(resolve(fileURLToPath(new URL("../../",import.meta.url))));
 const dirs=await Promise.all([mfile,sdir,ddir].map(async p=>realpath(resolve(p))));
 if(dirs.some(d=>inside(d,project)))throw Error("COACH72 STOP: private evidence cannot live in the repository");
 const manifest=JSON.parse(await readFile(mfile,"utf8"));
 const result=await verifyPrivateReceiptRestore({manifest,sourceDir:sdir,restoredDir:ddir});
 // Do not print paths, hashes, object names or users.
 console.log("COACH72 OFFLINE BYTES VERIFIED:",result.verified_objects,"objects,",result.verified_bytes,
  "bytes. IMPORTANT: private bucket ACL, DB+Auth parity, hosted RLS and rollback remain unverified.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(String(e.message||e).slice(0,170));process.exitCode=2;});
}
