// EFG Nutrition - pre-release media availability gate. Does not touch Supabase or production.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=await readFile("efg-nutrition/pilot/fit-recipe-photos.js","utf8");
const {FIT_RECIPE_PHOTOS}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const cards=Object.entries(FIT_RECIPE_PHOTOS);
assert.equal(cards.length,12,"The photo catalog must match 12 Fit recipes");
const responses=await Promise.all(cards.map(async([id,meta])=>{
 try{
  const response=await fetch(meta.src,{method:"GET",headers:{Range:"bytes=0-2047","User-Agent":"Mozilla/5.0 (EFG Nutrition media preflight)"},signal:AbortSignal.timeout(15000)});
  const type=(response.headers.get("content-type")||"").toLowerCase();
  if(!response.ok || !type.startsWith("image/"))return {id,ok:false,status:response.status,type};
  const arr=new Uint8Array(await response.arrayBuffer());
  if(arr.length<500)return{id,ok:false,status:response.status,type,note:"Too few image bytes"};
  return{id,ok:true,status:response.status,type};
 }catch(error){return{id,ok:false,error:String(error)};}
}));
for(const r of responses)console.log((r.ok?"PASS":"FAIL")+" "+r.id+" "+(r.status||"")+" "+(r.type||r.error||r.note||""));
const failed=responses.filter(r=>!r.ok);
assert.equal(failed.length,0,"Fix broken photo URLs before production. Total failed: "+failed.length);
console.log("All 12 Fit recipe photographs are reachable, valid image responses.");
