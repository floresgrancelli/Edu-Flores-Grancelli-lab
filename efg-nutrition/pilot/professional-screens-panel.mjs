import {PROFESSIONAL_SCREENS_RELEASE_ENABLED,createProfessionalScreens} from './professional-screens-candidate.mjs?v=ncc-professional-screens-r1-20261107';

// Separate professional UI. Mounted by the candidate frame only behind OFF gates; never the legacy message center.
export function mountProfessionalScreens({root,enabled=PROFESSIONAL_SCREENS_RELEASE_ENABLED,...options}={}) {
  if(!enabled)return Object.freeze({ready:Promise.resolve({disabled:true}),dispose(){},revalidate(){return false;}});
  const adapter=createProfessionalScreens({enabled,...options}),doc=root.ownerDocument;
  let disposed=false,busy=false,notice='Ensayo ficticio. No modifica el espacio personal.';
  const node=(tag,text)=>{const item=doc.createElement(tag);if(text)item.textContent=text;return item;};
  const stop=event=>event.stopPropagation();
  for(const kind of ['click','input','change','submit'])root.addEventListener(kind,stop);
  root.setAttribute('data-ncc-professional-screens','');
  root.setAttribute('aria-label','Pantallas profesionales candidatas');
  function button(parent,text,action,{keepEnabled=false}={}) {
    const item=node('button',text);item.type='button';item.disabled=busy&&!keepEnabled;
    item.addEventListener('click',()=>run(action));parent.append(item);return item;
  }
  function input(parent,labelText,tag,kind,value) {
    const label=node('label',labelText),control=node(tag);control.value=value;
    control.setAttribute('aria-label',labelText);control.maxLength=kind==='alias'?100:2000;control.disabled=busy;
    control.addEventListener('input',()=>{try{adapter.setDraft(kind,control.value);}catch(error){notice=error.message;}});
    label.append(control);parent.append(label);return control;
  }
  async function run(action) {
    if(busy||disposed)return;busy=true;render();
    try{await action();notice='Resultado verificado en la fixture ficticia.';}
    catch(error){notice=error.code==='STALE_CONTEXT'?'Se descartó una respuesta de otra vista.':error.message;}
    finally{busy=false;if(!disposed)render();}
  }
  function unavailable(message) {
    root.replaceChildren(node('h3','Pantallas profesionales cerradas'),node('p',message));
    button(root,'Volver a verificar',()=>adapter.open());
  }
  function render() {
    if(disposed)return;
    let state;try{state=adapter.snapshot();}catch(error){unavailable(error.message);return;}
    root.replaceChildren();root.className='ncc-professional-screen-candidate';
    root.append(node('h3','Espacio profesional · ensayo ficticio'));
    const status=node('p',notice);status.setAttribute('role','status');root.append(status);
    if(state.status!=='ready'){root.append(node('p','No hay contexto profesional cargado.'));
      button(root,'Consultar espacio ficticio',()=>adapter.open());return;}
    root.append(node('p','Tu rol personal sigue intacto. Alias, recetas y chats usan este espacio por separado.'));
    if(state.uncertain)root.append(node('p','Resultado anterior incierto: no se reintentará automáticamente.'));
    const alias=node('section');alias.append(node('h4','Alias profesional'),node('p','Alias actual: '+(state.organization.payment_alias||'Sin alias')));
    input(alias,'Nuevo alias ficticio','input','alias',state.aliasDraft);
    button(alias,'Guardar alias ficticio',()=>adapter.setAlias());root.append(alias);
    const studentLabel=node('label','Alumno del espacio profesional'),select=node('select');
    select.setAttribute('aria-label','Alumno del espacio profesional');select.disabled=busy;
    const blank=node('option','Elegí un alumno');blank.value='';blank.selected=!state.studentId;select.append(blank);
    for(const student of state.students.filter(row=>row.active&&row.consent_accepted)) {
      const option=node('option',student.nickname);option.value=student.user_id;option.selected=student.user_id===state.studentId;select.append(option);
    }
    select.addEventListener('change',()=>run(()=>adapter.selectStudent(select.value)));
    studentLabel.append(select);root.append(studentLabel);
    if(state.studentId) {
      const recipes=node('section');recipes.append(node('h4','Recetas compartidas'));
      button(recipes,'Consultar recetas ficticias',()=>adapter.loadRecipes());
      const list=node('ul');for(const recipe of state.recipes)list.append(node('li',recipe.name+' · '+recipe.portions+' porciones'));recipes.append(list);root.append(recipes);
      const messages=node('section');messages.append(node('h4','Conversación profesional'));
      button(messages,'Consultar mensajes ficticios',()=>adapter.loadMessages());
      const log=node('div');log.setAttribute('role','log');log.setAttribute('aria-label','Mensajes profesionales ficticios');
      for(const row of state.messages)log.append(node('p',(row.sender_id===state.scope.userId?'Vos: ':'Alumno: ')+row.body+(row.read_at?' · Leído':'')));
      messages.append(log);input(messages,'Mensaje ficticio','textarea','message',state.messageDraft);
      button(messages,'Enviar mensaje ficticio',()=>adapter.sendMessage());
      button(messages,'Confirmar lecturas ficticias',()=>adapter.markRead());root.append(messages);
    }
    button(root,'Cancelar borradores',()=>adapter.cancelDrafts());
    button(root,'Volver a consultar',()=>adapter.open());
  }
  const ready=adapter.open().then(()=>{render();return {disabled:false};}).catch(error=>{
    notice=error.message;render();return {error:error.code||'UNAVAILABLE'};
  });
  return Object.freeze({ready,adapter,revalidate(){if(disposed)return false;render();return true;},
    dispose(){disposed=true;adapter.dispose();for(const kind of ['click','input','change','submit'])root.removeEventListener(kind,stop);root.replaceChildren();}});
}
