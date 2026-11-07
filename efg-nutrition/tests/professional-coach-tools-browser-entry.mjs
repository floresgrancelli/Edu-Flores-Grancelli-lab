import {coachFixture,IDS} from './professional-coach-tools-fixture.mjs';
import {mountProfessionalWorkspaceReleasePanel} from '../pilot/professional-workspace-release-panel.mjs';
const f=coachFixture(),saved=JSON.parse(sessionStorage.getItem('fictional-coach-backend')||'null');
if(saved){f.s.tables=saved.tables;f.s.receipts=new Map(saved.receipts);f.s.writes=saved.writes;}
const root=document.querySelector('#professional');
const panel=mountProfessionalWorkspaceReleasePanel({root,sdk:f.sdk,config:{explicitReleaseConfiguration:true,backendOrigin:f.sdk.supabaseUrl},enabled:true,
 readLegacyPersonal:()=>({profile:f.original,organization:{id:IDS.personal}}),
 onView:flag=>{document.querySelector('#personal').hidden=flag;document.querySelector('#personal').inert=flag;}});
window.coachFixture={f,panel,ready:panel.ready,ids:IDS,capture(){sessionStorage.setItem('fictional-coach-backend',JSON.stringify({tables:f.s.tables,receipts:[...f.s.receipts],writes:f.s.writes}));}};
