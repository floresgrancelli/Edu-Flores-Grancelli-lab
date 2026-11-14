// Intake estimates only. No diagnosis, supplement recommendations or data writes.
export const MICRO_NUTRIENTS = Object.freeze([
 {id:'magnesium',name:'Magnesio',unit:'mg',source:'Magnesium'},
 {id:'calcium',name:'Calcio',unit:'mg',source:'Calcium'},
 {id:'ala',name:'Omega-3 ALA',unit:'g',source:'Omega3FattyAcids'},
 {id:'iron',name:'Hierro',unit:'mg',source:'Iron'},
 {id:'zinc',name:'Zinc',unit:'mg',source:'Zinc'},
 {id:'b12',name:'Vitamina B12',unit:'µg',source:'VitaminB12'},
 {id:'epa_dha',name:'EPA + DHA',unit:'mg',source:'Omega3FattyAcids'},
]);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const own=(o,k)=>!!o&&Object.hasOwn(o,k);
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function micronutrientReferences(profile){
 const empty=Object.fromEntries(MICRO_NUTRIENTS.map(n=>[n.id,{value:null,kind:null,upperLimit:null,upperScope:null,note:'Completá los datos de referencia en tu ficha.'}]));
 if(!profile||!Number.isInteger(profile.age)||profile.age<19||profile.age>120||
  !['male','female'].includes(profile.referenceSex)||!['adult','pregnancy','lactation'].includes(profile.lifeStage)||
  profile.clinicalAdaptation===true||profile.lifeStage!=='adult'&&(profile.referenceSex!=='female'||profile.age>50))return empty;
 const {age,referenceSex:sex,lifeStage:stage}=profile,male=sex==='male',preg=stage==='pregnancy',lact=stage==='lactation';
 const ironBase=preg?27:lact?9:male||age>50?8:18;
 const vegetarian=['vegetarian','vegan'].includes(profile.dietaryPattern)&&stage==='adult';
 const values={magnesium:preg?(age<31?350:360):lact?(age<31?310:320):male?(age<31?400:420):(age<31?310:320),
  calcium:age>70?1200:!male&&age>50?1200:1000,iron:ironBase*(vegetarian?1.8:1),
  zinc:preg?11:lact?12:male?11:8,b12:preg?2.6:lact?2.8:2.4,ala:preg?1.4:lact?1.3:male?1.6:1.1,epa_dha:null};
 const limits={magnesium:[350,'supplements'],calcium:[age>50?2000:2500,'total'],iron:[45,'total'],zinc:[40,'total']};
 return Object.fromEntries(MICRO_NUTRIENTS.map(n=>[n.id,{value:values[n.id],kind:n.id==='ala'?'AI':n.id==='epa_dha'?null:'RDA',
  upperLimit:limits[n.id]?.[0]??null,upperScope:limits[n.id]?.[1]??null,
  note:n.id==='epa_dha'?'NIH/IOM no establece una RDA/AI específica para EPA+DHA.':
   n.id==='iron'&&vegetarian?'Referencia de hierro ajustada ×1,8 para patrón vegetariano/vegano adulto.':
   'Referencia general para personas sanas; no es un diagnóstico ni una dosis de suplemento.'}]));
}

// Explicit general comparison mode: public adult reference values, not a personal prescription.
export function generalMicronutrientReferences(){
 const fda='https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
 const efsa='https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf';
 const values={magnesium:420,calcium:1300,iron:18,zinc:11,b12:2.4,ala:1.1,epa_dha:250};
 return Object.fromEntries(MICRO_NUTRIENTS.map(n=>[n.id,{value:values[n.id],kind:'Referencia general',upperLimit:null,upperScope:null,
  sourceUrl:['ala','epa_dha'].includes(n.id)?efsa:fda,sourceLabel:['ala','epa_dha'].includes(n.id)?'EFSA':'FDA',
  note:n.id==='ala'?'EFSA: 0,5 % de energía como ALA. Referencia orientativa de 2.000 kcal: 1,1 g/día (redondeado).':
   n.id==='epa_dha'?'EFSA: ingesta adecuada general de 250 mg/día de EPA + DHA para adultos.':
   'Valor diario general de etiquetado FDA. No es una necesidad individual ni un límite máximo.'}]));
}

