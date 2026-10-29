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
