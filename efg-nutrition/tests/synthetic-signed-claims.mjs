// Test-only signer/verifier. Ephemeral key stays in memory; no account credentials.
// This is not Supabase GoTrue, PostgREST or a production authentication component.
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
export function createSyntheticSignedClaims({clock=()=>Math.floor(Date.now()/1000)}={}){
 const key=randomBytes(32),issuer='urn:ncc:disposable:dual-workspace',audience='ncc-disposable';
 const sign=payload=>{
  const head=encode({alg:'HS256',typ:'JWT'}),body=encode(payload),input=head+'.'+body;
  return input+'.'+createHmac('sha256',key).update(input).digest('base64url');
 };
 return {
  token(subject,overrides={}){return sign({sub:subject,iss:issuer,aud:audience,iat:clock(),exp:clock()+60,...overrides});},
  verify(token){
   const parts=String(token).split('.');if(parts.length!==3)throw Error('Synthetic JWT malformed');
   const header=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
   if(header.alg!=='HS256'||header.typ!=='JWT')throw Error('Synthetic JWT algorithm rejected');
   const expected=createHmac('sha256',key).update(parts[0]+'.'+parts[1]).digest(),actual=Buffer.from(parts[2],'base64url');
   if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Synthetic JWT signature rejected');
   if(claims.iss!==issuer||claims.aud!==audience||!Number.isInteger(claims.exp)||claims.exp<=clock()||
      !Number.isInteger(claims.iat)||claims.iat>clock()||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sub))
    throw Error('Synthetic JWT claims rejected');
   return claims;
  }
 };
}
