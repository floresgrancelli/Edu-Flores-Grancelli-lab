// GU-06 staged signed read: never use a Coach's localStorage as a source
// for another person's recipe. Server resolves Coach ownership, RLS and consent.
export const COACH_SHARED_STUDENT_RECIPES_UI_ENABLED=true; // Hosted RPC verified present 2026-11-04; signed end-to-end QA and activation pending.
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const coachRecipeScopeMatches=(current,ticket)=>!!current&&!!ticket&&
 current.role==='coach'&&current.consented===true&&current.shared===true&&
 current.coachId===ticket.coachId&&current.studentId===ticket.studentId&&
 current.organizationId===ticket.organizationId&&Number.isSafeInteger(current.epoch)&&
 current.epoch===ticket.epoch&&[current.coachId,current.studentId,current.organizationId].every(x=>UUID.test(x||''));
const nutr=['k','p','c','f','fi'];
const isNonneg=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export async function loadCoachSharedStudentRecipes(sb,{profile,studentId,organizationId}={}){
 if(!UUID.test(profile?.user_id||'')||profile?.role!=='coach'||profile.active!==true||
   !UUID.test(studentId||'')||!UUID.test(organizationId||'')||
   typeof sb?.auth?.getUser!=='function'||typeof sb?.rpc!=='function')
  throw Error('No hay sesión y organización verificadas para consultar recetas del alumno.');
 const owner=profile.user_id;
 const assertIdentity=async()=>{
  const response=await sb.auth.getUser();
  if(response?.error||response?.data?.user?.id!==owner)
   throw Error('La sesión cambió durante la consulta de recetas. Volvé a abrir el alumno.');
 };
 await assertIdentity();
 const response=await sb.rpc('efg_coach_shared_student_recipes',{p_student:studentId});
 await assertIdentity();
 if(response?.error||!Array.isArray(response?.data)||response.data.length>30)
  throw Error('No se pudo validar la lista autorizada de recetas del alumno.');
 const records=[];
 for(const r of response.data){
  if(!UUID.test(r?.id||'')||r.student_id!==studentId||r.organization_id!==organizationId||
    typeof r.name!=='string'||!r.name.trim()||r.name.length>70||
    !Number.isSafeInteger(r.portions)||r.portions<1||r.portions>50||
    !Array.isArray(r.ingredients)||r.ingredients.length<1||r.ingredients.length>12||
    !r.ingredients.every(x=>typeof x?.foodId==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x.foodId)
      &&typeof x.grams==='number'&&Number.isFinite(x.grams)&&x.grams>0&&x.grams<=5000)||
    !r.totals||nutr.some(k=>!isNonneg(r.totals[k])))
   throw Error('Una receta no corresponde al alumno, la organización o la ficha alimentaria actual.');
  records.push({id:r.id,name:r.name,ingredients:r.ingredients,portions:r.portions,totals:r.totals});
 }
 return Object.freeze({studentId,organizationId,coachId:owner,
  recipes:records.map(r=>structuredClone(r)),source:'SIGNED_COACH_SCOPED_RPC'});
}
