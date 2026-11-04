-- PRIVATE REVIEW ONLY. Not a migration, not applied, not exposed by a public RPC.
-- Depends on candidate 001..006; adds no authenticated/anon grants.
BEGIN;
CREATE TABLE efg_private.clinical_source_versions(
 id text PRIMARY KEY, manifest jsonb NOT NULL, normalized_record jsonb NOT NULL,
 original_text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(manifest)='object'),CHECK(jsonb_typeof(normalized_record)='object')
);
CREATE TABLE efg_private.clinical_compatibility_receipts(
 student_id uuid PRIMARY KEY REFERENCES public.efg_profiles(user_id),
 coach_id uuid NOT NULL,organization_id uuid NOT NULL,draft_revision bigint NOT NULL,
 binding text NOT NULL CHECK(binding ~ '^[a-f0-9]{64}$'), result jsonb NOT NULL,
 evaluated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE efg_private.clinical_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE efg_private.clinical_compatibility_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON efg_private.clinical_source_versions,efg_private.clinical_compatibility_receipts FROM PUBLIC,anon,authenticated;
-- Version registry is empty. Only a separately reviewed, authorized import can
-- insert original captures and anchored normalized rules. No client ingestion RPC.
-- Shared acquisition order for read/prepare/save/pattern/publication, BEFORE
-- any intake/draft locks. No SHARE table lock can conflict with withdrawal DML.
CREATE FUNCTION efg_private.clinical_lock_context(p_student uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN
 IF auth.uid() IS NULL OR NOT efg_private.coach_has_student(p_student) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.efg_student_plan_access WHERE student_id=p_student AND coach_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current coach access required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.efg_profiles WHERE user_id IN(p_student,auth.uid()) ORDER BY user_id FOR SHARE;
 PERFORM 1 FROM public.efg_organizations WHERE id=(SELECT organization_id FROM public.efg_profiles WHERE user_id=p_student) FOR SHARE;
 PERFORM 1 FROM public.efg_pilot_participation_receipts WHERE student_id=p_student ORDER BY version FOR SHARE;
 PERFORM 1 FROM public.efg_consents WHERE student_id=p_student ORDER BY organization_id FOR SHARE;
 -- Recheck authorization AFTER lock waits, not only against the earlier snapshot.
 IF NOT efg_private.coach_has_student(p_student)
 OR NOT efg_private.coach_pilot_share_active(p_student,(SELECT organization_id FROM public.efg_profiles WHERE user_id=p_student))
 OR NOT EXISTS(SELECT 1 FROM public.efg_consents c JOIN public.efg_profiles p ON p.user_id=c.student_id AND p.organization_id=c.organization_id WHERE c.student_id=p_student AND c.accepted)
 THEN RAISE EXCEPTION 'Authorization withdrawn while waiting' USING ERRCODE='42501'; END IF;

END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_lock_context(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION efg_private.clinical_provider_context(p_student uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE i record;h record;d record;b record;doc record;uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR nullif(auth.jwt()->>'session_id','') IS NULL
 OR NOT efg_private.coach_has_student(p_student) THEN RAISE EXCEPTION 'Denied' USING ERRCODE='42501'; END IF;
 PERFORM efg_private.clinical_lock_context(p_student);
 SELECT * INTO i FROM public.efg_coach_relaunch_intakes WHERE student_id=p_student AND completed_version='coach_major_2026_r1' FOR UPDATE;
 SELECT * INTO h FROM efg_private.efg_coach_health_intakes WHERE student_id=p_student FOR UPDATE;
 PERFORM 1 FROM efg_private.efg_coach_health_documents WHERE status='published' ORDER BY id FOR SHARE;
 SELECT * INTO d FROM public.efg_coach_plan_drafts WHERE student_id=p_student FOR UPDATE;
 SELECT * INTO b FROM efg_private.guide_source_bindings WHERE student_id=p_student FOR UPDATE;
 PERFORM 1 FROM efg_private.coach_reviewed_foods WHERE food_id=ANY(b.food_ids) ORDER BY food_id FOR SHARE;
 PERFORM 1 FROM efg_private.nutrition_import_policies WHERE active ORDER BY policy_version FOR SHARE;
 PERFORM 1 FROM efg_private.clinical_source_versions WHERE normalized_record->>'foodId'=ANY(b.food_ids) AND manifest->>'active'='true' ORDER BY id FOR SHARE;
 SELECT * INTO doc FROM efg_private.efg_coach_health_documents WHERE id=h.consent_document_id;
 IF i.student_id IS NULL OR h.student_id IS NULL OR d.student_id IS NULL OR b.student_id IS NULL
 OR i.dietary_pattern NOT IN ('omnivore','keto') OR i.dietary_pattern IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.efg_profiles p WHERE p.user_id=p_student AND p.organization_id=i.organization_id AND p.active AND p.role='student')
 OR d.coach_id IS DISTINCT FROM uid OR b.coach_id IS DISTINCT FROM uid OR d.status<>'draft'
 OR h.organization_id IS DISTINCT FROM i.organization_id OR d.organization_id IS DISTINCT FROM i.organization_id
 OR b.organization_id IS DISTINCT FROM i.organization_id
 OR b.intake_revision IS DISTINCT FROM i.revision OR b.health_revision IS DISTINCT FROM h.revision
 OR b.draft_revision IS DISTINCT FROM d.draft_revision
 OR h.shared_at IS NULL OR i.shared_at IS NULL OR h.consent_accepted_at IS NULL
 OR doc.status IS DISTINCT FROM 'published' OR doc.sha256 IS DISTINCT FROM h.consent_sha256
 OR doc.published_at IS NULL OR doc.published_at>clock_timestamp()
 OR doc.sha256 IS DISTINCT FROM encode(sha256(convert_to(doc.content_text,'UTF8')),'hex')
 OR NOT efg_private.coach_pilot_share_active(p_student,i.organization_id)
 OR NOT EXISTS(SELECT 1 FROM public.efg_consents c WHERE c.student_id=p_student AND c.organization_id=i.organization_id AND c.accepted)
 THEN RAISE EXCEPTION 'Current shared sources required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('actorId',uid,'authorizedCoachId',d.coach_id,'sessionId',auth.jwt()->>'session_id',
 'studentId',p_student,'organizationId',i.organization_id,'studentOrganizationId',h.organization_id,
 'active',true,'processingConsent',true,'followupConsent',true,'shared',true,'documentCurrent',true,'revoked',false,
 'healthRevision',h.revision,'intakeRevision',i.revision,'draftRevision',d.draft_revision,
 'conditions',h.conditions,'declaration',h.restriction_declaration,'dislikedIds',b.disliked_ids,
 'goal',d.goal_proposal,'plan',d.guide_proposal,'dietaryPattern',i.dietary_pattern,'pattern',jsonb_build_object('kind','general'),
 'now',extract(epoch from clock_timestamp())*1000);
END $f$;
REVOKE ALL ON FUNCTION efg_private.clinical_provider_context(uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
-- The current bound prepare/save/publication still reject clinical declarations.
-- Do NOT remove none_declared or expose this helper until a reviewed transactional
-- integration and sufficient real evidence exist. No signing keys/new runtime here.
