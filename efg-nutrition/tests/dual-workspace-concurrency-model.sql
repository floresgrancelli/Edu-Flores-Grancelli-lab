-- Newly authored synthetic concurrency model. NOT a migration or a captured schema.
-- Names, rows, functions and permissions here do not represent the application database.
DO $$ BEGIN
 IF current_database() <> 'ncc_synthetic' OR current_setting('ncc.synthetic',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'Disposable synthetic database required'; END IF;
END $$;
CREATE SCHEMA model;
CREATE TABLE model.space(id int PRIMARY KEY, owner_id int NOT NULL, managed boolean NOT NULL,
 enabled boolean NOT NULL, terms boolean NOT NULL, capacity int NOT NULL CHECK(capacity>=0));
CREATE TABLE model.cap(space_id int PRIMARY KEY REFERENCES model.space, owner_id int NOT NULL, enabled boolean NOT NULL);
CREATE TABLE model.person(id int PRIMARY KEY, space_id int, active boolean NOT NULL, consent boolean NOT NULL);
CREATE TABLE model.personal(id int PRIMARY KEY, mentor int, identity jsonb, plan jsonb);
CREATE TABLE model.invite(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, space_id int NOT NULL,
 address text NOT NULL UNIQUE CHECK(address LIKE '%@example.invalid'), claimed int, cancelled boolean NOT NULL DEFAULT false);
CREATE TABLE model.receipt(actor int, request text, operation text, payload jsonb, result jsonb,
 PRIMARY KEY(actor,request));
CREATE FUNCTION model.permitted(p_space int, p_terms boolean DEFAULT true) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT s.enabled AND (NOT p_terms OR s.terms) AND
  (NOT s.managed OR EXISTS(SELECT 1 FROM model.cap c WHERE c.space_id=s.id AND c.owner_id=s.owner_id AND c.enabled))
  FROM model.space s WHERE s.id=p_space),false)
