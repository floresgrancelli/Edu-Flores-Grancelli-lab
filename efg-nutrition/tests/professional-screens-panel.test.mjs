import test from 'node:test';
import {createProfessionalMutationGuard} from '../pilot/professional-screens-candidate.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {createProfessionalMutationJournal,createMemoryJournalDriver} from '../pilot/professional-mutation-journal.mjs?v=ncc-professional-reconciliation-r1-20261107';
import assert from 'node:assert/strict';
import {mountProfessionalScreens} from '../pilot/professional-screens-panel.mjs?v=ncc-professional-reconciliation-r1-20261107';
import {createProfessionalFixture,IDS} from './professional-screens-fixture.mjs';
class Element {
 constructor(tag,document){this.tag=tag;this.ownerDocument=document;this.children=[];this.listeners={};this.attributes={};this.textContent='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(kind,callback){this.listeners[kind]=callback;}
 removeEventListener(kind,callback){if(this.listeners[kind]===callback)delete this.listeners[kind];}
}
const descendants=root=>root.children.flatMap(item=>[item,...descendants(item)]);
const button=(root,label)=>descendants(root).find(item=>item.tag==='button'&&item.textContent===label);
const field=(root,label)=>descendants(root).find(item=>item.attributes['aria-label']===label);
const text=root=>[root.textContent,...root.children.map(text)].join('\n');
function setup(){const document={createElement:tag=>new Element(tag,document)},root=new Element('section',document),fixture=createProfessionalFixture();
 const options={root,enabled:true,syntheticEnvironment:()=>true,mutationGuard:fixture.mutationGuard,
  transport:fixture.transport,readSession:fixture.readSession,readWorkspace:fixture.readWorkspace};return {root,fixture,options};}
function fill(root,label,value){const input=field(root,label);input.value=value;input.listeners.input();}
 test('OFF mount creates no controls, adapter or listeners',async()=>{
  const {root,options}=setup();delete options.enabled;const panel=mountProfessionalScreens(options);
  assert.deepEqual(await panel.ready,{disabled:true});assert.equal(root.children.length,0);assert.deepEqual(root.listeners,{});assert.equal(panel.adapter,undefined);
 });
 test('panel handles alias, recipes, message and receipts with unchanged personal profile',async()=>{
  const {root,fixture,options}=setup(),before=fixture.personalSnapshot();const panel=mountProfessionalScreens(options);await panel.ready;
  fill(root,'Nuevo alias ficticio','ALIAS.DEMO');await button(root,'Guardar alias ficticio').listeners.click();assert.match(text(root),/Alias actual: ALIAS.DEMO/);
  const select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();
  await button(root,'Consultar recetas ficticias').listeners.click();assert.match(text(root),/Receta FICTICIA/);
  await button(root,'Consultar mensajes ficticios').listeners.click();assert.match(text(root),/Consulta FICTICIA/);
  fill(root,'Mensaje ficticio','<img src=x> FICTICIO');await button(root,'Enviar mensaje ficticio').listeners.click();
  assert.match(text(root),/<img src=x> FICTICIO/);assert.equal(descendants(root).filter(item=>item.tag==='img').length,0);
  await button(root,'Confirmar lecturas ficticias').listeners.click();assert.match(text(root),/Consulta FICTICIA · Leído/);
  assert.deepEqual(fixture.personalSnapshot(),before);panel.dispose();assert.equal(root.children.length,0);assert.deepEqual(root.listeners,{});
 });
 test('panel stops legacy event bubbling and supports explicit cancel',async()=>{
  const {root,options}=setup();const panel=mountProfessionalScreens(options);await panel.ready;let stopped=0;
  for(const kind of ['click','input','change','submit'])root.listeners[kind]({stopPropagation(){stopped++;}});
  assert.equal(stopped,4);fill(root,'Nuevo alias ficticio','PENDIENTE.DEMO');
  await button(root,'Volver a consultar').listeners.click();assert.match(text(root),/Guardá o cancelá/);
  await button(root,'Cancelar borradores').listeners.click();await button(root,'Volver a consultar').listeners.click();
  assert.equal(field(root,'Nuevo alias ficticio').value,'');panel.dispose();
 });
 test('context change revalidation removes old controls and private text',async()=>{
  const {root,fixture,options}=setup();const panel=mountProfessionalScreens(options);await panel.ready;
  fixture.navigate(false);panel.revalidate();assert.match(text(root),/Pantallas profesionales cerradas/);assert.equal(field(root,'Nuevo alias ficticio'),undefined);panel.dispose();
 });
 test('host-owned guard survives actual panel dispose and remount after uncertain send',async()=>{
  const {root,fixture,options}=setup();let attempts=0;const base=fixture.transport.perform;
  options.transport={kind:fixture.transport.kind,perform:async(action,args,scope)=>{
   if(action==='sendMessage'){attempts++;await base(action,args,scope);throw Error('Synthetic uncertain result');}return base(action,args,scope);
  }};
  const panel=mountProfessionalScreens(options);await panel.ready;
  let select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();
  fill(root,'Mensaje ficticio','MENSAJE FICTICIO');await button(root,'Enviar mensaje ficticio').listeners.click();panel.dispose();
  const next=mountProfessionalScreens(options);await next.ready;select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();
  fill(root,'Mensaje ficticio','MENSAJE FICTICIO');await button(root,'Enviar mensaje ficticio').listeners.click();
  assert.match(text(root),/resultado anterior es incierto/);assert.equal(attempts,1);assert.equal(fixture.db.messages.length,2);next.dispose();
 });

