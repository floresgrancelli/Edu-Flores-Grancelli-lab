import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {exportPrivacy} from '../scripts/export-public-privacy.mjs';
const body='Documento sintético para probar la exportación; no es una política real. '.repeat(6)+'<script>alert(1)</script>';
const doc=()=>({kind:'privacy',is_current:true,published_at:'2026-11-13T16:00:00Z',version:'qa_only',body,sha256:createHash('sha256').update(body).digest('hex')});
test('exports reviewed content as escaped public HTML without login',()=>{
 const html=exportPrivacy(doc());assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));assert.match(html,/eliminar-cuenta.html/);
});
test('refuses unpublished, non-current, or altered text',()=>{
 for(const patch of [{is_current:false},{published_at:null},{kind:'terms'},{body:body+'changed'}])assert.throws(()=>exportPrivacy({...doc(),...patch}));
});
test('refuses unfinished policy even when its hash matches',()=>{
 const d=doc();d.body+=' [EMAIL OFICIAL]';d.sha256=createHash('sha256').update(d.body).digest('hex');assert.throws(()=>exportPrivacy(d),/borrador/);
});
