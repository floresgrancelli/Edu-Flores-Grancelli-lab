import {buildReportTrendCharts,drawReportTrendChart} from './report-trend-charts.js?v=ncc-weekly-preview-r11-20261106';
import * as jsPdfModule from './vendor/jspdf-4.2.1.umd.min.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {regular,bold,supportedCodePoints} from './vendor/dejavu-sans-2.37.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {parseLuxuryPeriodReport} from './period-luxury-report.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';

// Bind the bundled UMD constructor once; later globals must not alter v1 bytes.
const JsPDF=jsPdfModule.jsPDF||jsPdfModule.default?.jsPDF||globalThis.jspdf?.jsPDF;

// Immutable renderer contract. Keep v1 available when introducing future versions.
export const PERIOD_PDF_RENDERER_VERSION='ncc-luxury-period-pdf-v2';
const fontCoverage=new Set(supportedCodePoints);
const colors={ink:'#173343',muted:'#526776',teal:'#277E76',gold:'#B28B4B',cream:'#F5F1E9',line:'#DDE5E5',white:'#FFFFFF'};
const textValue=value=>String(value??'').replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
function checkedText(value){
 const text=textValue(value);
 for(const char of text){const cp=char.codePointAt(0);if(char==='\n')continue;
  if(cp>0xffff||!fontCoverage.has(cp))throw Error('El PDF no admite el carácter «'+char+'» (U+'+cp.toString(16).toUpperCase()+'). Reemplazalo antes de compartir.');}
 return text;
}
const number=(value,decimals=0)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(decimals).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'Sin dato';
const displayDate=value=>String(value).split('-').reverse().join('/');

