// Nutrición Con-Ciencia · weekly coverage, not an adherence diagnosis.
const validDate=value=>{
 if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
 const parsed=new Date(value+"T12:00:00Z");
 return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
};
const measured=value=>{
 if(value===null||value===undefined||typeof value==="boolean"||
   (typeof value==="string"&&!value.trim()))return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0?n:null;
};
export function weeklyNumbers(rows,targets,weights){
 // Duplicate snapshots with contradictory numbers cannot be resolved by input
 // order. Exclude those dates from trends until the underlying log is reviewed.
 const byDate=new Map(),conflicts=new Set();
 const signature=row=>JSON.stringify([row.closed===true,
  ...["k","p","c","f","fi"].map(key=>measured(row[key]))]);
 for(const row of rows||[])if(row?.hasData===true&&validDate(row.date)){
  const previous=byDate.get(row.date);
  if(previous&&signature(previous)!==signature(row))conflicts.add(row.date);
  else if(!previous)byDate.set(row.date,row);
 }
 for(const key of conflicts)byDate.delete(key);
 const days=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-7);
 // A historical week must never read a future weight or describe an old
 // measurement from another period as this week's change.
 const calendar=[...new Set((rows||[]).filter(row=>validDate(row?.date)).map(row=>row.date))]
  .sort().slice(-7);
 const start=calendar[0],end=calendar.at(-1);
 const mean=key=>{
  const values=days.map(d=>measured(d[key])).filter(x=>x!==null);
  return values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null;
 };
 const goals=(targets||[]).filter(g=>validDate(g?.start_on))
  .slice().sort((a,b)=>b.start_on.localeCompare(a.start_on));
 const goalAt=day=>goals.find(g=>g.start_on<=day)||null;
 const protein=days.map(d=>({value:measured(d.p),goal:measured(goalAt(d.date)?.protein_g)}))
  .filter(x=>x.value!==null&&x.goal!==null&&x.goal>0);
 const meetsProtein=protein.filter(x=>x.value>=x.goal*.9).length;
 const weightsByDate=new Map();
 for(const row of weights||[])if(start&&validDate(row?.measured_on)&&
    row.measured_on>=start&&row.measured_on<=end){
  const kg=measured(row.kg);
  if(kg!==null&&kg>0)weightsByDate.set(row.measured_on,kg);
 }
 const latest=[...weightsByDate.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
 return {
  daysRecorded:days.length,
  daysClosed:days.filter(d=>d.closed===true).length,
  averages:{k:mean("k"),p:mean("p"),c:mean("c"),f:mean("f"),fi:mean("fi")},
  proteinDaysCompared:protein.length,
  proteinDaysOnTarget:meetsProtein,
  weightDelta:latest.length>1?latest[0][1]-latest[1][1]:null
 };
}
