// Regla única EFG Nutrition: zona horaria de Argentina y cierre sin intervención del alumno.
// A las 23:59 (inclusive) se considera finalizado el registro de ese día.
// El servidor ejecuta pg_cron a las 02:59 UTC (23:59 America/Argentina/Buenos_Aires).
export const ARGENTINA_TIMEZONE="America/Argentina/Buenos_Aires";
export function argentinaClock(at=new Date()){
 const d=new Date(at);
 if(!Number.isFinite(d.getTime()))throw new Error("Fecha inválida.");
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:ARGENTINA_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d);
 const get=k=>parts.find(p=>p.type===k)?.value||"";
 return {day:get("year")+"-"+get("month")+"-"+get("day"),hour:Number(get("hour")),minute:Number(get("minute"))};
}
export function isNutritionDayClosed(logDay,at=new Date()){
 const current=argentinaClock(at);
 return String(logDay)<current.day||(String(logDay)===current.day&&current.hour===23&&current.minute>=59);
}