export async function buildPeriodReportPdf(model){
 if(model?.pdfRendererVersion!==undefined&&model.pdfRendererVersion!==PERIOD_PDF_RENDERER_VERSION)
  throw Error('Versión de PDF no compatible. No se reemplazará el documento por otro diseño.');
 // This verifies approval and the complete model. Never generate from a stale DOM.
 const approved=parseLuxuryPeriodReport(JSON.stringify(model));
 if(!approved)throw Error('El PDF requiere un informe válido y aprobado para revisión.');
 for(const row of [approved.averages,approved.targets,...approved.days])for(const key of ['k','p','c','f','fi','fiberTarget']){
  if(typeof row?.[key]==='number'&&row[key]>999999)throw Error('Un valor del informe excede el ancho seguro del PDF. Revisá los datos antes de compartir.');
 }
 const charts=buildReportTrendCharts(approved);
 if(!JsPDF)throw Error('No se pudo cargar el generador PDF local.');
 const doc=new JsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true,precision:4});
 doc.setCreationDate("D:20000101000000+00'00'");
 doc.setFileId('4E43434C5558555259504552494F4430');
 doc.setProperties({title:'Informe por período - Nutrición Con-Ciencia',subject:PERIOD_PDF_RENDERER_VERSION,author:'Nutrición Con-Ciencia',creator:PERIOD_PDF_RENDERER_VERSION,keywords:'Luxury Pro, informe por período'});
 doc.addFileToVFS('DejaVuSans.ttf',regular);doc.addFont('DejaVuSans.ttf','NccSans','normal');
 doc.addFileToVFS('DejaVuSans-Bold.ttf',bold);doc.addFont('DejaVuSans-Bold.ttf','NccSans','bold');
 const left=18,right=192,width=right-left,bottom=274;
 let y=25;
 const font=(size=10,weight='normal',color=colors.ink)=>{doc.setFont('NccSans',weight);doc.setFontSize(size);doc.setTextColor(color);};
 const line=(x1,y1,x2,y2,color=colors.line)=>{doc.setDrawColor(color);doc.setLineWidth(.25);doc.line(x1,y1,x2,y2);};
 function pageHeader(){font(8,'bold',colors.teal);doc.text('NUTRICIÓN CON-CIENCIA',left,13);font(8,'normal',colors.muted);doc.text('LUXURY PRO · INFORME POR PERÍODO',right,13,{align:'right'});line(left,17,right,17);}
 function newPage(){doc.addPage();pageHeader();y=28;}
 function ensure(height){if(y+height>bottom)newPage();}
 function wrapped(value,maxWidth,size=10,weight='normal'){
  font(size,weight);const text=checkedText(value),lines=[];
  for(const originalLine of text.split('\n')){
   // Preserve explicit line and paragraph breaks, including blank lines.
   const pieces=doc.splitTextToSize(originalLine||' ',maxWidth);
   lines.push(...pieces);
  }
  return lines;
 }
 function paragraph(value,{size=10,weight='normal',color=colors.ink,indent=0,gap=4}={}){
  const lines=wrapped(value,width-indent,size,weight),leading=size*.352778*1.5;
  if(lines.length<=3)ensure(lines.length*leading+gap);
  for(const text of lines){ensure(leading);font(size,weight,color);doc.text(text,left+indent,y);y+=leading;}
  y+=gap;
 }
 function section(title,minHeight=32){ensure(minHeight);y+=3;font(13,'bold',colors.teal);doc.text(checkedText(title),left,y);y+=4;line(left,y,right,y);y+=8;}
 function metric(label,value,x,boxWidth){doc.setFillColor(colors.cream);doc.roundedRect(x,y,boxWidth,26,2,2,'F');font(15,'bold');doc.text(checkedText(value),x+4,y+10);font(7.5,'normal',colors.muted);doc.text(checkedText(label),x+4,y+19);}
 pageHeader();
 // The same reviewed artifact is shown to coach and student; UI labels its unsent status outside the PDF.
 doc.setFillColor(colors.ink);doc.roundedRect(left,24,width,54,3,3,'F');
 font(23,'bold',colors.white);doc.text('Tu período,',left+8,38);font(23,'bold','#D8BD8C');doc.text('en perspectiva.',left+8,49);
 font(9,'normal',colors.white);doc.text('Tus registros, tus hábitos y tu próximo paso.',left+8,59);
 const nameLines=wrapped(approved.studentName,width-16,10,'bold');
 // Long allowed names wrap below the cover rather than being clipped.
 y=87;paragraph(nameLines.join('\n'),{size:12,weight:'bold',gap:1});
 paragraph(displayDate(approved.from)+' al '+displayDate(approved.to),{size:9,color:colors.muted,gap:5});
 ensure(32);const gap=4,box=(width-gap*2)/3;
 metric('DÍAS REGISTRADOS',approved.daysRecorded+' / '+approved.days.length,left,box);
 metric('ENERGÍA MEDIA',number(approved.averages.k)+' kcal',left+box+gap,box);
 metric('PROTEÍNA MEDIA',number(approved.averages.p,1)+' g',left+(box+gap)*2,box);y+=34;
 section('Cómo se repartieron tus macros');
 paragraph('Promedios de días registrados comparados con las metas vigentes de cada fecha. Los días sin datos no cuentan como cero.',{size:9,color:colors.muted});
 const macros=[['p','Proteínas',colors.teal],['c','Carbohidratos',colors.gold],['f','Grasas','#838DB1']];
 for(const [key,label,color]of macros){ensure(22);const avg=approved.averages[key],target=approved.targets[key],comparable=avg!==null&&target!==null&&target>0;
  font(10,'bold');doc.text(label,left,y);font(9);doc.text(number(avg,1)+' g'+(comparable?' / '+number(target,1)+' g':''),right,y,{align:'right'});y+=4;
  doc.setFillColor(colors.line);doc.roundedRect(left,y,width,2.5,1,1,'F');
  if(comparable&&avg>0){doc.setFillColor(color);doc.rect(left,y,Math.min(width,width*avg/target),2.5,'F');}
  y+=7;font(8,'normal',colors.muted);doc.text(comparable?number(avg/target*100)+' % de la meta':'Sin meta comparable',left,y);y+=9;
 }
 section('Fibra y cobertura de los registros');
 if(!approved.fiber)paragraph('Fibra: sin dato consolidado en este informe. No se interpreta como cero.',{size:9});
 else if(!approved.fiber.daysMeasured)paragraph('Fibra: sin datos medidos en el período. Los datos ausentes no cuentan como cero.',{size:9});
 else{
  paragraph(number(approved.averages.fi,1)+' g de promedio en '+approved.fiber.daysMeasured+' de '+approved.days.length+' días con dato medido ('+approved.daysRecorded+' días registrados).',{size:9});
  paragraph(approved.fiber.daysCompared?'Comparación en '+approved.fiber.daysCompared+' fechas con dato y meta vigente: '+number(approved.fiber.comparedAverage,1)+' g registrados / '+number(approved.fiber.comparedTarget,1)+' g de meta media.':'Sin metas históricas comparables para esas fechas.',{size:9});
 }
 section('Conclusión revisada por tu coach');
 paragraph(approved.conclusion,{size:11,gap:5});
 section('Tus alimentos más elegidos');
 paragraph('Frecuencia por días registrados del '+displayDate(approved.from)+' al '+displayDate(approved.to)+'. No representa gramos ni porciones consumidas.',{size:9,color:colors.muted});
 if(!approved.topFoods.length)paragraph('Necesitamos más registros de comidas para construir tu top.',{size:10});
 else for(const [index,food]of approved.topFoods.entries())paragraph((index+1)+'. '+food.name+' · '+food.days+' día(s)',{size:10,gap:2});
 section('Tus tres focos para la próxima revisión');
 for(const [index,focus]of approved.focus.entries())paragraph((index+1)+'. '+focus,{size:10,gap:4});
 if(approved.flexibleNote){section('Espacio para disfrutar');paragraph(approved.flexibleNote,{size:10});}
 section('Cómo llegamos a esta conclusión');
 paragraph('Datos de este período: '+(approved.evidence?.dataBasis||'No hay datos suficientes'),{size:9});
 paragraph('Comparación: '+(approved.evidence?.dailyGoals||'No comparable'),{size:9});
 paragraph('Criterio: '+(approved.evidence?.rule||'Interpretación orientativa'),{size:9});
 paragraph('Marco científico: Nutrition and Athletic Performance (Academy/DC/ACSM, 2016; DOI 10.1249/MSS.0000000000000852) e ISSN Protein and Exercise (2017; DOI 10.1186/s12970-017-0177-8).',{size:8.5});
 paragraph('Las recomendaciones generales requieren contextualización profesional; las tolerancias de EFG son avisos internos, no diagnósticos.',{size:9});
 section('Tu energía, día por día',46);
 paragraph('Cada fecha del período se conserva. Un día sin registro no significa que no hayas comido. Días cerrados: '+approved.daysClosed+' de '+approved.daysRecorded+' registrados.',{size:9,color:colors.muted});
 function tableHeader(){ensure(16);doc.setFillColor(colors.cream);doc.rect(left,y-4,width,9,'F');font(8,'bold');doc.text('FECHA',left+2,y+1);doc.text('REGISTRO',left+33,y+1);doc.text('ENERGÍA',left+94,y+1);doc.text('P / HC / G (g)',right-2,y+1,{align:'right'});y+=11;}
 tableHeader();
 for(const day of approved.days){if(y+10>bottom){newPage();tableHeader();}font(8);doc.text(displayDate(day.date),left+2,y);
  doc.text(day.hasData?(day.closed?'Cerrado':'Parcial'):'Sin datos',left+33,y);
  doc.text(day.hasData?number(day.k)+' kcal':'Sin dato',left+94,y);
  doc.text(day.hasData?[day.p,day.c,day.f].map(x=>number(x,1)).join(' / '):'Sin dato',right-2,y,{align:'right'});
  y+=3;line(left,y,right,y);y+=6;
 }
 y+=5;paragraph('REVISADO POR '+approved.coachName,{size:9,weight:'bold'});
 paragraph('Los datos de alimentación son autodeclarados. Este informe no sustituye asesoramiento médico o nutricional personalizado.',{size:8,color:colors.muted});
 // Vector charts are part of the actual PDF bytes, never a screenshot of live UI.
 for(let index=0;index<charts.length;index+=2){
  newPage();font(16,'bold',colors.ink);doc.text('Tu evolución, en gráficos',left,29);
  font(8,'normal',colors.muted);doc.text('Datos y objetivos conservados en este informe.',left,35);
  drawReportTrendChart(doc,charts[index],{x:left,y:42,width,height:104});
  if(charts[index+1])drawReportTrendChart(doc,charts[index+1],{x:left,y:157,width,height:104});
 }
 const count=doc.getNumberOfPages();
 for(let page=1;page<=count;page++){doc.setPage(page);line(left,281,right,281);font(7,'normal',colors.muted);doc.text('Nutrición Con-Ciencia · Luxury Pro',left,287);doc.text(page+' / '+count,right,287,{align:'right'});}
 return new Uint8Array(doc.output('arraybuffer'));
}
