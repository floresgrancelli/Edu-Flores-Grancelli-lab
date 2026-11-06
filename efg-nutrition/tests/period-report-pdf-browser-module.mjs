// Load the real UMD vendor as an ES module, as browsers do. Node's native
// CJS interop exports are deliberately absent: they masked a global binding bug.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
assert.equal(typeof vm.SourceTextModule,'function','Run with --experimental-vm-modules');
const base=new URL('../pilot/',import.meta.url);
const context=vm.createContext({console,TextEncoder,TextDecoder,Blob,atob,btoa,setTimeout,clearTimeout});
vm.runInContext('globalThis.self=globalThis;globalThis.navigator={userAgent:"synthetic"}',context);
const modules=new Map();
async function load(url){
 assert.equal(url.protocol,'file:','Only repository-local modules are allowed');
 assert.ok(fileURLToPath(url).startsWith(fileURLToPath(base)),'Module stays within pilot/');
 if(modules.has(url.href))return modules.get(url.href);
 const module=new vm.SourceTextModule(readFileSync(url,'utf8'),{
  context,identifier:url.href,
  initializeImportMeta(meta){meta.url=url.href;},
  async importModuleDynamically(specifier,parent){return evaluated(new URL(specifier,parent.identifier));}
 });
 modules.set(url.href,module);return module;
}
async function evaluated(url){
 const module=await load(url);
 if(module.status==='unlinked')await module.link((specifier,parent)=>load(new URL(specifier,parent.identifier)));
 if(module.status==='linked')await module.evaluate();
 return module;
}
assert.equal(vm.runInContext('typeof exports',context),'undefined');
assert.equal(vm.runInContext('typeof module',context),'undefined');
assert.equal(vm.runInContext('typeof require',context),'undefined');
const reports=await evaluated(new URL('period-luxury-report.js',base));
const pdf=await evaluated(new URL('period-report-pdf.js',base));
const draft=reports.namespace.buildLuxuryPeriodReport({
 from:'2026-10-22',to:'2026-10-31',friday:'2026-11-01',
 studentName:'María José Núñez · FICTICIO',coachName:'Coach ficticio',
 days:[{date:'2026-10-22',hasData:true,closed:true,mealCount:2,k:2000,p:100,c:250,f:60}]
});
const snapshot=JSON.parse(reports.namespace.periodReportAsStoredText({...draft,pdfRendererVersion:'ncc-luxury-period-pdf-v2'},draft.conclusion,draft.flexibleNote));
const baseline=Buffer.from(await pdf.namespace.buildPeriodReportPdf(snapshot));
assert.equal(baseline.subarray(0,5).toString(),'%PDF-');assert.ok(baseline.length>10000);
const vendors=[...modules.values()].filter(m=>new URL(m.identifier).pathname.endsWith('/vendor/jspdf-4.2.1.umd.min.js'));
assert.equal(vendors.length,1,'Dispatcher loads the real pinned vendor once');
assert.deepEqual(Object.keys(vendors[0].namespace),[],'Browser UMD import has no CJS named/default exports');
assert.equal(vm.runInContext('typeof globalThis.jspdf?.jsPDF',context),'function','Real UMD establishes browser global');
vm.runInContext(`globalThis.__sentinelCalls=0;globalThis.jspdf={jsPDF:class{constructor(){globalThis.__sentinelCalls++;throw Error('OTHER_VERSION_CONSTRUCTOR_USED');}}};`,context);
const afterReplacement=Buffer.from(await pdf.namespace.buildPeriodReportPdf(JSON.parse(JSON.stringify(snapshot))));
assert.deepEqual(afterReplacement,baseline,'v1 keeps identical bytes after another bundle replaces the global constructor');
assert.equal(vm.runInContext('__sentinelCalls',context),0,'The replacement constructor must never run');
vm.runInContext('delete globalThis.jspdf',context);
assert.deepEqual(Buffer.from(await pdf.namespace.buildPeriodReportPdf(snapshot)),baseline,'v1 also survives removal of the mutable browser global');
console.log('PASS real browser-style ESM/UMD: empty vendor namespace, exact v1 bytes after global replacement/removal, sentinel never called. '+JSON.stringify({bytes:baseline.length,sha256:createHash('sha256').update(baseline).digest('hex')}));
