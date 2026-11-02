// PRIVATE LOCAL REVIEW ONLY. This tool cannot publish to Supabase or unlock UI.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const missing=/\[(?:PENDIENTE|COMPLETAR|POR DEFINIR)[^\]]*\]|\bBORRADOR\s+INTERNO\b|\bNO\s+PUBLICAR\b/i;
const acceptedVersion=/^pilot_[0-9]{8}_v[1-9][0-9]{0,2}$/;
const requireLine=(body,label)=>new RegExp('^'+label+':[ \t]*[^\\s].+$','im').test(body);
const normalize=x=>typeof x==='string'?x.replace(/\r\n/g,'\n').trim():null;
export function inspectPilotLegalDrafts({terms,privacy,version}={}){
 const errors=[],a=normalize(terms),b=normalize(privacy);
 if(!acceptedVersion.test(version||''))errors.push('VERSION_NOT_PINNED');
 for(const [kind,body] of [['terms',a],['privacy',b]]){
  if(!body||body.length<300||body.length>12000||body.includes('\u0000')){errors.push(kind.toUpperCase()+'_BODY_INVALID');continue;}
  if(missing.test(body))errors.push(kind.toUpperCase()+'_REVIEW_FIELDS_MISSING');
  for(const label of ['Responsable','Domicilio','Contacto'])
   if(!requireLine(body,label))errors.push(kind.toUpperCase()+'_'+label.toUpperCase()+'_MISSING');
  if(!body.includes(version))errors.push(kind.toUpperCase()+'_VERSION_MISMATCH');
 }
 if(a&&!/Condiciones para participar en el piloto/i.test(a))errors.push('TERMS_KIND_MISMATCH');
 if(b&&!/Aviso de datos y privacidad del piloto/i.test(b))errors.push('PRIVACY_KIND_MISMATCH');
 if(b&&!/Supabase/.test(b)||b&&!/Render/.test(b))errors.push('PRIVACY_PROVIDERS_MISSING');
 if(b&&!/derechos|rectificación|supresión/i.test(b))errors.push('PRIVACY_RIGHTS_MISSING');
 if(a&&b&&digest(a)===digest(b))errors.push('DUPLICATE_DOCUMENTS');
 return Object.freeze({
  readyForManualReview:errors.length===0,publishable:false,uploaded:false,
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