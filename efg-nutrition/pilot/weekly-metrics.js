export function weeklyNumbers(rows,targets,weights){
 const valid=(rows||[]).filter(x=>x&&x.hasData&&/^\d{4}-\d{2}-\d{2}$/.test(x.date));
 const days=valid.slice(-7);
 const mean=key=>days.length?days.reduce((sum,d)=>sum+(Number(d[key])||0),0)/days.length:null;
 const goalAt=date=>(targets||[]).filter(g=>g.start_on<=date).sort((a,b)=>b.start_on.localeCompare(a.start_on))[0];
 const protein=days.map(d=>({d,g:goalAt(d.date)})).filter(x=>Number(x.g?.protein_g)>0);
 const meetsProtein=protein.filter(x=>Number(x.d.p)>=Number(x.g.protein_g)*0.9).length;
 const sortedWeights=(weights||[]).filter(w=>Number(w.kg)>0).sort((a,b)=>String(b.measured_on).localeCompare(String(a.measured_on)));
 return {
  daysRecorded:days.length,
  daysClosed:days.filter(d=>d.closed).length,
  averages:{k:mean("k"),p:mean("p"),c:mean("c"),f:mean("f"),fi:mean("fi")},
  proteinDaysCompared:protein.length,
  proteinDaysOnTarget:meetsProtein,
  weightDelta:sortedWeights.length>1?Number(sortedWeights[0].kg)-Number(sortedWeights[1].kg):null
 };
}
