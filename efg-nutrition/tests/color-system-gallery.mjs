// A contact sheet of exact browser screenshots; no regenerated UI imagery.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.NCC_PLAYWRIGHT_MODULE||'playwright');
const out=resolve('artifacts/color-system');
const groups={alumno:[['student-home','Mi Día'],['guide','Dieta Guía'],['student-weight','Estadísticas'],['messages','Mensajes'],['student-recipes','Recetas'],['student-intake','Ficha del alumno']],gestion:[['coach-home','Inicio del coach'],['coach-intake','Ficha recibida'],['coach-reports','Informes'],['coach-payments','Pagos'],['admin-admin','Inicio administrador'],['admin-adminManage','Gestión y solapas']]};
const browser=await chromium.launch({headless:true});
try{for(const [name,items] of Object.entries(groups)){
 const cards=items.map(([file,label])=>'<article><h2>'+label+'</h2><img alt="'+label+'" src="data:image/png;base64,'+readFileSync(resolve(out,'chromium-390-'+file+'.png')).toString('base64')+'"></article>').join('');
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#0d1412;color:#f0f1e7;font:16px Arial}h1{font-size:27px;margin:0 0 7px}p{color:#bec8c3;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}article{margin:0;min-width:0}h2{font-size:17px;margin:0 0 10px;color:#b1c579}img{display:block;width:100%;border:1px solid #4d605b;border-radius:14px}</style><h1>Nutrición Con-Ciencia · '+(name==='alumno'?'Alumno':'Coach y administración')+'</h1><p>Capturas reales de la candidata · datos ficticios · pendiente de aprobación</p><div class="grid">'+cards+'</div></html>';
 writeFileSync(resolve(out,'galeria-'+name+'.html'),html);
 const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});await page.setContent(html);await page.screenshot({path:resolve(out,'galeria-'+name+'.png'),fullPage:true});await page.close();
}}finally{await browser.close();}
