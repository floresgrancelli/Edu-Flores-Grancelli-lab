// PRIVATE LOCAL REVIEW ONLY. This tool cannot publish to Supabase or unlock UI.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const missing=/\[(?:PENDIENTE|COMPLETAR|POR DEFINIR)[^\]]*\]|\bBORRADOR\s+INTERNO\b|\bNO\s+PUBLICAR\b/i;
const acceptedVersion=/^pilot_[0-9]{8}_v[1-9][0-9]{0,2}$/;
// A private pilot does not need invented commercial headquarters or a
// fabricated legal representative. Demand truthful participant-facing facts:
 // app name, voluntary scope, data purpose, access, withdrawal and an actual
 // support route via the person/team that invited each participant.
const minimum={
 terms:[
  ['PILOT_PURPOSE',/prueba piloto|piloto privado|piloto de/i],
  ['VOLUNTARY',/voluntari[oa]/i],
  ['LIMITATIONS',/no (?:sustituye|reemplaza)|no es (?:un )?servicio médico|no constituye/i],
  ['SUPPORT_CHANNEL',/equipo que te invit[oó]|coach que te invit[oó]|persona que te invit[oó]/i]
 ],
 privacy:[
  ['DATA_CATEGORIES',/comidas|alimentos registrados|registros de alimentaci[oó]n/i],
  ['PURPOSE',/para qu[eé]|se utilizan para|la finalidad|para permitir/i],
  ['COACH_ACCESS',/coach/i],
  ['REVOKE',/revocar|retirar (?:el )?permiso/i],
  ['RETENTION',/conservan|conservaci[oó]n|guardan durante/i],
  ['RIGHTS',/acceso.*(?:correcci[oó]n|supresi[oó]n)|correcci[oó]n|supresi[oó]n|rectificaci[oó]n/i],
  ['SUPPORT_CHANNEL',/equipo que te invit[oó]|coach que te invit[oó]|persona que te invit[oó]/i]
 ]
};
const normalize=x=>typeof x==='string'?x.replace(/\r\n/g,'\n').trim():null;
export function inspectPilotLegalDrafts({terms,privacy,version}={}){
 const errors=[],a=normalize(terms),b=normalize(privacy);
 if(!acceptedVersion.test(version||''))errors.push('VERSION_NOT_PINNED');
 for(const [kind,body] of [['terms',a],['privacy',b]]){
  if(!body||body.length<300||body.length>12000||body.includes('\u0000')){errors.push(kind.toUpperCase()+'_BODY_INVALID');continue;}
  if(missing.test(body))errors.push(kind.toUpperCase()+'_REVIEW_FIELDS_MISSING');
  // Pilot requirement 01-03: show the brand and a clear, short pilot notice.
  // Neither the unverified person's address nor a fictitious support email is
  // a legitimate substitute for the actual invitation/support channel.
  if(!/Nutrici[oó]n Con-Ciencia/i.test(body))errors.push(kind.toUpperCase()+'_APP_NAME_MISSING');
  for(const [key,pattern] of minimum[kind])
   if(!pattern.test(body))errors.push(kind.toUpperCase()+'_'+key+'_MISSING');
  if(!body.includes(version))errors.push(kind.toUpperCase()+'_VERSION_MISMATCH');
 }
 if(a&&!/Condiciones para participar en el piloto/i.test(a))errors.push('TERMS_KIND_MISMATCH');
 if(b&&!/Aviso de datos y privacidad del piloto/i.test(b))errors.push('PRIVACY_KIND_MISMATCH');
 // Vendors, commercial addresses and company identity are not synthesized
 // from source code. The two separate, server-stored acceptance receipts and
 // health-data permissions are still required at activation; nothing auto-publishes.
 if(a&&b&&digest(a)===digest(b))errors.push('DUPLICATE_DOCUMENTS');
 return Object.freeze({
  readyForManualReview:errors.length===0,publishable:false,uploaded:false,
  reviewScope:'PILOTO_PRIVADO_MINIMO_NO_COMERCIAL',
  version:version||null,
  // Hashes bind exact text including the responsible/contact lines; an edit changes the hash.
  documents:[{kind:'terms',sha256:a?digest(a):null,characters:a?.length||0},
             {kind:'privacy',sha256:b?digest(b):null,characters:b?.length||0}],
  blockers:errors
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const files=process.argv.slice(2);
 if(files.length!==3){process.stderr.write('Uso: node prepare-pilot-legal-review.mjs TERMS.md PRIVACY.md pilot_YYYYMMDD_vN\n');process.exitCode=2;}
 else{
  const [a,b,version]=files;
  const report=inspectPilotLegalDrafts({terms:readFileSync(a,'utf8'),privacy:readFileSync(b,'utf8'),version});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.readyForManualReview)process.exitCode=1;
 }
}