const magnesiumIds=new Set(['magnesium','magnesium_bisglycinate','magnesium_citrate','magnesium_oxide',
 'magnesium_chloride','magnesium_malate','magnesium_threonate','magnesium_taurate']);
const isolated={calcium:'calcium',zinc:'zinc',iron:'iron',vitamin_b12:'b12'};
function supplementRow(entry){
 const values={},relevant=new Set();
 const label=entry?.micronutrientLabel;
 if(label&&label.confirmed===true&&typeof label.source==='string'&&label.source.trim()&&
  finite(label.doseQuantity)&&label.doseQuantity>0&&label.doseUnit===entry.unit&&finite(entry.qty)&&entry.qty>0){
  for(const n of MICRO_NUTRIENTS.filter(n=>n.id!=='epa_dha'))if(own(label.amounts,n.id)){
   const item=label.amounts[n.id];relevant.add(n.id);
   if(item?.unit===n.unit&&finite(item.value))values[n.id]=item.value*entry.qty/label.doseQuantity;
  }
  for(const id of ['epa','dha'])if(own(label.amounts,id)){
   relevant.add('epa_dha');const item=label.amounts[id];
   if(item?.unit==='mg'&&finite(item.value))values[id]=item.value*entry.qty/label.doseQuantity;
  }
 }
 // The legacy elemental unit is explicit. Never use mg of citrate/oxide/salt as Mg.
 const mg=magnesiumIds.has(entry.id),single=mg?'magnesium':own(isolated,entry.id)?isolated[entry.id]:null;
 if(single){
  relevant.add(single);
  const unit=single==='b12'?'µg':'mg elementales';
  if(finite(entry.qty)&&entry.qty>0&&entry.unit===unit&&values[single]===undefined)values[single]=entry.qty;
 }else if(entry.id==='omega3'){
  relevant.add('ala');relevant.add('epa_dha');
 }else if(!relevant.size){for(const n of MICRO_NUTRIENTS)relevant.add(n.id);}
 if(entry.id==='multivitamin')for(const n of MICRO_NUTRIENTS)relevant.add(n.id);
 if(finite(values.epa)&&finite(values.dha))values.epa_dha=values.epa+values.dha;
 return {values,relevant};
}

