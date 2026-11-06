// Produces a self-contained local artifact only. Does not serve or publish it.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const clean=source=>source.replace(/^import .*?;\n/gm,'').replace(/\bexport (?=(?:const|function|class)\b)/g,'');
let code='(async()=>{\n';
code+='const Candidate=(()=>{\n'+clean(read('../pilot/dual-workspace-candidate.mjs'))+'\nreturn {API,fail,accountInput,canonical,occupancy,seatLimit,createDualWorkspaceClient};})();\n';
code+='const Fixture=(()=>{const {API,accountInput,canonical,occupancy,seatLimit}=Candidate;\n'+clean(read('./dual-workspace-fixture.mjs'))+'\nreturn {createSyntheticService};})();\n';
code+='const Integration=(()=>{const {fail}=Candidate;\n'+clean(read('../pilot/dual-workspace-integration.mjs'))+'\nreturn {createWorkspaceGateway};})();\n';
code+='const {createDualWorkspaceClient}=Candidate;const {createSyntheticService}=Fixture;const {createWorkspaceGateway}=Integration;\n';
code+=clean(read('../pilot/dual-workspace-demo.mjs'))+'\n})();';
if(code.includes('</script'))throw Error('Inline script terminator is not allowed');
const hash=createHash('sha256').update(code).digest('base64');
const html=read('../pilot/dual-workspace-demo.html').replace("script-src 'self'",`script-src 'sha256-${hash}'`)
 .replace('<script type="module" src="./dual-workspace-demo.mjs"></script>','<script>'+code+'</script>');
writeFileSync(new URL('../pilot/dual-workspace-offline.html',import.meta.url),html);
console.log('Built offline demo with exact script CSP hash. No network, browser or publication action.');
