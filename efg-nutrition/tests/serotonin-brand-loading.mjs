// EFG Nutrition Pro · static molecular brand loading gates. Not browser/physical QA.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {RELEASE_COMMUNICATIONS_ENABLED,renderMajorReleaseAnnouncement,renderWhatsNew} from "../pilot/release-communications.js";
const read=(f)=>readFileSync(new URL(f,import.meta.url),"utf8");
const html=read("../pilot/index.html");
const css=read("../pilot/serotonin-loading.css");
const release=read("../pilot/release-communications.js");
const doc=read("../docs/SEROTONIN_BRAND_LOADING_AND_MAJOR_RELEASE_20261029.md");
assert.ok(existsSync(new URL("../pilot/assets/serotonina-acuarela.avif",import.meta.url)),"Original watercolor brand asset must be present");
assert.match(html,/serotonin-loading\.css\?v=/,"Brand CSS loaded in app before JS");
assert.match(html,/efg-serotonin-stage/,"Load screen shows serotonina before pilot.js");
assert.match(html,/efg-serotonin-mark[^>]+serotonina-acuarela\.avif/,"Display authentic brand asset");
assert.match(html,/<div class="spin" role="status" aria-label="Cargando EFG Nutrition"><\/div>/,"Original accessible status retained");
assert.ok(html.indexOf("efg-serotonin-stage")<html.indexOf("pilot.js"),"App splash must be immediate");
assert.match(css,/body \.spin:not\(\.efg-unbranded-spinner\),\.efg-serotonin-spinner/,"All existing standard spinners use branded visual");
assert.match(css,/url\("\.\/assets\/serotonina-acuarela\.avif"\)/,"Spinner reuses local asset");
assert.match(css,/@media \(prefers-reduced-motion:reduce\)/,"Respect device motion setting");
assert.match(css,/animation:none!important/,"Reduced motion must turn off animation");
assert.match(css,/@media \(max-width:480px\)/,"Responsive mobile sizing");
assert.doesNotMatch(css,/@import|https?:\/\/|@keyframes\s+rotate\(/i,"No extra assets or animation libraries");
assert.equal(RELEASE_COMMUNICATIONS_ENABLED,false,"Never activate release while validation incomplete");
assert.match(release,/efg-serotonin-stage/,"Draft major release carries brand molecule");
const base={id:"efg_major_serotonin_01",version:"2026.11.1",phase:"preview",title:"Nuevo EFG Nutrition",roles:["admin","coach","student","personal"],highlights:["Guías alimentarias","Fichas de seguimiento"]};
for(const role of base.roles){
 const preview=renderMajorReleaseAnnouncement(base,role);
 const live=renderWhatsNew({...base,phase:"live"},role);
 assert.match(preview,/class="efg-serotonin-mark" src="\.\/assets\/serotonina-acuarela\.avif"/,"Preview includes original molecular brand");
 assert.match(live,/class="efg-serotonin-mark" src="\.\/assets\/serotonina-acuarela\.avif"/,"Release includes original molecular brand");
 assert.match(preview,/aria-hidden="true"/,"Decorative image is hidden from accessibility tree");
}
assert.match(doc,/NO GO/,"Document production release freeze");
assert.match(doc,/auditar y conectar cada indicador interno/i,"Do not claim all application loading states are finished");
console.log("PASS: authentic serotonin mark on first paint and major release (OFF), shared spinners, mobile/reduced motion (STATIC ONLY)");
