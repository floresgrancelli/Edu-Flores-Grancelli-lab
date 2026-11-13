// Shared server handler, not an enabled/deployed endpoint. Auth/keys remain server-side.
import {createSelfManagementService} from '../../pilot/self-management-engine.js';
import {reuseOwnSelfIntake} from '../../pilot/self-management-intake.js';
const unavailable=()=>{throw Object.assign(new Error('La integración de autogestión todavía no está habilitada.'),{code:'backend_pending'});};
const validRequest=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
export function createSelfManagementHandler({verifyBearer,repository,readCatalog,enabled=false,
 requireAccess=unavailable,requireLegalReceipt=unavailable,readLegalStatus=null,acceptLegal=null,consumeRate=null,
 allowedOrigins=['https://efg-nutrition.onrender.com']}={}){
 if(typeof verifyBearer!=='function'||!repository||typeof readCatalog!=='function')throw Error('Missing server adapters');
 return async request=>{
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&allowedOrigins.includes(origin))Object.assign(headers,{
   'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,content-type',
   'Access-Control-Allow-Methods':'POST,OPTIONS'});
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.includes(origin))return json({error:'origin_denied'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(enabled!==true)return json({error:'backend_pending'},503);
  const match=/^Bearer ([^\s]+)$/.exec(request.headers.get('Authorization')||'');
  if(!match)return json({error:'auth_required'},401);
  const readIdentity=async()=>{
   const identity=await verifyBearer(match[1]);
   if(!identity?.id)throw Object.assign(new Error('Ingresá nuevamente.'),{code:'auth_required'});
   return identity;
  };
  try{
   const identity=await readIdentity();
   const text=await request.text();if(text.length>20000)return json({error:'body_too_large'},413);
   let body;try{body=JSON.parse(text);}catch{return json({error:'invalid_json'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'invalid_request'},400);
   // A target ID or credential is never accepted from the request body.
   const keys={status:['action'],accept_terms:['action','version','accepted'],context:['action'],register:['action','explicitChoice'],
    save_intake:['action','fields','expectedRevision','requestId'],generate:['action','requestId']};
   if(!Object.hasOwn(keys,body.action)||Object.keys(body).some(k=>!keys[body.action].includes(k)))return json({error:'invalid_request'},400);
   await requireAccess(identity.id); // Pilot allowlist or verified entitlement; never body metadata.
   if(consumeRate)await consumeRate(identity.id,body.action);
   if(body.action==='status'){
    if(!readLegalStatus)return json({error:'backend_pending'},503);
    const legal=await readLegalStatus(identity.id);
    return json({userId:identity.id,legal});
   }
   if(body.action==='accept_terms'){
    if(!acceptLegal||body.accepted!==true)return json({error:'consent_required'},400);
    await acceptLegal(identity.id,body.version);
    return json({userId:identity.id,accepted:true});
   }
   const legalVersion=await requireLegalReceipt(identity.id);
   if(typeof legalVersion!=='string'||!legalVersion)unavailable();
   if(body.action==='register'){
    if(body.explicitChoice!==true)return json({error:'explicit_choice_required'},400);
    const account=await repository.register(identity.id,legalVersion);
    return json({userId:identity.id,registered:true,account});
   }
   const account=await repository.readAccount(identity.id);
   if(!account||account.mode!=='independent'||!account.active)return json({error:'mode_mismatch'},403);
   if(body.action==='context'){
    const intake=await repository.readIntake(identity.id),generalIntake=await repository.readGeneralIntake(identity.id);
    const latestPlan=repository.readLatest?await repository.readLatest(identity.id):null;
    reuseOwnSelfIntake({userId:identity.id,saved:intake,general:generalIntake});
    if((await readIdentity()).id!==identity.id)return json({error:'session_changed'},409);
    return json({userId:identity.id,intake,generalIntake,latestPlan});
   }
   if(!validRequest(body.requestId))return json({error:'invalid_request'},400);
   if(body.action==='save_intake'){
    if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return json({error:'invalid_request'},400);
    const saved=await repository.saveIntake({userId:identity.id,requestId:body.requestId,
     expectedRevision:body.expectedRevision,fields:body.fields});
    if((await readIdentity()).id!==identity.id)return json({error:'session_changed'},409);
    return json(saved);
   }
   const service=createSelfManagementService({readIdentity,readAccount:repository.readAccount,
    readIntake:repository.readIntake,readCatalog,saveAtomic:repository.saveAtomic,readSaved:repository.readSaved});
   return json(await service.generate({requestId:body.requestId}));
  }catch(error){
   const code=error?.code||'unavailable';
   const status=code==='rate_limited'?429:code==='auth_required'?401:code==='mode_mismatch'||code==='ownership'||code==='access_required'||code==='legal_required'?403:
    code==='conflict'||code==='session_changed'?409:code==='backend_pending'?503:400;
   // Do not expose SQL/provider exceptions or private data in HTTP errors.
   return json({error:code},status);
  }
 };
}