$$;
CREATE FUNCTION model.context(p_actor int,p_space int) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT model.permitted(p_space) AND EXISTS(SELECT 1 FROM model.space WHERE id=p_space AND owner_id=p_actor)
$$;
CREATE FUNCTION model.mutate(p_actor int,p_request text,p_op text,p jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE s model.space%rowtype; r model.receipt%rowtype; v_id bigint; used int; answer jsonb;
BEGIN
 -- Uniform hierarchy: request, optional address, workspace, child rows.
 PERFORM pg_advisory_xact_lock(hashtextextended('request:'||p_actor||':'||p_request,0));
 IF p_op IN ('invite','claim') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('address:'||coalesce(p->>'address',''),0));
 END IF;
 SELECT * INTO s FROM model.space WHERE id=(p->>'space')::int FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown space' USING ERRCODE='42501'; END IF;
 IF p_op IN ('seats','revoke') THEN
  IF p_actor<>1 THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 ELSE
  IF NOT model.permitted(s.id,p_op<>'terms') OR (p_op<>'claim' AND s.owner_id<>p_actor)
  THEN RAISE EXCEPTION 'Access revoked or inconsistent' USING ERRCODE='42501'; END IF;
 END IF;
 -- Authorization deliberately precedes replay; lock acquisition never returns data.
 SELECT * INTO r FROM model.receipt WHERE actor=p_actor AND request=p_request;
 IF FOUND THEN
  IF r.operation<>p_op OR r.payload<>p THEN RAISE EXCEPTION 'Idempotency conflict' USING ERRCODE='22023'; END IF;
  RETURN r.result;
 END IF;
 IF p_op='revoke' THEN
  UPDATE model.space SET enabled=false WHERE id=s.id;
  UPDATE model.cap SET enabled=false WHERE space_id=s.id;
 ELSIF p_op='seats' THEN
  SELECT (SELECT count(*) FROM model.person WHERE space_id=s.id AND active)+
   (SELECT count(*) FROM model.invite WHERE space_id=s.id AND claimed IS NULL AND NOT cancelled) INTO used;
  IF (p->>'count')::int<used THEN RAISE EXCEPTION 'Occupied capacity' USING ERRCODE='23514'; END IF;
  UPDATE model.space SET capacity=(p->>'count')::int WHERE id=s.id;
 ELSIF p_op='invite' THEN
  SELECT (SELECT count(*) FROM model.person WHERE space_id=s.id AND active)+
   (SELECT count(*) FROM model.invite WHERE space_id=s.id AND claimed IS NULL AND NOT cancelled) INTO used;
  IF used>=s.capacity THEN RAISE EXCEPTION 'Capacity full' USING ERRCODE='23514'; END IF;
  INSERT INTO model.invite(space_id,address) VALUES(s.id,p->>'address') RETURNING id INTO v_id;
 ELSIF p_op='claim' THEN
  SELECT id INTO v_id FROM model.invite WHERE space_id=s.id AND address=p->>'address' AND claimed IS NULL AND NOT cancelled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO model.person VALUES(p_actor,s.id,true,false);
  UPDATE model.invite SET claimed=p_actor WHERE id=v_id;
 ELSIF p_op='active' THEN
  PERFORM 1 FROM model.person WHERE id=(p->>'person')::int AND space_id=s.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wrong person' USING ERRCODE='42501'; END IF;
  IF (p->>'value')::boolean AND NOT (SELECT active FROM model.person WHERE id=(p->>'person')::int) THEN
   SELECT (SELECT count(*) FROM model.person WHERE space_id=s.id AND active)+
    (SELECT count(*) FROM model.invite WHERE space_id=s.id AND claimed IS NULL AND NOT cancelled) INTO used;
   IF used>=s.capacity THEN RAISE EXCEPTION 'Capacity full' USING ERRCODE='23514'; END IF;
  END IF;
  UPDATE model.person SET active=(p->>'value')::boolean,consent=false WHERE id=(p->>'person')::int AND active IS DISTINCT FROM (p->>'value')::boolean;
 ELSIF p_op IN ('cancel','delete') THEN
  SELECT id INTO v_id FROM model.invite WHERE space_id=s.id AND address=p->>'address' AND claimed IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unclaimed invitation required' USING ERRCODE='42501'; END IF;
  IF p_op='delete' THEN DELETE FROM model.invite WHERE id=v_id;
  ELSE UPDATE model.invite SET cancelled=true WHERE id=v_id; END IF;
 ELSIF p_op='terms' THEN UPDATE model.space SET terms=true WHERE id=s.id;
 ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE='22023'; END IF;
 answer:=jsonb_build_object('operation',p_op,'space',s.id,'id',v_id);
 INSERT INTO model.receipt VALUES(p_actor,p_request,p_op,p,answer);
 RETURN answer;
END $$;
CREATE FUNCTION model.compat(p_actor int,p_request text,p_op text,p jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT model.mutate(p_actor,p_request,p_op,p)
$$;
-- Instrumented late-selection test, solely for a new READ COMMITTED statement snapshot.
CREATE FUNCTION model.late_claim(p_guard boolean,p_pause bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE seen boolean; target int;
BEGIN
 SELECT EXISTS(SELECT 1 FROM model.invite WHERE address='late@example.invalid') INTO seen;
 IF seen THEN RAISE EXCEPTION 'Expected empty initial selection'; END IF;
 PERFORM pg_advisory_xact_lock(p_pause);
 SELECT space_id INTO target FROM model.invite WHERE address='late@example.invalid' FOR UPDATE;
 IF p_guard AND EXISTS(SELECT 1 FROM model.space WHERE id=target AND managed)
 THEN RAISE EXCEPTION 'Target changed' USING ERRCODE='40001'; END IF;
 INSERT INTO model.person VALUES(88,target,true,false);
END $$;
