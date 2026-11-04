// COACH101 Visual QA fixture — green/red are explicitly fabricated *reviewed examples* for screenshot only.
// No hosted Supabase, real user health conditions, passwords or live source claims.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium,webkit,devices} from 'playwright';
import {describeTrafficLight,reviewedRowsToCatalogEvidence} from '../pilot/food-compatibility-adapter.js';
const engine=process.env.EFG_QA_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const css=readFileSync(new URL('../pilot/food-compatibility.css',import.meta.url),'utf8');
const food={id:'visual_fixture',name:'Alimento ficticio sin marca'};
const makeEvidence=classes=>reviewedRowsToCatalogEvidence([{
 food_id:'visual_fixture',rule:'pattern:vegan',status:'reviewed',
 catalog_review_id:'synthetic_visual_review',catalog_version:'catalog2026',
 source_kind:'validated_composition',source_url:'https://example.org/synthetic-fixture',
 ingredient_classes:classes,complete_ingredients:true,
 reviewed_at:'2026-10-01T00:00:00Z',expires_at:'2026-12-01T00:00:00Z'
}]);
const signals=[
 {name:'Sin restricciones',color:'neutral',signal:describeTrafficLight(food,{pattern:'balanced'})},
 {name:'Sin evidencia revisada',color:'yellow',signal:describeTrafficLight(food,{pattern:'vegan'})},
 {name:'Producto vegetal revisado (ficticio)',color:'green',signal:describeTrafficLight(food,{pattern:'vegan',evidence:makeEvidence(['plant'])})},
 {name:'Contiene ingrediente animal (ficticio)',color:'red',signal:describeTrafficLight(food,{pattern:'vegan',evidence:makeEvidence(['dairy']),inPlan:true})},
 {name:'Celiaquía sin fuente válida',color:'yellow',signal:describeTrafficLight(food,{pattern:'vegan',restrictions:['celiac'],evidence:makeEvidence(['plant'])})}
];
assert.deepEqual(signals.map(x=>x.signal.color),signals.map(x=>x.color));
const html=signals.map(x=>'<article class="fixture" data-color="'+x.color+'"><h2>'+x.name+'</h2><div>'+x.signal.details+
 (x.color==='neutral'?'<span class="efg-neutral">Catálogo completo · sin semáforo calórico</span>':'')+'</div></article>').join('');
const variants=engine==='webkit'?[{label:'safari-390',width:390}]:
 [{label:'iphone-390',width:390},{label:'android-pixel',device:'Pixel 7'},
 {label:'desktop-1280',width:1280}];
const issues=[],reports=[],out='artifacts/premium-visual-qa';
mkdirSync(out,{recursive:true});
try{
 for(const v of variants){
  const context=await browser.newContext(v.device?{...devices[v.device]}:
    {viewport:{width:v.width,height:860},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   page.on('pageerror',e=>issues.push(v.label+': '+e.message));
   await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<style>body{margin:0;padding:12px;font:15px system-ui;background:#f5f5f9}.fixture{margin:13px auto;padding:14px;max-width:780px;min-width:0;box-sizing:border-box;background:white;border:1px solid #ddd;border-radius:16px}.fixture h2{font-size:16px;margin:0 0 9px;overflow-wrap:anywhere}'+css+'</style></head>'+
    '<body><h1 style="font-size:20px">Semáforo · Vista de prueba sin pacientes reales</h1>'+html+'</body></html>',{waitUntil:'load'});
   const data=await page.evaluate(()=>({
    width:innerWidth,scroll:document.documentElement.scrollWidth,
    rows:document.querySelectorAll('.fixture').length,
    green:document.querySelectorAll('.efg-compat-green').length,
    yellow:document.querySelectorAll('.efg-compat-yellow').length,
    red:document.querySelectorAll('.efg-compat-red').length,
    sources:[...document.querySelectorAll('.efg-compat-sources a')].every(a=>a.target==='_blank'&&a.rel.includes('noopener')),
    plan:!!document.querySelector('.efg-in-plan')
   }));
   if(data.scroll>data.width+2||data.rows!==5||data.green!==1||data.yellow!==2||data.red!==1||!data.sources||!data.plan)issues.push(v.label+': '+JSON.stringify(data));
   await page.screenshot({path:join(out,'coach101-semaforo-'+engine+'-'+v.label+'.png'),fullPage:true,animations:'disabled'});
   reports.push({variant:v.label,...data});
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(out,'coach101-semaforo-'+engine+'.json'),JSON.stringify({fixtureOnly:true,physicalDevice:false,syntheticEvidence:true,reports,issues},null,2));
assert.deepEqual(issues,[]);
console.log('PASS COACH101 Visual '+engine+': 5 static examples, 390/Pixel/desktop, no overflow, vetted-example and unknown statuses distinguishable; real clinical compatibility NOT assessed.');
