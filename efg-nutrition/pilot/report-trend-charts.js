import {reportTrendGoals,REPORT_TREND_KEYS} from './report-trend-snapshot.js?v=ncc-weekly-preview-r11-20261106';
const styles=[['Calorías','kcal','#168F7E'],['Proteínas','g','#3184AC'],['Carbohidratos','g','#D69A44'],['Grasas','g','#966EB4']];
const displayDate=d=>d.slice(8)+'/'+d.slice(5,7);
const fullDate=d=>d.split('-').reverse().join('/');
const number=(n,key)=>n.toFixed(key==='k'?0:1).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
// Export geometry inputs for data-contract tests. Every selected day is included;
// 30-day panels keep the complete 90-day range legible, without aggregation.
export function buildReportTrendCharts(model){
 const goals=reportTrendGoals(model),charts=[];
 for(let start=0;start<model.days.length;start+=30){
  const days=model.days.slice(start,start+30);
  REPORT_TREND_KEYS.forEach((key,metric)=>{
   const points=days.flatMap((d,i)=>d.hasData&&typeof d[key]==='number'&&Number.isFinite(d[key])&&d[key]>=0?[{i,date:d.date,value:d[key],closed:d.closed===true}]:[]);
   const targets=days.map((d,i)=>({i,date:d.date,value:goals.days[start+i][metric]}));
   const dataSegments=points.slice(1).flatMap((p,i)=>p.i===points[i].i+1?[[points[i],p]]:[]);
   const goalSegments=targets.slice(1).flatMap((p,i)=>p.value!==null&&targets[i].value!==null?[[targets[i],p]]:[]);
   const values=[...points.map(p=>p.value),...targets.filter(p=>p.value!==null).map(p=>p.value)];
   const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):0;
   const span=Math.max(key==='k'?120:8,hi-lo),pad=Math.max(key==='k'?35:3,span*.18);
   const min=Math.max(0,lo-pad),max=hi+pad;
   const tickIndexes=[...new Set([0,...Array.from({length:4},(_,i)=>Math.round((days.length-1)*(i+1)/5)),days.length-1])];
   charts.push({key,label:styles[metric][0],unit:styles[metric][1],color:styles[metric][2],from:days[0].date,to:days.at(-1).date,days,points,targets,dataSegments,goalSegments,min,max,tickIndexes,goalHistoryAvailable:goals.available,goalNote:goals.reason,last:points.at(-1)||null});
  });
 }
 return charts;
}
export function drawReportTrendChart(doc,chart,{x=18,y=35,width=174,height=104}={}){
 const font=(size=9,weight='normal',color='#526776')=>{doc.setFont('NccSans',weight);doc.setFontSize(size);doc.setTextColor(color);};
 doc.setFillColor('#F5FAF8');doc.setDrawColor('#D6E7E1');doc.setLineWidth(.3);doc.roundedRect(x,y,width,height,3,3,'FD');
 font(13,'bold',chart.color);doc.text(chart.label,x+5,y+9);
 font(8,'normal');doc.text(chart.last?number(chart.last.value,chart.key)+' '+chart.unit+' · último registro '+displayDate(chart.last.date):'Sin registros en estas fechas',x+width-5,y+9,{align:'right'});
 const left=x+23,right=x+width-7,top=y+18,bottom=y+72;
 const xp=i=>chart.days.length===1?(left+right)/2:left+i/(chart.days.length-1)*(right-left);
 const yp=n=>bottom-(n-chart.min)/(chart.max-chart.min)*(bottom-top);
 doc.setFillColor('#FFFFFF');doc.setDrawColor('#E1EAE5');doc.rect(left,top,right-left,bottom-top,'F');
 for(let i=0;i<5;i++){
  const value=chart.min+(chart.max-chart.min)*i/4,Y=yp(value);doc.setDrawColor('#DDE8E4');doc.setLineWidth(.2);doc.setLineDashPattern([.7,1.2],0);doc.line(left,Y,right,Y);
  font(7);doc.text(number(value,chart.key),left-2,Y+1,{align:'right'});
 }
 doc.setDrawColor('#7B9186');doc.setLineWidth(.45);doc.setLineDashPattern([2,1.3],0);
 // Historical objectives are steps: never interpolate a changed goal diagonally.
 for(const [a,b]of chart.goalSegments){const edge=(xp(a.i)+xp(b.i))/2;doc.line(xp(a.i),yp(a.value),edge,yp(a.value));doc.line(edge,yp(a.value),edge,yp(b.value));doc.line(edge,yp(b.value),xp(b.i),yp(b.value));}
 // Isolated verified dates still have a visible short dashed objective marker.
 for(const p of chart.targets)if(p.value!==null&&!chart.goalSegments.some(([a,b])=>a.i===p.i||b.i===p.i))doc.line(xp(p.i)-1.7,yp(p.value),xp(p.i)+1.7,yp(p.value));
 doc.setLineDashPattern([],0);doc.setDrawColor(chart.color);doc.setLineWidth(.65);
 for(const [a,b]of chart.dataSegments)doc.line(xp(a.i),yp(a.value),xp(b.i),yp(b.value));
 for(const p of chart.points){doc.setFillColor(p.closed?chart.color:'#FFFFFF');doc.circle(xp(p.i),yp(p.value),1.35,'FD');}
 font(7);for(const i of chart.tickIndexes)doc.text(displayDate(chart.days[i].date),xp(i),bottom+5,{align:'center'});
 font(7.4);doc.text('Punto lleno: día cerrado · Punto vacío: parcial · No se unen días sin registro.',x+5,y+84);
 const hasGoals=chart.targets.some(p=>p.value!==null);
 doc.text(hasGoals?'Línea punteada: meta histórica vigente en cada fecha. Escala ajustada a datos y metas.':chart.goalHistoryAvailable?'Sin metas verificables en estas fechas. Escala ajustada a los registros.':'Metas históricas no conservadas o no verificadas. Se muestran solo registros.',x+5,y+90);
 font(7,'normal','#6C8078');doc.text(fullDate(chart.from)+' al '+fullDate(chart.to)+' · '+chart.unit+' · Los días ausentes no se interpretan como cero.',x+5,y+98);
}
