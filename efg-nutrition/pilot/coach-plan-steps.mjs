// Presentation-only journey. Switching steps neither reads nor writes a plan.
export function mountCoachPlanSteps({root,initial=0,available=[true,true,true,true],onChange=()=>{}}){
 const doc=root.ownerDocument,labels=['Ficha recibida','Objetivos','Dieta Guía','Revisar y enviar'];
 const host=doc.createElement('section');host.className='ncc-plan-journey';host.setAttribute('aria-label','Preparar el plan del alumno');
 const nav=doc.createElement('nav');nav.className='ncc-plan-steps';nav.setAttribute('aria-label','Pasos para preparar el plan');
 const body=doc.createElement('div'),panels=[],buttons=[];body.className='ncc-plan-step-body';
 let current=Math.max(0,Math.min(3,initial));if(!available[current])current=0;
 const show=(index,{focus=true}={})=>{if(!available[index])return;current=index;
  panels.forEach((p,i)=>{p.hidden=i!==current;p.inert=i!==current;});
  buttons.forEach((b,i)=>{b.setAttribute('aria-current',i===current?'step':'false');});
  back.disabled=current===0;next.hidden=current===3;next.disabled=!available[current+1];next.textContent=['Continuar a objetivos','Continuar a Dieta Guía','Revisar y enviar'][current]||'';
  host.dataset.planStep=String(current);onChange(current);
  if(focus){panels[current].focus({preventScroll:true});host.scrollIntoView?.({block:'start',behavior:'instant'});}
 };
 labels.forEach((text,i)=>{const b=doc.createElement('button');b.type='button';b.textContent=(i+1)+'. '+text;b.disabled=!available[i];b.addEventListener('click',()=>show(i));nav.append(b);buttons.push(b);
  const p=doc.createElement('div');p.className='ncc-plan-step';p.tabIndex=-1;p.setAttribute('role','region');p.setAttribute('aria-label',text);body.append(p);panels.push(p);
 });
 const footer=doc.createElement('div');footer.className='ncc-plan-step-actions';
 const back=doc.createElement('button');back.type='button';back.className='btn ghost';back.textContent='Paso anterior';back.addEventListener('click',()=>show(current-1));
 const next=doc.createElement('button');next.type='button';next.className='btn';next.addEventListener('click',()=>show(current+1));footer.append(back,next);
 host.append(nav,body,footer);root.append(host);show(current,{focus:false});
 return Object.freeze({panels,show,element:host});
}
