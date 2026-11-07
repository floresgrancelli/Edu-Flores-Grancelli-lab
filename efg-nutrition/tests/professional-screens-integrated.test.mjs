import test from 'node:test';
import assert from 'node:assert/strict';
import {createDualWorkspaceFrame} from '../pilot/dual-workspace-frame.mjs?v=ncc-professional-screens-r1-20261107';
import {API} from '../pilot/dual-workspace-candidate.mjs';
import {createProfessionalFixture,IDS} from './professional-screens-fixture.mjs';
class Element {
 constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.isConnected=true;this.textContent='';this.value='';}
 append(...nodes){for(const node of nodes){node.parent=this;node.isConnected=true;this.children.push(node);}}
 prepend(...nodes){for(const node of nodes){node.parent=this;node.isConnected=true;}this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){this.listeners[k]=fn;}
 removeEventListener(k,fn){if(this.listeners[k]===fn)delete this.listeners[k];}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;this.isConnected=false;}
 matches(selector){return selector.split(',').some(s=>s===this.tag||s.startsWith('[')&&Object.hasOwn(this.attrs,s.slice(1,-1)));}
 closest(selector){for(let e=this;e;e=e.parent)if(e.matches(selector))return e;return null;}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const nodes=root=>root.children.flatMap(n=>[n,...nodes(n)]);
const button=(root,name)=>nodes(root).find(n=>n.tag==='button'&&n.textContent===name);
const field=(root,name)=>nodes(root).find(n=>n.attrs['aria-label']===name);
const text=root=>[root.textContent,...root.children.map(text)].join('\n');
function makeFrame(doc){const root=new Element('main',doc),slot=new Element('div',doc),personal=new Element('div',doc),nav=new Element('button',doc);
 slot.setAttribute('data-ncc-dual-slot','');personal.setAttribute('data-ncc-personal-content','');nav.setAttribute('data-tab','home');root.append(slot,personal,nav);
 const query=root.querySelectorAll.bind(root);root.querySelectorAll=s=>s==='.pilot-nav [data-tab]'?[nav]:query(s);return {root,personal,slot,nav};}
