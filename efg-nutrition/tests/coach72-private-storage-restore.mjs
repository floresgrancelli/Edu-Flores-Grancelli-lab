// COACH72 isolated synthetic QA; no real receipt bytes, names, credentials or network.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,mkdir,writeFile,rm,unlink,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {validatePrivateReceiptManifest,verifyPrivateReceiptRestore}
 from "../scripts/coach72-private-storage-restore-verify.mjs";
const root=await mkdtemp(join(tmpdir(),"efg-coach72-fixture-"));
const src=join(root,"source"),dst=join(root,"restored");
await mkdir(src);await mkdir(dst);
const examples=[["object_001.bin",Buffer.from("fake receipt A")],
 ["object_002.bin",Buffer.from("fake receipt B x")],
 ["object_003.bin",Buffer.from("fictional receipt C; NOT personal data")]];
const objects=examples.map(([file,b])=>({file,bytes:b.length,
 sha256:createHash("sha256").update(b).digest("hex")}));
const sum=objects.reduce((n,o)=>n+o.bytes,0);
const manifest={evidence_kind:"EFG_PRIVATE_STORAGE_RESTORE_V1",
 source_project:"cyjvddhimbsfipjfctsl",restored_project:"isolated_local_fixture",
 bucket:"efg-receipts",source_private:true,restored_private:true,
 expected_objects:3,expected_bytes:sum,objects};
try{
 for(const [f,b] of examples){await writeFile(join(src,f),b);await writeFile(join(dst,f),b);}
 assert.deepEqual(validatePrivateReceiptManifest(manifest),{objects:3,bytes:sum});
 let result=await verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:dst});
 assert.equal(result.source_and_restored_bytes_equal,true);
 assert.equal(result.scope,"OFFLINE_BYTES_ONLY_NOT_ACL_OR_RLS");
 for(const change of [
  x=>x.source_project="wrong",x=>x.restored_project=x.source_project,
  x=>x.restored_private=false,x=>x.source_private=false,x=>x.bucket="public",
  x=>x.expected_bytes++,x=>x.expected_objects--,
  x=>x.objects[0].file="../escape.bin",x=>x.objects[1].file=x.objects[0].file,
  x=>x.objects[0].sha256="x".repeat(64),x=>x.objects[0].bytes=0
 ]){
  const broken=structuredClone(manifest);change(broken);
  assert.throws(()=>validatePrivateReceiptManifest(broken),/COACH72 STOP/);
 }
 await assert.rejects(verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:src}),/COACH72 STOP/);
 // Flip bytes without changing length: SHA-256 MUST catch it (metadata size alone would not).
 const file=join(dst,examples[0][0]);await writeFile(file,Buffer.from("fake receipt Z"));
 await assert.rejects(verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:dst}),/COACH72 STOP/);
 await writeFile(file,examples[0][1]);
 await writeFile(join(dst,"unlisted.bin"),Buffer.from("unlisted"));
 await assert.rejects(verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:dst}),/COACH72 STOP/);
 await unlink(join(dst,"unlisted.bin"));
 await unlink(file);await symlink(join(src,examples[0][0]),file);
 await assert.rejects(verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:dst}),/COACH72 STOP/);
 await unlink(file);await writeFile(file,examples[0][1]);
 await rm(join(dst,examples[2][0]));
 await assert.rejects(verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:dst}),/COACH72 STOP/);
 result=await verifyPrivateReceiptRestore({manifest,sourceDir:src,restoredDir:join(root,"restored")}).catch(()=>null);
 assert.equal(result,null,"Restoration with one missing file fails");
 console.log("PASS COACH72 synthetic: source+restored bytes match signed SHA-256 inventory; missing, extra, altered, symlink and unsafe manifest fail closed. NOT a hosted backup or Storage ACL test.");
}finally{await rm(root,{recursive:true,force:true});}
