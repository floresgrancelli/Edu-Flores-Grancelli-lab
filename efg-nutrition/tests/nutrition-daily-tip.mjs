// PRO-60 / D-36 — real editorial selector contract, no hosted network/data.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {argentinaDayParts,nutritionTipForDate,nutritionTipCardHTML,DAILY_TIP_LIBRARY_SIZE} from "../pilot/nutrition-daily-tip.js";
assert.equal(DAILY_TIP_LIBRARY_SIZE,72);
const localDate=(y,m,d,h=16)=>new Date(Date.UTC(y,m-1,d,h));
const oct29=nutritionTipForDate(localDate(2026,10,29));
assert.equal(oct29.special,true);
assert.match(oct29.title,/ñoquis/i);
assert.match(oct29.body,/salsa|ñ oquis|ñ oqui|tradición|plato/i);
assert.match(oct29.src,/^https:\/\/images\.unsplash\.com\/photo-/);
assert.match(oct29.page,/^https:\/\/unsplash\.com\/photos\//);
assert.match(oct29.alt,/ñoquis/i);
assert.equal(nutritionTipForDate(new Date("2026-10-29T01:20:00Z")).date,"2026-10-28",
 "Tip uses Buenos Aires clock, not UTC: 28th before local midnight");
assert.equal(nutritionTipForDate(new Date("2026-10-29T03:20:00Z")).date,"2026-10-29");
for(let y=2026;y<=2040;y++){
 for(let m=1;m<=12;m++){
  const d29=new Date(Date.UTC(y,m-1,29,16));
  const exists=d29.getUTCMonth()===m-1;
  const t=nutritionTipForDate(d29);
  if(exists){assert.equal(t.special,true,`29/${m}/${y}`);assert.match(t.title,/ñoquis/i);}
  else {assert.notEqual(t.date,`${y}-${String(m).padStart(2,"0")}-29`);}
 }
}
assert.equal(nutritionTipForDate(localDate(2028,2,29)).special,true);
assert.equal(nutritionTipForDate(localDate(2027,2,28)).special,false);
assert.equal(nutritionTipForDate(localDate(2027,3,1)).special,false);
assert.notEqual(nutritionTipForDate(localDate(2026,10,29)).src,nutritionTipForDate(localDate(2026,11,29)).src,
 "Monthly ñoquis photo should rotate");
assert.notEqual(nutritionTipForDate(localDate(2026,10,29)).title,nutritionTipForDate(localDate(2026,11,29)).title);
const start=Date.UTC(2027,1,1,16);
const regular=new Set();
let last=null;
for(let i=0;i<365;i++){
 const t=nutritionTipForDate(new Date(start+i*86400000));
 assert.match(t.src,/^https:\/\/images\.unsplash\.com\//);
 assert.ok(t.alt.length>10&&t.by.length>3&&t.body.length>40);
 if(!t.special)regular.add(t.id);
 if(last)assert.notEqual(t.id,last.id,"No identical consecutive tips");
 last=t;
}
assert.equal(regular.size,72,"All 72 editorial tips must circulate across a year");
// EDU-01 · The regular calendar and the monthly ñoquis calendar are selected
// independently. Detect actual photograph collisions, not merely different IDs
// or altered query strings. This runs every day in ART from 2026 through 2040.
const photoIdentity=src=>new URL(src).pathname;
let yesterday=null,specialDays=0;
for(let ts=Date.UTC(2026,0,1,16);ts<=Date.UTC(2040,11,31,16);ts+=86400000){
 const tip=nutritionTipForDate(new Date(ts));
 if(tip.special)specialDays++;
 if(yesterday)assert.notEqual(photoIdentity(tip.src),photoIdentity(yesterday.src),
  `Consecutive tips must use different real photos: ${yesterday.date} → ${tip.date}`);
 if(tip.special)assert.match(tip.title,/ñoquis/i,"The 29th tradition remains unchanged");
 assert.match(tip.page,/^https:\/\/unsplash\.com\/photos\//);
 assert.ok(tip.by&&tip.alt,"Every rotated photograph retains author and ALT");
 yesterday=tip;
}
assert.ok(specialDays>165,"All real 29ths, including leap years, keep the special editorial card");
for(const [a,b] of [['2026-12-28','2026-12-29'],
 ['2027-03-28','2027-03-29'],['2029-12-29','2029-12-30']]){
 const x=nutritionTipForDate(new Date(a+'T16:00:00Z'));
 const y=nutritionTipForDate(new Date(b+'T16:00:00Z'));
 assert.notEqual(photoIdentity(x.src),photoIdentity(y.src),a+' / '+b);
}
const locked=nutritionTipCardHTML({now:localDate(2026,10,29),allowExplore:false});
const unlocked=nutritionTipCardHTML({now:localDate(2026,10,29),allowExplore:true});
assert.match(locked,/TIP NUTRICIONAL DEL DÍA/);
assert.match(locked,/Foto|Fotografía/);
assert.match(locked,/loading="lazy"/);
assert.match(locked,/class="efg-daily-tip-photo-placeholder" aria-hidden="true">Nutrición Con-Ciencia/,
 'Photo failure must leave an offline branded placeholder, not a blank hero.');
assert.match(locked,/alt="[^"]+"/);
assert.match(locked,/Unsplash/);
assert.match(locked,/No reemplaza indicaciones profesionales/);
assert.doesNotMatch(locked,/data-tab="recipes"/);
assert.match(unlocked,/data-tab="recipes"/);
assert.doesNotMatch(unlocked,/data-act="(?:setmeal|register|addFood)/);
assert.doesNotMatch(unlocked,/\b(?:kcal|proteína por 100g|calorías exactas)\b/i,
 "No uncited calculated nutrition values on promotional card");
const app=readFileSync(new URL("../pilot/pilot.js",import.meta.url),"utf8");
const index=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const style=readFileSync(new URL("../pilot/nutrition-daily-tip.css",import.meta.url),"utf8");
assert.match(app,/import \{nutritionTipCardHTML\} from "\.\/nutrition-daily-tip\.js/);
assert.match(app,/state\.profile\.role==="student"\?nutritionTipCardHTML/);
assert.match(app,/allowExplore:!!goal&&!!state\.foodPlan\?\.guided_plan/);
assert.match(index,/nutrition-daily-tip\.css/);
assert.match(style,/\.efg-daily-tip-photo/);
assert.match(style,/\.efg-daily-tip-photo-placeholder\{position:absolute;inset:0/,
 'Offline photo fallback must occupy the actual hero photograph region.');
assert.match(style,/\.efg-daily-tip-photo\{position:relative;z-index:1/,
 'Loaded photo must cover the branded fallback without hiding ALT.');
assert.match(style,/@media\(max-width:720px\)/);
assert.match(style, /prefers-reduced-motion:reduce/);
console.log("PASS PRO60: 72 Argentine daily editorial tips, monthly 29 incl leap year, photos/crédits, no repeated next day, gated recipe links, responsive CSS contract.");
