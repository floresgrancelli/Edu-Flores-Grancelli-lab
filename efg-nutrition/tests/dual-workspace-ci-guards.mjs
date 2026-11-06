import assert from 'node:assert/strict';
export function requireDisposableEnvironment(env){
 assert.equal(env.NCC_DISPOSABLE_FIXTURE,'synthetic-v1','Explicit disposable synthetic marker required');
 for(const name of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','DATABASE_URL','SUPABASE_URL']){
  assert.ok(!env[name],`Hosted or ambiguous connection setting prohibited: ${name}`);
 }
}
export function parseLocalStatus(raw){
 const settings={};
 for(const line of raw.split(/\r?\n/)){
  const match=line.match(/^([A-Z_]+)=(.*)$/);if(!match)continue;
  settings[match[1]]=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
 }
 const base=new URL(settings.API_URL);
 assert.equal(base.protocol,'http:','HTTP loopback only');
 assert.equal(base.hostname,'127.0.0.1','Numeric loopback only; no DNS');
 assert.equal(base.port,'54321','Dedicated local API port only');
 assert.equal(base.username,'');assert.equal(base.password,'');
 assert.equal(base.pathname,'/');assert.equal(base.search,'');assert.equal(base.hash,'');
 assert.ok(settings.ANON_KEY||settings.PUBLISHABLE_KEY,'Local public API key required');
 if(settings.DB_URL){
  const db=new URL(settings.DB_URL);
  assert.ok(['postgresql:','postgres:'].includes(db.protocol));
  assert.equal(db.hostname,'127.0.0.1');assert.equal(db.port,'54322');
  assert.equal(db.pathname,'/postgres');assert.equal(db.search,'');assert.equal(db.hash,'');
 }
 return {base:base.origin,key:settings.ANON_KEY||settings.PUBLISHABLE_KEY};
}
