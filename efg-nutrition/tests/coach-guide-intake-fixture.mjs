// FICTIONAL identities, declarations, rates and evidence; no backend or storage.
import {catalog,goal,template,now} from './adapted-guide-fixtures.mjs';
export const scope={userId:'coach-a',profileId:'coach-a',sessionId:'fictional-session-a',role:'coach',active:true,
 organizationId:'org-a',ownerId:'coach-a',studentId:'student-a',studentActive:true,studentOrganizationId:'org-a',
 consent:true,consentStudentId:'student-a',consentOrganizationId:'org-a',sourceEpoch:1};
export function fixture(s=scope){
 const binding=Object.fromEntries(['userId','sessionId','studentId','organizationId','sourceEpoch'].map(k=>[k,s[k]]));
 const wrap=data=>({status:'available',binding:{...binding},data:{student_id:s.studentId,organization_id:s.organizationId,revision:1,...data}});
 return structuredClone({synthetic:true,now,
  general:wrap({completed_version:'synthetic_general_v1',shared_at:'2026-11-01T12:00:00Z',
   dietary_pattern:'keto',preferred_foods:'FICTICIO preferred',disliked_foods:'FICTICIO fresh_a'}),
  health:wrap({conditions:{celiac:'suspected'},sibo_phase:'none',shared_with_coach:true,document_id:'synthetic-health-document'}),
  goals:wrap({confirmed_by:s.userId,source_intake_revision:1,goal,pattern:{kind:'keto',coachConfirmed:true,maxCarbG:30}}),
  preferences:wrap({confirmed_by:s.userId,source_intake_revision:1,catalog_revision:1,
   preferred_text:'FICTICIO preferred',disliked_text:'FICTICIO fresh_a',preferred_ids:['preferred'],disliked_ids:['fresh_a']}),
  catalog:wrap({origin:'synthetic_fixture',foods:catalog,template})});
}
