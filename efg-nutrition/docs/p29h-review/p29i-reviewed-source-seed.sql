-- ALREADY INSTALLED P29I. Audit copy; safe default rolls back. Do not reapply.
begin;
lock table efg_private.coach_reviewed_foods in share row exclusive mode;
do $$ begin
 if exists(select 1 from efg_private.coach_reviewed_foods) then raise exception 'P29I expects empty review registry; no overwrite';end if;
 if not exists(select 1 from efg_private.p29_qa_release_scope where student_id='09f08bd9-9acf-4348-9200-21a5df396aa5' and revoked_at is null and expires_at>now()) then raise exception 'QA scope expired';end if;
end $$;
insert into efg_private.coach_reviewed_foods(food_id,catalog_version,unit,k,p,c,f,fi,source_kind,source_url,evidence_id,evidence_status,reviewed_by,reviewed_at,expires_at) values
('apple','ncc_p29h_qa_20261104','g',0.52,0.0026,0.1381,0.0017,0.024,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/171688','P29I_QA_20261104_apple','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('banana','ncc_p29h_qa_20261104','g',0.89,0.0109,0.2284,0.0033,0.026,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/173944','P29I_QA_20261104_banana','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('brownrice','ncc_p29h_qa_20261104','g',1.23,0.0274,0.2558,0.0097,0.016,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/169704','P29I_QA_20261104_brownrice','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('coffee_black','ncc_p29h_qa_20261104','ml',0.010009,0.001201,0.0,0.0002,0.0,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/171890','P29I_QA_20261104_coffee_black','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('egg','ncc_p29h_qa_20261104','g',1.48,0.124,0.0096,0.0996,0.0,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/748967','P29I_QA_20261104_egg','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('egg_white','ncc_p29h_qa_20261104','g',0.52,0.109,0.0073,0.0017,0.0,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/172183','P29I_QA_20261104_egg_white','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('fish_hake','ncc_p29h_qa_20261104','g',0.99,0.193,0.0,0.0242,0.0,'validated_composition','https://tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0190E','P29I_QA_20261104_fish_hake','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('mandarin','ncc_p29h_qa_20261104','g',0.53,0.0081,0.1334,0.0031,0.018,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/169105','P29I_QA_20261104_mandarin','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('oil','ncc_p29h_qa_20261104','g',8.84,0.0,0.0,1.0,0.0,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/171413','P29I_QA_20261104_oil','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('potato','ncc_p29h_qa_20261104','g',0.86,0.0171,0.2001,0.001,0.018,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/170440','P29I_QA_20261104_potato','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('pumpkin','ncc_p29h_qa_20261104','g',0.4,0.009,0.1049,0.0009,0.032,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/169296','P29I_QA_20261104_pumpkin','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('rocket','ncc_p29h_qa_20261104','g',0.25,0.0258,0.0365,0.0066,0.016,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/169387','P29I_QA_20261104_rocket','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz),
('tofu_firm','ncc_p29h_qa_20261104','g',1.44,0.1727,0.0278,0.0872,0.023,'validated_composition','https://api.nal.usda.gov/fdc/v1/food/172475','P29I_QA_20261104_tofu_firm','reviewed','48855587-fa46-4800-ad1f-7f7d58a2fb6b'::uuid,statement_timestamp(),'2026-11-04T18:32:12.163398Z'::timestamptz);
-- Validation uses ROLLBACK; installation uses COMMIT only after validation.
rollback;
