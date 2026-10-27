// EFG Nutrition Pro · Mensajes cotidianos para pantalla Mi alimentación.
// Las frases dependen únicamente del día de la semana en Argentina.
// No modifican objetivos calóricos, registro de alimentos ni pautas del coach.
export const WEEKLY_MOTIVATION={
 monday:{
  title:"Empezá la semana eligiendo cuidarte.",
  subtitle:"Cada comida es una oportunidad para construir hábitos que duren."
 },
 tuesday:{
  title:"Tu bienestar se construye con cada elección.",
  subtitle:"Registrá tus comidas y avanzá a tu ritmo."
 },
 wednesday:{
  title:"No buscamos perfección. Construimos hábitos.",
  subtitle:"Aprender a alimentarte mejor también es progresar."
 },
 thursday:{
  title:"Tu progreso se construye, comida a comida.",
  subtitle:"Las pequeñas decisiones suman bienestar."
 },
 friday:{
  title:"Lo importante es la constancia, no la perfección.",
  subtitle:"Reconocé lo que lograste esta semana y seguí avanzando."
 },
 saturday:{
  title:"Disfrutar y cuidarte pueden ir de la mano.",
  subtitle:"Elegí con libertad y prestá atención a lo que necesitás."
 },
 sunday:{
  title:"Hoy es tu día libre: disfrutá una comida sin restricciones.",
  subtitle:"Disfrutala sin culpa. Si tu coach indicó pautas particulares, seguílas."
 }
};
export function motivationOfTheDay(now=new Date()){
 const weekday=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/Argentina/Buenos_Aires",
  weekday:"long"
 }).format(new Date(now)).toLowerCase();
 const message=WEEKLY_MOTIVATION[weekday];
 if(!message)throw new Error("No se encontró un mensaje para el día.");
 return {...message,weekday};
}