export function estimateDailyMicronutrients({diary,profile=null,catalog,referenceMode="personal"}={}){
 if(!/^ncc-micro-[a-f0-9]{16}$/.test(catalog?.version||'')||!catalog.foods)throw Error('Catálogo de micronutrientes no verificado.');
 if(!diary||!validDay(diary.log_day)||!diary.meals)throw Error('Registro diario inválido.');
 const references=referenceMode==="general"?generalMicronutrientReferences():micronutrientReferences(profile);
 const rows=Object.fromEntries(MICRO_NUTRIENTS.map(n=>[n.id,{...n,food:0,supplements:0,
  foodKnown:0,foodUnknown:0,foodPartial:0,supplementKnown:0,supplementUnknown:0,contributors:[]} ]));
 const foods=Object.entries(diary.meals).filter(([slot])=>!diary.skipped?.[slot]).flatMap(([,items])=>Array.isArray(items)?items:[]);
 for(const entry of foods){
  const composition=catalog.foods[entry?.id];
  const usable=composition&&entry.unit===composition.unit&&finite(entry.qty)&&entry.qty>0&&
   (!entry.sourceId||String(entry.sourceId)===(composition.catalogSourceId??composition.sourceId));
  for(const n of MICRO_NUTRIENTS){
   const row=rows[n.id],per=usable?composition.perUnit:null;
   const amount=n.id==='epa_dha'?(finite(per?.epa)&&finite(per?.dha)?(per.epa+per.dha)*entry.qty:null):
    finite(per?.[n.id])?per[n.id]*entry.qty:null;
   if(amount===null){row.foodUnknown++;continue;}
   row.food+=amount;row.foodKnown++;
   const incomplete=composition.incompleteNutrients||[];
   if(n.id==='epa_dha'?incomplete.includes('epa')||incomplete.includes('dha'):incomplete.includes(n.id))row.foodPartial++;
   row.contributors.push({name:entry.name||composition.name,value:amount,sourceId:composition.sourceId,sourceUrl:composition.sourceUrl,mappingNote:composition.mappingNote||null,approximation:composition.approximation===true});
  }
 }
 const supplements=Array.isArray(diary.sports)?diary.sports.filter(x=>x?.kind==='supplement'||magnesiumIds.has(x?.id)||own(isolated,x?.id)||['omega3','multivitamin'].includes(x?.id)):[];
 for(const entry of supplements){
  const {values,relevant}=supplementRow(entry);
  for(const key of relevant){const row=rows[key];
   if(finite(values[key])){row.supplements+=values[key];row.supplementKnown++;}
   else row.supplementUnknown++;
  }
 }
 // Nutrition drinks/sports foods outside the meal catalog cannot be ignored.
 const extras=Array.isArray(diary.sports)?diary.sports.length-supplements.length:0;
 const nutrients=MICRO_NUTRIENTS.map(n=>{
  const row=rows[n.id],reference=references[n.id];row.foodUnknown+=extras;
  const known=row.foodKnown+row.supplementKnown,unknown=row.foodUnknown+row.supplementUnknown;
  const total=known?row.food+row.supplements:null,partial=unknown>0||row.foodPartial>0;
  const percent=total!==null&&reference.value!==null?100*total/reference.value:null;
  const limitAmount=reference.upperScope==='supplements'?row.supplements:total;
  return {...row,total,reference,percent,partial,status:!known?'unknown':partial?'partial':'estimated',
   difference:!partial&&total!==null&&reference.value!==null?Math.max(0,reference.value-total):null,
   upperLimitExceeded:reference.upperLimit!==null&&limitAmount!==null&&limitAmount>reference.upperLimit,
   contributors:row.contributors.sort((a,b)=>b.value-a.value).slice(0,4)};
 });
 return {day:diary.log_day,catalogVersion:catalog.version,foodEntries:foods.length+extras,
  supplementEntries:supplements.length,hasEntries:foods.length+extras+supplements.length>0,nutrients,
  referenceMode,referenceNote:referenceMode==='general'?'Referencias generales orientativas para adultos; no son metas personales ni límites máximos.':'Comparación con la referencia actual de tu ficha; no mide absorción ni diagnostica deficiencias.'};
}

export function micronutrientPeriod({logs,profile,catalog,from,to,referenceMode="personal"}){
 if(!validDay(from)||!validDay(to)||from>to)throw Error('Período inválido.');
 const first=Date.parse(from+'T12:00:00Z'),last=Date.parse(to+'T12:00:00Z');
 if(!Number.isFinite(first)||!Number.isFinite(last)||(last-first)/86400000>89)throw Error('Elegí hasta 90 días.');
 const selected=(logs||[]).filter(d=>d.log_day>=from&&d.log_day<=to),ids=new Set();
 for(const d of selected){if(ids.has(d.log_day))throw Error('Hay registros duplicados de una fecha.');ids.add(d.log_day);}
 const days=selected.sort((a,b)=>a.log_day.localeCompare(b.log_day)).map(d=>estimateDailyMicronutrients({diary:d,profile,catalog,referenceMode}));
 const summary=MICRO_NUTRIENTS.map(n=>{
  const all=days.filter(d=>d.hasEntries).map(d=>d.nutrients.find(x=>x.id===n.id));
  const complete=all.filter(x=>x.status==='estimated');
  return {...n,daysWithComposition:complete.length,partialDays:all.filter(x=>x.status==='partial').length,
   daysWithoutEstimate:all.filter(x=>x.status==='unknown').length,
   average:complete.length?complete.reduce((sum,x)=>sum+x.total,0)/complete.length:null};
 });
 return {from,to,days,summary,daysWithoutRecords:Math.round((last-first)/86400000)+1-days.filter(d=>d.hasEntries).length};
}
