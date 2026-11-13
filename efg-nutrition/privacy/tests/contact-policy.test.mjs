import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPolicy} from '../render-policy.mjs';
const policy=JSON.parse(await readFile(new URL('../policy-draft.json',import.meta.url),'utf8'));
const contact=JSON.parse(await readFile(new URL('../contact.json',import.meta.url),'utf8'));
test('renders the authorized public controller and support address',()=>{
 const html=renderPolicy(policy,contact);assert.match(html,/Eduardo Flores Grancelli/);assert.match(html,/mailto:floresgrancelli@gmail.com/);assert.match(html,/todavía no vigente/);
});
test('cannot publish an unfinished draft as current policy',()=>{
 assert.throws(()=>renderPolicy(policy,contact,{publish:true}),/sigue en revisión/);
 assert.throws(()=>renderPolicy({...policy,status:'approved',effectiveDate:'2026-11-13'},contact,{publish:true}),/sigue en revisión/);
 assert.match(renderPolicy({...policy,status:'approved'},contact),/todavía no vigente/);
});
test('rejects unconfirmed contact and escapes policy text',()=>{
 assert.throws(()=>renderPolicy(policy,{...contact,authorizedPublicContact:false}));
 const html=renderPolicy({...policy,sections:[{title:'<script>bad</script>',paragraphs:['<img src=x onerror=bad>']}]},contact);
 assert.ok(!html.includes('<script>bad'));assert.match(html,/&lt;img/);
});
test('no-session deletion contact is available without executing JavaScript',async()=>{
 const html=await readFile(new URL('../../pilot/eliminar-cuenta.html',import.meta.url),'utf8');
 assert.match(html,/id="support-contact"/);assert.match(html,/mailto:floresgrancelli@gmail.com\?subject=/);
 assert.match(html,/no confirma que el correo se haya enviado/);
});
