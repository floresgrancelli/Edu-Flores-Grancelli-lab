import {ingestFdcPayload} from './official-composition-candidate.js';

// Selected downloaded FDC detail JSON only. No network, API keys or catalogue writes.
export const GUIDE_FDC_IDS = Object.freeze({apple:171688,oats_raw:173904,milk_skim:173432,
  yogurt_greek_light:170894,spinach_cooked:168463,chicken:171477,oil:171413,
  brownrice:169704,potato:170440,banana:173944});
const nutrients = [[1008,'Energy','KCAL'],[1003,'Protein','G'],
  [1005,'Carbohydrate, by difference','G'],[1004,'Total lipid (fat)','G'],
  [1079,'Fiber, total dietary','G']];
const unknown = reason => ({status:'unknown',reason,publishable:false,composition:null});
const text = v => typeof v==='string' && v.trim().length>0;
const date = v => typeof v==='string' && Number.isFinite(Date.parse(v));
async function digest(bytes){
  return 'sha256:'+Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),
    x=>x.toString(16).padStart(2,'0')).join('');
}

export async function importSelectedFdcExport({bytes,mappings,metadata,now}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>5*1024*1024)
    return unknown('invalid_capture');
  if(!Number.isFinite(now)||!metadata||metadata.format!=='fdc-detail-json-v1'||
    !text(metadata.release)||!date(metadata.retrievedAt)||!date(metadata.validUntil)||
    Date.parse(metadata.retrievedAt)>now||Date.parse(metadata.validUntil)<=now||
    metadata.basis!=='per100g'||metadata.basisEvidence!=='FDC_SR_LEGACY_PER_100G')
    return unknown('missing_export_metadata');
  // The receipt is supplied by the owner. Hashing is integrity, not authentication.
  let url;try{url=new URL(metadata.sourceUrl);}catch{return unknown('untrusted_source_location');}
  if(url.protocol!=='https:'||!['api.nal.usda.gov','fdc.nal.usda.gov'].includes(url.hostname)||
    url.username||url.password||url.search||url.hash)return unknown('untrusted_source_location');
  if(!Array.isArray(mappings)||!mappings.length||mappings.length>5||
    new Set(mappings.map(m=>m?.fdcId)).size!==mappings.length||
    mappings.some(m=>!m||GUIDE_FDC_IDS[m.foodId]!==m.fdcId||m.dataType!=='SR Legacy'||
      m.unit!=='g'||m.basisGrams!==100||!text(m.expectedDescription)||
      !text(m.preparationEvidenceId)||!text(m.version)))return unknown('invalid_selection');
  let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{return unknown('invalid_json');}
  // Official API detail object or /foods detail array. Other download schemas need an explicit adapter.
  const records=Array.isArray(parsed)?parsed:[parsed];
  if(records.length!==mappings.length||records.some(r=>!r||typeof r!=='object')||
    new Set(records.map(r=>r.fdcId)).size!==records.length||
    records.some(r=>!mappings.some(m=>m.fdcId===r.fdcId)))return unknown('selection_mismatch');
  const exportDigest=await digest(bytes), results=[];
  for(const mapping of mappings){
    const record=records.find(r=>r.fdcId===mapping.fdcId);
    let result;
    if(!date(record.publicationDate))result=unknown('missing_record_date');
    else if(!Array.isArray(record.foodNutrients))result=unknown('missing_nutrients');
    else if(nutrients.some(([id,name,unit])=>{
      const rows=record.foodNutrients.filter(n=>n?.nutrient?.id===id);
      return rows.length!==1||rows[0].nutrient.name!==name||
        String(rows[0].nutrient.unitName).toUpperCase()!==unit;
    }))result=unknown('nutrient_identity_mismatch');
    else result=await ingestFdcPayload({bytes:new TextEncoder().encode(JSON.stringify(record)),
      mapping,retrievedAt:metadata.retrievedAt,validUntil:metadata.validUntil,now});
    results.push({foodId:mapping.foodId,fdcId:mapping.fdcId,result,
      original:record.foodNutrients,publicationDate:record.publicationDate||null,
      serving:record.servingSize===undefined?null:{value:record.servingSize,unit:record.servingSizeUnit||null},
      transformation:'Original SR Legacy amounts per 100 g divided by 100; no serving/density/energy inference.',
      capture:{exportDigest,sourceUrl:metadata.sourceUrl,release:metadata.release,
        format:metadata.format,basis:metadata.basis,originVerified:false}});
  }
  return {status:'import_report',results,publishable:false,composition:null};
}

// Caller supplies an explicit absolute tolerance for each nutrient in the SAME per100g units.
// Tolerance is comparison only: original numbers are never rounded or overwritten.
export function comparePer100g(candidate,catalog,tolerance){
  if(candidate?.status!=='normalized_candidate')return unknown('no_candidate');
  const comparisons={};
  for(const key of ['k','p','c','f','fi']){
    const target=catalog?.[key],limit=tolerance?.[key];
    if(typeof target!=='number'||!Number.isFinite(target)||target<0||
      typeof limit!=='number'||!Number.isFinite(limit)||limit<0)return unknown('comparison_data_missing');
    const source=candidate.perUnit[key]*100,delta=target-source;
    comparisons[key]={source,catalog:target,delta,tolerance:limit,
      withinTolerance:Math.abs(delta)<=limit+Number.EPSILON*Math.max(1,Math.abs(source),Math.abs(target))*4};
  }
  return {status:'comparison',comparisons,publishable:false};
}

