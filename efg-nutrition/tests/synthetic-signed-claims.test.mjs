import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyntheticSignedClaims} from './synthetic-signed-claims.mjs';
const subject='00000000-0000-4000-8000-000000000003';
test('test JWT accepts valid short-lived synthetic identity',()=>{
 const signer=createSyntheticSignedClaims({clock:()=>1000});const claims=signer.verify(signer.token(subject));
 assert.equal(claims.sub,subject);assert.equal(claims.exp,1060);
});
test('test JWT rejects tampered claims or signature and a different ephemeral key',()=>{
 const signer=createSyntheticSignedClaims({clock:()=>1000});const token=signer.token(subject),parts=token.split('.');
 parts[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(parts[1],'base64url')),sub:'00000000-0000-4000-8000-000000000001'})).toString('base64url');
 assert.throws(()=>signer.verify(parts.join('.')),/signature rejected/);
 assert.throws(()=>signer.verify(token.slice(0,-10)),/signature rejected/);
 assert.throws(()=>createSyntheticSignedClaims({clock:()=>1000}).verify(token),/signature rejected/);
});
test('test JWT rejects expired/future/wrong audience/wrong issuer/non-UUID claims',()=>{
 const signer=createSyntheticSignedClaims({clock:()=>1000});
 for(const overrides of [{exp:999},{exp:1000},{exp:1000.5},{iat:1001},{aud:'wrong'},{aud:['ncc-disposable']},{iss:'wrong'},{sub:'admin'}])
  assert.throws(()=>signer.verify(signer.token(subject,overrides)),/claims rejected/);
});
test('test JWT rejects alg none and malformed envelope before database work',()=>{
 const signer=createSyntheticSignedClaims({clock:()=>1000});const parts=signer.token(subject).split('.');
 parts[0]=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
 assert.throws(()=>signer.verify(parts.join('.')),/algorithm rejected/);
 assert.throws(()=>signer.verify('not-a-jwt'),/malformed/);
});
