// Resumen de seguimiento: nunca inventar ceros para días sin registro.
// Las cifras se recalculan desde los alimentos realmente registrados.
export function buildNutritionReport(logs, mealSlots, dailyTotals, currentDay, goal){
 const slots=mealSlots.map(([id,label])=>({id,label}));
 const days=(logs||[]).filter(d=>d&&/^\d{4}-\d{2}-\d{2}$/.test(d.log_day||"")).map(d=>{
  const t=dailyTotals(d);
  const meals=slots.map(({id,label})=>({id,label,omitted:!!d.skipped?.[id],foods:(d.meals?.[id]||[]).length,kcal:(d.skipped?.[id]?0:(d.meals?.[id]||[]).reduce((n,x)=>n+(Number(x.k)||0),0))}));
  const mealCount=meals.filter(x=>x.foods>0&&!x.omitted).length;
  const sportCount=(d.sports||[]).length;
  const closed=!!d.skipped?._closed;
  const comment=String(d.skipped?._comment||"").slice(0,1000);
  const supplements=(d.sports||[]).filter(x=>x.kind==="supplement"||["creatine","collagen","omega3","magnesium","electrolytes"].includes(x.id)).map(x=>({name:String(x.name||"Suplemento"),qty:Number(x.qty)||0,unit:String(x.unit||""),when:String(x.when||""),k:Number(x.k)||0,p:Number(x.p)||0,f:Number(x.f)||0}));
  return {date:d.log_day,k:t.k,p:t.p,c:t.c,f:t.f,fi:t.fi,meals,mealCount,sportCount,supplements,comment,closed,hasData:mealCount>0||(d.sports||[]).some(x=>["k","p","c","f"].some(key=>Number(x[key])>0)),hasNote:!!comment,updatedAt:d.updated_at||null};
 }).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14);
 const recorded=days.filter(d=>d.hasData);
 const closed=recorded.filter(d=>d.closed);
 const mean=(list,key)=>list.length?list.reduce((n,d)=>n+(Number(d[key])||0),0)/list.length:null;
 const average=Object.fromEntries(["k","p","c","f","fi"].map(key=>[key,mean(recorded,key)]));
 const finishedAverage=Object.fromEntries(["k","p","c","f","fi"].map(key=>[key,mean(closed,key)]));
 return {days,average,finishedAverage,daysRecorded:recorded.length,daysClosed:closed.length,today:days.find(x=>x.date===currentDay)||null,goal:goal||null};
}
export function nutritionReportText(report,nickname,selectedDate){
 const day=report.days.find(d=>d.date===selectedDate)||report.days[0];
 if(!day)return "Sin registros disponibles para elaborar un informe diario.";
 const round=x=>Math.round(Number(x)||0);
 const date=day.date.split("-").reverse().join("/");
 let out=["EFG NUTRITION | INFORME DIARIO",nickname||"Alumno",date,day.closed?"Estado: día cerrado por el alumno":"Estado: registro parcial (sin cierre)","Calorías registradas: "+round(day.k)+" kcal","Proteínas: "+round(day.p)+" g | Carbohidratos: "+round(day.c)+" g | Grasas: "+round(day.f)+" g | Fibra: "+round(day.fi)+" g"];
 if(report.goal?.kcal){out.push("Meta: "+round(report.goal.kcal)+" kcal | Diferencia: "+(round(day.k-report.goal.kcal)>=0?"+":"")+round(day.k-report.goal.kcal)+" kcal");}
 if(day.comment)out.push("Comentario del alumno: "+day.comment);
 if(day.supplements?.length)out.push("Suplementos del día: "+day.supplements.map(x=>x.name+" ("+x.qty+" "+x.unit+")").join(", "));
 out.push("Comidas con registro: "+day.mealCount,"Promedio de "+report.daysRecorded+" días con registro: "+round(report.average.k)+" kcal/día","Nota: cifras orientativas. Días no registrados no se cuentan como 0. Pueden existir comidas sin cargar.");
 return out.join("\n");
}
