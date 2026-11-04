import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync(new URL('./activation-manifest.json',import.meta.url),'utf8'));
assert.ok(process.argv[2],'Usage: node check-activation.mjs PATH_TO_BASE_CHECKOUT');
const root=resolve(process.argv[2]);
for(const f of manifest.files){
 const b=readFileSync(resolve(root,f.path));
 const hash=createHash('sha1').update(Buffer.from('blob '+b.length+String.fromCharCode(0))).update(b).digest('hex');
 assert.equal(hash,f.gitBlob,'SOURCE_DRIFT: '+f.path);
 assert.ok(b.toString().includes('export const '+f.flag+'=false;'),'FLAG_DRIFT: '+f.flag);
}
console.log(JSON.stringify({status:'BASE_INTEGRITY_PASS_NOT_GO',files:manifest.files.length,base:manifest.candidate,writes:0}));
