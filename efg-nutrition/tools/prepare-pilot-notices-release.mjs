// NCC PILOT 01-03: SQL CANDIDATE for MANUAL REVIEW, NOT A DEPLOYER.
// No Supabase/GitHub connection, credentials, network or automatic writes.
// Generates a single deterministic PostgreSQL transaction from two minimal
// participant-facing notices. Running this JS NEVER executes the SQL.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {inspectPilotLegalDrafts} from './prepare-pilot-legal-review.mjs';
export const PILOT_NOTICE_VERSION='pilot_20261102_v1';
const docs=Object.freeze([
 {kind:'terms',path:'../docs/NCC_PILOTO_CONDICIONES_SIMPLES_PROPUESTA_20261102.txt'},
 {kind:'privacy',path:'../docs/NCC_PILOTO_PRIVACIDAD_SIMPLE_PROPUESTA_20261102.txt'}
]);
const sha256=s=>createHash('sha256').update(s,'utf8').digest('hex');
const sqlLiteral=s=>"'"+s.replaceAll("'","''")+"'";
export function preparePilotNoticePublication(){
 const rows=docs.map(({kind,path})=>({kind,body:readFileSync(new URL(path,import.meta.url),'utf8').replace(/\r\n/g,'\n').trim()}));
 const review=inspectPilotLegalDrafts({terms:rows[0].body,privacy:rows[1].body,version:PILOT_NOTICE_VERSION});
 assert.equal(review.readyForManualReview,true,'NCC01-03_NOTICE_REVIEW_NOT_READY: '+review.blockers.join(','));
 assert.equal(review.publishable,false,'Preparation may not certify hosted publication');
 assert.equal(rows[0].kind,'terms');
 assert.equal(rows[1].kind,'privacy');
 for(const row of rows)assert.ok(row.body.length>=300 && row.body.length<=12000);
 const records=rows.map(row=>({
  ...row,version:PILOT_NOTICE_VERSION,sha256:sha256(row.body)
 }));
 const values=records.map(row=>'('+[
  sqlLiteral(row.kind),sqlLiteral(row.version),sqlLiteral(row.body),
  sqlLiteral(row.sha256),'true','pg_catalog.clock_timestamp()'
 ].join(',')+')').join(',\n ');
 const sql=[
 '-- NCC 01-03: two simple notices for private PILOT, not a commercial contract.',
 '-- SQL FOR OPERATOR REVIEW ONLY. NOT APPLIED. DO NOT EXECUTE BEFORE EDU GO.',
 '-- Exact version + SHA256 bind content to the two distinct signed receipts.',
 '-- Clinical health consent is SEPARATE; neither notice enables clinical flags.',
 'begin;',
 "set local lock_timeout='3s';",
 "set local statement_timeout='45s';",
 'do $ncc_pilot_notices_preflight$',
 'begin',
 " if pg_catalog.to_regclass('public.efg_legal_documents') is null",
 "  or pg_catalog.to_regclass('public.efg_legal_acceptances') is null",
 "  or pg_catalog.to_regprocedure('public.efg_accept_current_legal(uuid,uuid,boolean,boolean)') is null",
 " then raise exception 'NCC01-03 STOP: signed legal backend missing' using errcode='55000'; end if;",
 " if exists(select 1 from public.efg_legal_documents where kind in ('terms','privacy') and is_current)",
 "  or exists(select 1 from public.efg_legal_acceptances)",
 " then raise exception 'NCC01-03 STOP: existing legal versions/receipts need manual review' using errcode='55000'; end if;",
 'end',
 '$ncc_pilot_notices_preflight$;',
 'insert into public.efg_legal_documents(kind,version,body,sha256,is_current,published_at)',
 'values '+values+';',
 'do $ncc_pilot_notices_readback$',
 'begin',
 ' if (select pg_catalog.count(*) from public.efg_legal_documents',
 "     where kind in ('terms','privacy') and version="+sqlLiteral(PILOT_NOTICE_VERSION),
 '       and is_current and published_at is not null',
 '       and sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body,\'UTF8\')),\'hex\'))<>2',
 " then raise exception 'NCC01-03 STOP: two versioned, content-hashed notices not verified' using errcode='55000'; end if;",
 'end',
 '$ncc_pilot_notices_readback$;',
 'commit;',
 ''
 ].join('\n');
 assert.equal((sql.match(/^begin;$/gm)||[]).length,1);
 assert.equal((sql.match(/^commit;$/gm)||[]).length,1);
 assert.ok(!sql.includes('update efg_private.coach_release_switches'));
 return Object.freeze({status:'PREPARED_NOT_APPLIED',version:PILOT_NOTICE_VERSION,
  documents:records.map(({kind,version,sha256,body})=>({kind,version,sha256,characters:body.length})),
  transactionSha256:sha256(sql),sql,productionWrites:0,flagsEnabled:0});
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2]||'--check',report=preparePilotNoticePublication();
 if(mode==='--check')console.log(JSON.stringify({
  status:report.status,version:report.version,documents:report.documents,
  transactionSha256:report.transactionSha256,productionWrites:report.productionWrites,flagsEnabled:report.flagsEnabled
 },null,2));
 else if(mode==='--emit'&&process.argv[3]==='--ack=PREPARE_ONLY_NOT_GO')process.stdout.write(report.sql);
 else throw Error('Only --check, or --emit --ack=PREPARE_ONLY_NOT_GO. SQL MUST NOT be run without GO.');
}
