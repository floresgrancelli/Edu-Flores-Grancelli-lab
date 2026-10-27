// EFG Nutrition Pro: frases rotativas de lunes a domingo, hora de Argentina.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const root=new URL("./",import.meta.url);
const source=await readFile(new URL("./daily-motivation.js",root),"utf8");
const {WEEKLY_MOTIVATION,motivationOfTheDay}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const cases=[
 ["monday","2026-10-26T15:00:00Z"],
 ["tuesday","2026-10-27T15:00:00Z"],
 ["wednesday","2026-10-28T15:00:00Z"],
 ["thursday","2026-10-29T15:00:00Z"],
 ["friday","2026-10-30T15:00:00Z"],
 ["saturday","2026-10-31T15:00:00Z"],
 ["sunday","2026-11-01T15:00:00Z"]
];
assert.equal(Object.keys(WEEKLY_MOTIVATION).length,7);
for(const [day,date] of cases){
 const m=motivationOfTheDay(date);
 assert.equal(m.weekday,day);
 assert.ok(m.title.length>20&&m.subtitle.length>20);
 assert.equal(m.title,WEEKLY_MOTIVATION[day].title);
}
assert.equal(new Set(Object.values(WEEKLY_MOTIVATION).map(m=>m.title)).size,7,"No repetir frases en la misma semana");
assert.equal(motivationOfTheDay("2026-11-02T02:59:59Z").weekday,"sunday","El domingo sigue vigente hasta medianoche argentina");
assert.equal(motivationOfTheDay("2026-11-02T03:00:00Z").weekday,"monday","El lunes comienza a medianoche argentina");
assert.match(WEEKLY_MOTIVATION.sunday.title,/comida sin restricciones/);
assert.match(WEEKLY_MOTIVATION.sunday.subtitle,/coach/,"El mensaje nunca suplanta las pautas particulares del coach");
const ui=await readFile(new URL("./pilot.js",root),"utf8");
assert.match(ui,/const motivation=motivationOfTheDay\(\)/);
assert.match(ui,/escapeHTML\(motivation.title\)/);
assert.match(ui,/escapeHTML\(motivation.subtitle\)/);
assert.ok(!ui.includes("Un día a la vez, un hábito a la vez."),"Eliminar frase antigua");
console.log("EFG Nutrition: siete días, domingo flexible y límite horario argentino OK.");
