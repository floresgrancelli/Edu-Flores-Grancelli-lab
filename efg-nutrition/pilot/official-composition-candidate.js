// Pure provenance normalization, NOT external-source verification or approval.
// Only immutable official payloads supplied by a future authorized ingestion job.
const ids={k:1008,p:1003,c:1005,f:1004,fi:1079};
const unknown=reason=>({status:'unknown',reason,composition:null,publishable:false});
export async function ingestFdcPayload({bytes,mapping,retrievedAt,validUntil,now}={}){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>1024*1024)return unknown('invalid_capture');
 let record;try{record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{return unknown('invalid_capture');}
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 return normalizeFdcComposition({mapping,record,now,receipt:{provider:'usda_fdc',sourceId:String(record.fdcId),
  sourceUrl:'https://fdc.nal.usda.gov/food-details/'+record.fdcId+'/nutrients',payloadDigest:'sha256:'+hash,
  parserVersion:'ncc-fdc-candidate-v1',retrievedAt,validUntil}});
 // Digest proves capture identity, NOT origin authenticity. Caller must use a trusted ingestion channel.
}
export function normalizeFdcComposition({mapping,record,receipt,now}={}){
 if(!mapping||!record||!receipt||!Number.isFinite(now))return unknown('missing_input');
 if(mapping.schemaVersion!==1||typeof mapping.version!=='string'||!mapping.version||
  mapping.matchMethod!=='pinned_record'||!Number.isInteger(mapping.fdcId)||record.fdcId!==mapping.fdcId||
  record.dataType!==mapping.dataType||record.description!==mapping.expectedDescription)
  return unknown('identity_mismatch');
 // Preparation equivalence is separately pinned; no fuzzy name/category matching.
 if(!['raw','cooked','fresh_unseasoned','packaged','breaded','as_sold'].includes(mapping.preparation)||
  !mapping.preparationEvidenceId||!mapping.foodId||mapping.unit!=='g'||mapping.basisGrams!==100)
  return unknown('preparation_or_unit_unknown');
 if(record.dataType==='Branded'){
  if(!mapping.productId||!mapping.gtin||mapping.gtin!==record.gtinUpc)return unknown('product_mismatch');
 }else if(record.dataType!=='SR Legacy'||mapping.productId)return unknown('unsupported_source_scope');
 if(receipt.provider!=='usda_fdc'||!/^https:\/\/fdc\.nal\.usda\.gov\//.test(receipt.sourceUrl||'')||
  receipt.sourceId!==String(record.fdcId)||!/^sha256:[a-f0-9]{64}$/.test(receipt.payloadDigest||'')||
  !(Date.parse(receipt.retrievedAt)<=now&&Date.parse(receipt.validUntil)>now)||
  !receipt.parserVersion||!Array.isArray(record.foodNutrients))return unknown('provenance_missing');
 const perUnit={};
 for(const [key,id] of Object.entries(ids)){
  const matches=record.foodNutrients.filter(n=>n.nutrient?.id===id);
  if(matches.length!==1)return unknown('missing_or_ambiguous_nutrient');
  const n=matches[0],unit=key==='k'?'KCAL':'G';
  if(String(n.nutrient.unitName).toUpperCase()!==unit||typeof n.amount!=='number'||!Number.isFinite(n.amount)||n.amount<0)
   return unknown('invalid_nutrient_unit_or_value');
  perUnit[key]=n.amount/100;
 }
 // No fallback zero, kcal recomputation, net-carb subtraction or ml conversion.
 return {status:'normalized_candidate',foodId:mapping.foodId,productId:mapping.productId||null,
  preparation:mapping.preparation,unit:'g',perUnit,composition:null,glutenEvidence:null,publishable:false,
  provenance:{schemaVersion:1,mappingVersion:mapping.version,preparationEvidenceId:mapping.preparationEvidenceId,
   provider:'usda_fdc',recordId:String(record.fdcId),dataType:record.dataType,
   sourceUrl:receipt.sourceUrl,payloadDigest:receipt.payloadDigest,parserVersion:receipt.parserVersion,
   retrievedAt:receipt.retrievedAt,validUntil:receipt.validUntil,
   verification:'awaiting_trusted_ingestion',reviewedBy:null}};
}