function harness({screens=true,transportTransform=x=>x}={}){
 const fixture=createProfessionalFixture(),doc={createElement:tag=>new Element(tag,doc)},layout=makeFrame(doc),calls=[],nav={listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}};
 const rpc=async(name,args)=>{
  calls.push({name,args});const db=fixture.db;
  if(name===API.contexts)return {data:{user_id:IDS.dual,profile_role:db.profile.role,active:db.profile.active,
   student_context:db.profile.role==='student'?{organization_id:IDS.personal,coach_id:IDS.mentor,consent_accepted:true}:null,
   coach_contexts:db.capability?[{...db.organization,active_students:2,pending_invitations:0}]:[]}};
  if(name===API.roster)return {data:structuredClone(db.students)};
  throw Error('Unexpected mutation '+name);
 };
 let transportCalls=0;
 const frame=createDualWorkspaceFrame({enabled:true,professionalScreensEnabled:screens,readSession:fixture.readSession,rpc,
  readLegacyPersonal:()=>({profile:fixture.db.profile,organization:fixture.db.personalOrganization}),navigationTarget:nav,
  syntheticEnvironment:()=>true,createScreenTransport:({readContext})=>{transportCalls++;calls.push({scope:readContext()});return transportTransform(fixture.transport);}});
 return {fixture,layout,frame,calls,nav,doc,get transportCalls(){return transportCalls;}};
}
async function openProfessional(h){h.frame.mountFrame(h.layout.root);await h.frame.ready();const select=field(h.layout.root,'Espacio personal o profesional');select.value='coach:'+IDS.professional;select.listeners.change();await h.frame.ready();}
async function selectPupil(h){const select=field(h.layout.root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();}
function fill(h,label,value){const item=field(h.layout.root,label);item.value=value;item.listeners.input();}
 test('dual ON with screens OFF leaves factory untouched and legacy closure visible',async()=>{
  const h=harness({screens:false});await openProfessional(h);assert.equal(h.transportCalls,0);assert.equal(field(h.layout.root,'Nuevo alias ficticio'),undefined);
  assert.match(text(h.layout.root),/siguen cerrados hasta integrar/);
 });
 test('actual frame, gateway and dual panel mount separate screens without role mutation',async()=>{
  const h=harness(),before=h.fixture.personalSnapshot();await openProfessional(h);assert.ok(field(h.layout.root,'Nuevo alias ficticio'));
  assert.equal(h.layout.personal.hidden,true);assert.equal(h.layout.personal.inert,true);assert.equal(h.layout.nav.disabled,true);
  const scope=h.calls.find(x=>x.scope).scope;assert.equal(scope.userId,IDS.dual);assert.equal(scope.organizationId,IDS.professional);assert.equal(scope.sessionEpoch,1);assert.ok(scope.navigationEpoch>=2);
  fill(h,'Nuevo alias ficticio','INTEGRADO.DEMO');await button(h.layout.root,'Guardar alias ficticio').listeners.click();
  await selectPupil(h);await button(h.layout.root,'Consultar recetas ficticias').listeners.click();assert.match(text(h.layout.root),/Receta FICTICIA/);
  assert.deepEqual(h.fixture.personalSnapshot(),before);
 });
 test('workspace selector respects screen drafts and cancellation',async()=>{
  const h=harness();await openProfessional(h);await selectPupil(h);fill(h,'Mensaje ficticio','Borrador FICTICIO');
  let select=field(h.layout.root,'Espacio personal o profesional');select.value='student';select.listeners.change();
  assert.match(text(h.layout.root),/Guardá o cancelá/);assert.equal(h.layout.personal.hidden,true);assert.equal(field(h.layout.root,'Mensaje ficticio').value,'Borrador FICTICIO');
  await button(h.layout.root,'Cancelar borradores').listeners.click();select=field(h.layout.root,'Espacio personal o profesional');select.value='student';select.listeners.change();
  assert.equal(h.layout.personal.hidden,false);assert.equal(field(h.layout.root,'Nuevo alias ficticio'),undefined);
 });
 test('repeated real app frame reuse preserves mounted screen state and drafts',async()=>{
  const h=harness();await openProfessional(h);fill(h,'Nuevo alias ficticio','BORRADOR.DEMO');
  const next=makeFrame(h.doc);h.frame.prepareFrame();h.frame.mountFrame(next.root);h.layout=next;
  assert.equal(h.transportCalls,1);assert.equal(field(next.root,'Nuevo alias ficticio').value,'BORRADOR.DEMO');assert.equal(next.personal.hidden,true);
 });
 test('parent roster repaint preserves screen drafts and enabled controls',async()=>{
  const h=harness();await openProfessional(h);fill(h,'Nuevo alias ficticio','BORRADOR.DEMO');await button(h.layout.root,'Consultar lista básica').listeners.click();
  assert.equal(h.transportCalls,1);assert.equal(field(h.layout.root,'Nuevo alias ficticio').value,'BORRADOR.DEMO');assert.equal(button(h.layout.root,'Guardar alias ficticio').disabled,false);
 });
 test('popstate closes cached professional data and remounts the personal chooser',async()=>{
  const h=harness();await openProfessional(h);await selectPupil(h);await button(h.layout.root,'Consultar mensajes ficticios').listeners.click();
  h.nav.listeners.popstate();await h.frame.ready();assert.equal(field(h.layout.root,'Mensaje ficticio'),undefined);assert.equal(h.layout.personal.hidden,false);assert.equal(h.fixture.db.profile.role,'student');
 });
 test('pagehide invalidates and removes professional panel without reopening it',async()=>{
  const h=harness();await openProfessional(h);h.nav.listeners.pagehide();assert.equal(h.layout.slot.children.length,0);assert.equal(h.frame.isProfessional(),false);
 });
 test('bfcache pageshow restores a fresh personal chooser without cached screens',async()=>{
  const h=harness();await openProfessional(h);fill(h,'Nuevo alias ficticio','VIEJO.DEMO');const before=h.calls.filter(c=>c.name===API.contexts).length;
  h.nav.listeners.pagehide();h.nav.listeners.pageshow({persisted:true});await h.frame.ready();
  assert.ok(field(h.layout.root,'Espacio personal o profesional'));assert.equal(field(h.layout.root,'Nuevo alias ficticio'),undefined);assert.equal(h.layout.personal.hidden,false);
  assert.equal(h.calls.filter(c=>c.name===API.contexts).length,before+1);
 });
 test('ordinary pageshow preserves current screens without a duplicate load',async()=>{
  const h=harness();await openProfessional(h);fill(h,'Nuevo alias ficticio','ACTUAL.DEMO');const before=h.calls.length;
  h.nav.listeners.pageshow({persisted:false});await h.frame.ready();assert.equal(field(h.layout.root,'Nuevo alias ficticio').value,'ACTUAL.DEMO');assert.equal(h.calls.length,before);
 });
 test('logout/relogin session epoch clears active screen and stale drafts',async()=>{
  const h=harness();await openProfessional(h);fill(h,'Nuevo alias ficticio','VIEJO.DEMO');h.fixture.session.epoch++;
  h.frame.revalidate();h.frame.mountFrame(h.layout.root);await h.frame.ready();assert.equal(field(h.layout.root,'Nuevo alias ficticio'),undefined);assert.equal(h.layout.personal.hidden,false);
 });
 test('host mutation guard blocks duplicate writes across actual frame invalidation',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const h=harness({transportTransform:t=>({kind:t.kind,perform:async(a,args,s)=>{const r=await t.perform(a,args,s);if(a==='sendMessage')await pending;return r;}})});
  await openProfessional(h);await selectPupil(h);fill(h,'Mensaje ficticio','UNO FICTICIO');const sending=button(h.layout.root,'Enviar mensaje ficticio').listeners.click();
  h.fixture.session.epoch++;h.frame.revalidate();await openProfessional(h);await selectPupil(h);fill(h,'Mensaje ficticio','UNO FICTICIO');
  await button(h.layout.root,'Enviar mensaje ficticio').listeners.click();assert.equal(h.fixture.count.sendMessage,1);
  release();await sending;await button(h.layout.root,'Enviar mensaje ficticio').listeners.click();
  assert.match(text(h.layout.root),/resultado anterior es incierto/);assert.equal(h.fixture.count.sendMessage,1);
 });
