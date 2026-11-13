// Real engine + repository catalog, fictional identity/measurements only.
import {readFileSync,writeFileSync} from 'node:fs';
import {generateSelfManagedPlan} from '../../pilot/self-management-engine.js';
const catalog=JSON.parse(readFileSync(new URL('../../catalog/guide-catalog.json',import.meta.url)));
const input={age_years:35,height_cm:175,weight_kg:80,activity_level:'light',sex_for_equation:'male',
 objective:'fat_loss',dietary_pattern:'omnivore',processingConsent:true,pregnantOrBreastfeeding:false,
 clinicalCareRequired:false,eatingDisorderHistory:false,restrictionDeclaration:'none_declared',health_flags:[],
 disliked_food_ids:[],eating_window:'regular'};
const output=JSON.stringify(generateSelfManagedPlan(input,catalog));
const dollar='$ncc_qa_result$';if(output.includes(dollar))throw Error('Unexpected delimiter');
const sql='create table public.qa_result(payload jsonb);\ninsert into public.qa_result values('+dollar+output+dollar+'::jsonb);\ngrant select on public.qa_result to service_role;\n';
writeFileSync(new URL('./generated-qa-result.sql',import.meta.url),sql);
console.log('Generated fictional result fixture using current engine and catalog');
