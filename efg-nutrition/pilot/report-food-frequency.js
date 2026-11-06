// New snapshots only. Legacy PDFs retain the stored topFoods without recomputing.
const clean=(value,max)=>String(value??'').replace(/[\x00-\x08\x0b-\x1f]/g,' ').trim().slice(0,max);
export function withReportFoodFrequency(model,logs){
 const dates=new Set(model.days.filter(d=>d.hasData).map(d=>d.date)),byDay=new Map();
 for(const log of logs||[]){
  if(!dates.has(log?.log_day)||log.log_day<model.from||log.log_day>model.to)continue;
  const foods=byDay.get(log.log_day)||new Map();
  for(const [slot,items]of Object.entries(log.meals||{})){
   if(log.skipped?.[slot]===true||!Array.isArray(items))continue;
   for(const food of items){
    const name=clean(food?.name||food?.label||'',70);if(!name)continue;
    const id=clean(food?.id||'',90);
    const normalized=name.normalize('NFC').replace(/\s+/g,' ').toLocaleLowerCase('es');
    // The legacy generic recipe ID identifies no particular recipe. A normalized
    // saved name is the only available fallback; homonymous recipes remain one.
    const key=JSON.stringify(id==='custom-recipe'?['custom-name',normalized]:id?['id',id]:['name',normalized]);
    if(!foods.has(key))foods.set(key,name);
   }
  }
  byDay.set(log.log_day,foods);
 }
 const rank=new Map();
 for(const foods of byDay.values())for(const [id,name]of foods){const item=rank.get(id)||{name,days:0};item.days++;rank.set(id,item);}
 return {...model,topFoods:[...rank.values()].sort((a,b)=>b.days-a.days||a.name.localeCompare(b.name,'es')).slice(0,5)};
}
