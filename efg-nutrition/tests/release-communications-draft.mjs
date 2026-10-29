import assert from "node:assert/strict";
import {RELEASE_COMMUNICATIONS_ENABLED,releaseVisibleTo,renderMajorReleaseAnnouncement,releaseAcknowledgment,renderWhatsNew,seenVersionRequest} from "../pilot/release-communications.js";
const base={id:"major_2026_01",version:"2026.11.1",phase:"announced",
 title:'Nueva etapa EFG Nutrition Pro <script>alert(1)</script>',
 roles:["admin","coach","student","personal"],
 highlights:["Fichas voluntarias y permisos","Semáforo por restricciones, no calorías","Dietas y guía de cinco comidas"]};
assert.equal(RELEASE_COMMUNICATIONS_ENABLED,false,"Never send messages or sign out real users via draft");
for(const role of base.roles){
 assert.equal(releaseVisibleTo(base,role),true);
 const html=renderMajorReleaseAnnouncement(base,role);
 assert.match(html,/Entendido, cerrar sesión/);
 assert.match(html,/data-act="ackReleaseAndSignOut"/);
 assert.match(html,/no constituye aceptación de Términos/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.deepEqual(releaseAcknowledgment(base,role),{release_id:base.id,acknowledgment_kind:"announcement_read"});
}
assert.equal(releaseVisibleTo(base,"visitor"),false);
assert.equal(renderMajorReleaseAnnouncement(base,"visitor"),"");
assert.throws(()=>releaseAcknowledgment(base,"visitor"),/comunicación activa/);
assert.equal(renderWhatsNew(base,"coach"),"");
const released={...base,phase:"live",title:"EFG Nutrition Pro renovada"};
assert.equal(renderMajorReleaseAnnouncement(released,"student"),"");
assert.match(renderWhatsNew(released,"student"),/Novedades de EFG Nutrition Pro/);
assert.match(renderWhatsNew(released,"coach"),/Comenzar/);
assert.equal(renderWhatsNew(released,"coach",[base.version]),"");
assert.deepEqual(seenVersionRequest(released,"personal"),{release_id:base.id,view_kind:"whats_new_seen"});
assert.throws(()=>seenVersionRequest(base,"student"),/no está publicada/);
for(const bad of [
 {...base,roles:["student"]},
 {...base,highlights:[]},
 {...base,id:"<script>"},
 {...base,phase:"active"}
])assert.throws(()=>renderMajorReleaseAnnouncement(bad,"student"),/Manifiesto/);
const ack=releaseAcknowledgment(base,"coach");
assert.equal("user_id" in ack,false);
assert.equal("legal_acceptance" in ack,false);
assert.equal("accepted_at" in ack,false);
console.log("PASS: release announcement + whats-new all roles, separate legal consent, safe no-action draft");
