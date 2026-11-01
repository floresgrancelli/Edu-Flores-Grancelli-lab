# EFG Nutrition Pro — Nutritional profile and evidence roadmap
Status: product specification; not deployed. Reviewed 2026-10-29.

## Intake schema: three independent groups
1. Dietary preferences: omnivorous, vegetarian, vegan, pescatarian. User-controlled filters, reversible, transparent.
2. Voluntary health context (sensitive): self-reported diabetes, diagnosed fatty liver, celiac disease, hypertension, high cholesterol/dyslipidemia. Optional; explicit permission to share with assigned professional, secure RLS, ability to withdraw consent. Never infer diagnosis.
3. Existing real laboratory measurements, separate from derived nutritional quantities: measured fasting glucose and total cholesterol, with units, date and source; no invented laboratory values. Lab results do not diagnose conditions in this product.

## Scientific safety
The data may inform intake discussion, verified food-label cautions and referral prompts, but do not turn a condition checkbox into an automatic medical diet. No blanket ban on carbohydrates for diabetes or fat for fatty liver. Medical nutrition therapy should be individualized by qualified professionals.
For celiac users, distinguish verified gluten-free registered products from unknown status. ANMAT list: https://listadoalg.anmat.gob.ar/Home and https://www.argentina.gob.ar/anmat/alg .
A coach's professional qualifications should be displayed honestly; fitness coaches cannot automatically be presumed licensed dietitians.

## Computable versus non-computable
Nutrition-estimated: food-specific energy, macronutrients, fiber, sodium, sugar, saturated fats and vitamins/minerals ONLY when the source has reliable per-weight data. USDA FoodData Central https://fdc.nal.usda.gov/ ; prefer Argentine labels for branded foods and weight/cooking adjustments; handle coverage, missing nutrients and confidence.
Glycemic load/meal carbohydrate exposure: optional food-quality estimate where a validated glycemic-index source exists, with explicit confidence. Never present predicted blood glucose (mg/dL), HbA1c, blood pressure, liver enzymes or lipid panel as if inferred from food logs. These require actual measurement and other individual data; glucose responses to identical meals vary greatly (PREDICT1: https://pmc.ncbi.nlm.nih.gov/articles/PMC8265154/).
Diabetes guidance: ADA Standards of Care 2026 https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932 ; individualized nutrition therapy, no universal percentage of macros.

## Delivery plan
After UX1 closure, audit security and stage isolated Coach intake/plan-publishing. Add dietary preference UI and private health context as separate, opt-in modules AFTER legal/privacy + healthcare specialist review. Then nutritional quality dashboard and transparent nutrient coverage. Personal self-management after Coach stabilized; no automated clinical diet rules or numeric glucose predictions in initial release.
Neither production nor Supabase altered by this roadmap.

## Coach intake — first nonclinical profile increment (DRAFT PR #34, 29/10)
- Implemented **only in the Draft code and migration**, not in Supabase/Render:
  voluntary `dietary_pattern` (omnivorous, vegetarian, vegan, pescatarian or other),
  `preferred_foods`, `disliked_foods` specifically **by taste**, and
  `meal_routine` (self-reported times). All can be blank.
- Schema restricts pattern choices and length of each free-text preference field
  to 400 characters. The student chooses whether to share this whole intake with
  the linked coach and may withdraw permission or erase the intake.
- The coach sees these fields only through RLS with active link, accepted monitoring
  consent and non-NULL `shared_at`. No automated food bans or diagnostic inference.
- QA: synthetic tests for allowed/invalid patterns, length, private draft, shared
  view, revocation and post-publication erasure; staging with two organizations,
  real JWT and recoverable backup is still required.
- This set is useful for choosing meals in Nutrition Coach and is a reusable
  nonclinical preference basis for the later Personal mode.

## Phase after Coach security: separate voluntary health profile (NOT BUILT)
The exact user-requested distinctions matter:

| Group | Suggested UI fields | Safety / data treatment |
|---|---|---|
| Lifestyle / pattern | Vegetarian, vegan, pescatarian, other, food choices and routine | Editable freely, never equals a diagnosis |
| Diagnosed or self-reported context | Diabetes (without assuming type), celiac disease, fatty liver, hypertension, dyslipidemia/high cholesterol | Optional **distinct** checkboxes, provenance as self-reported, no inferred diagnosis; consent purpose and practitioner role to be reviewed |
| Food safety | Known medically documented allergens and confirmed gluten-free foods | No blanket exclusion from a free-text food dislike; products with verified gluten-free label must be checked against current ANMAT data |
| Measured laboratory history | Real glucose and lipid measurements (e.g. total cholesterol, LDL, HDL, triglycerides) | Values only with date, unit, source and real measurement; never inferred from diet logs |
| Follow-up and decisions | Which coach/provider may see each group, revocation, corrections and deletion rules | Separate revocable access with RLS and auditable records; legal/clinical review before collecting sensitive values |

- Glucose needs specimen/context (fasting, nonfasting or unknown), explicit unit
  mg/dL or mmol/L, date and verified self-report. There is no "glucose level"
  automatically computed from a weekly food log.
- Cholesterol and triglycerides need analyte distinctions, units and dates. Do
  not present all of them under a single editable "colesterol" number.
- User-supplied conditions can inform warnings and encourage consultation with
  an appropriately qualified provider; they cannot, by themselves, justify
  rigid restrictions or individualized treatment. For celiac food safety, do
  not label unknown products safe.
- The future nutritional quality view should show colorful food-group/coverage
  graphics, fiber/sodium/saturated fat only where supported by a traceable
  source, and distinct "not enough data" states. Unknown micronutrients
  are not zeros. Do not infer HbA1c, insulin, liver enzymes, blood pressure or
  serum cholesterol.
- **Release sequence:** finish Coach staged migration and E2E, review legal
  versioned terms/privacy, approve purpose-bound health consent and clinical
  workflows, build optional health profile with security testing, then build
  Personal guidance on top of the same food catalog and provenance model.