 test('zero-row read response is never reported as a generic success',async()=>{
  const {root,fixture,options}=setup();const base=fixture.transport.perform;options.transport={kind:fixture.transport.kind,perform:(a,args,s)=>a==='markRead'?{data:[]}:base(a,args,s)};
  const panel=mountProfessionalScreens(options);await panel.ready;const select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();
  await button(root,'Consultar mensajes ficticios').listeners.click();await button(root,'Confirmar lecturas ficticias').listeners.click();assert.match(text(root),/No se recibieron confirmaciones de lectura/);assert.doesNotMatch(text(root),/Consulta FICTICIA · Leído/);
 });
 test('reload panel disables pending send and offers only exact readback, never automatic resend',async()=>{
  const {root,fixture,options}=setup(),storage={value:{version:1,records:[]}},base=fixture.transport.perform;
  const journal=()=>createProfessionalMutationJournal({enabled:true,syntheticEnvironment:()=>true,backendNamespace:'fixture:panel-reload',driver:createMemoryJournalDriver({state:storage})});
  options.reconciliationEnabled=true;options.mutationGuard=createProfessionalMutationGuard({journal:journal()});options.transport={kind:fixture.transport.kind,perform:async(a,args,s)=>{const result=await base(a,args,s);if(a==='sendMessage')throw Error('Lost');return result;}};
  const first=mountProfessionalScreens(options);await first.ready;let select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();fill(root,'Mensaje ficticio','PENDIENTE FICTICIO');await button(root,'Enviar mensaje ficticio').listeners.click();first.dispose();
  options.mutationGuard=createProfessionalMutationGuard({journal:journal()});options.transport=fixture.transport;const next=mountProfessionalScreens(options);await next.ready;select=field(root,'Alumno del espacio profesional');select.value=IDS.pupil;await select.listeners.change();
  assert.equal(button(root,'Enviar mensaje ficticio').disabled,true);await button(root,'Verificar envío pendiente').listeners.click();assert.match(text(root),/Mensaje anterior confirmado sin reenviar/);assert.equal(button(root,'Enviar mensaje ficticio').disabled,false);assert.equal(fixture.count.sendMessage,1);assert.equal(storage.value.records.length,0);
 });
