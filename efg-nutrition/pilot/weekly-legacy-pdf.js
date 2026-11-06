// Read-only conversion of a pre-Luxury stored report. No live records are consulted.
import * as jsPdfModule from './vendor/jspdf-4.2.1.umd.min.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
import {regular,bold,supportedCodePoints} from './vendor/dejavu-sans-2.37.js?v=ncc-pilot-3a40474052be-reports-guide-r10-20261106';
const JsPDF=jsPdfModule.jsPDF||jsPdfModule.default?.jsPDF||globalThis.jspdf?.jsPDF;
export async function buildLegacyWeeklyPdf(model){
 if(model?.kind!=='efg_legacy_weekly_text_v1'||typeof model.reportText!=='string'||!model.reportText.trim()||model.reportText.length>8000||!/^\d{4}-\d{2}-\d{2}$/.test(model.friday))throw Error('El informe histórico no puede convertirse a PDF.');
 if(new Date(model.friday+'T12:00:00Z').toISOString().slice(0,10)!==model.friday)throw Error('Fecha histórica no válida.');
 const coverage=new Set(supportedCodePoints),text=model.reportText.replace(/\r\n?/g,'\n').replace(/\t/g,'    ');
 for(const char of text)if(char!=='\n'&&!coverage.has(char.codePointAt(0)))throw Error('El informe histórico contiene un carácter no compatible con el PDF. El texto original se conserva.');
 const doc=new JsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true,precision:4});
 doc.setCreationDate("D:20000101000000+00'00'");doc.setFileId('4E43434C45474143595745454B4C5931');
 doc.setProperties({title:'Informe semanal anterior - conversión de texto guardado',author:'Nutrición Con-Ciencia',creator:'ncc-legacy-weekly-text-pdf-v1'});
 doc.addFileToVFS('DejaVuSans.ttf',regular);doc.addFont('DejaVuSans.ttf','NccSans','normal');
 doc.addFileToVFS('DejaVuSans-Bold.ttf',bold);doc.addFont('DejaVuSans-Bold.ttf','NccSans','bold');
 let y=25;
 const header=()=>{doc.setFont('NccSans','bold');doc.setFontSize(12);doc.setTextColor('#173343');doc.text('Nutrición Con-Ciencia · Informe semanal',18,16);doc.setFont('NccSans','normal');doc.setFontSize(9);doc.text('Semana hasta '+model.friday+' · Conversión del texto guardado',18,24);y=35;};
 header();doc.setFontSize(11);
 for(const paragraph of text.split('\n'))for(const line of doc.splitTextToSize(paragraph||' ',174)){
  if(y>272){doc.addPage();header();doc.setFontSize(11);}
  doc.text(line,18,y);y+=6;
 }
 const pages=doc.getNumberOfPages();for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFontSize(8);doc.text('Conversión nueva a PDF. El informe histórico original se conserva sin cambios.',18,285);doc.text(n+' / '+pages,192,291,{align:'right'});}
 return new Uint8Array(doc.output('arraybuffer'));
}
