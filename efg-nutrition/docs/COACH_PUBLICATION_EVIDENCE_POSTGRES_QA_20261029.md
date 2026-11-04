# EFG Nutrition Pro · QA de evidencia y publicación Coach, 29/10/2026
**PR #37 DRAFT · NO GO · no desplegar · ningún SQL aplicado a Supabase**.

## Qué está implementado en la candidata

- `docs/COACH_PUBLICATION_EVIDENCE_POLICY_STAGING_SQL_20261029.sql` propone fuentes nutricionales revisadas en `efg_private`, revisiones específicas por patrón vegano/vegetariano/pescetariano y comprobación de aceptación **actual y versionada** de términos y privacidad por **coach y alumno**. Ningún alimento ni alumno aparece precalificado. No acepta evidencia enviada desde el navegador y bloquea la ausencia o caducidad de revisiones.
- El alcance de la guía se limita al caso **general revisado** en un registro administrado por servidor: estatus `pending` predeterminado, sin almacenar diagnóstico ni deducir ausencia de enfermedad. Las alergias, celiaquía, condiciones médicas y decisiones clínicas no quedan autorizadas por esta comprobación ni reciben etiqueta verde.
- `docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql` mantiene borradores privados; `docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql` formula una aprobación única de meta + guía + acceso + notificación + recibo idempotente, restringiendo escrituras antiguas directas. **No migrar por separado; el cliente antiguo necesita adaptación.**
- `tests/coach-publication-evidence-policy-contract.mjs` ofrece control estático negativo. `tests/sql/coach-staging-bootstrap.sql` y `tests/sql/coach-staging-scenarios.sql` crean datos **ficticios** de dos organizaciones. Un workflow nuevo ejecuta PostgreSQL 16 temporal sobre estos artefactos.

## Evidencia de la ejecución real de PostgreSQL 16 (primera suite)

Run [40950802502](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/40950802502), `SUCCESS`, commit `33e882b731e69553bb0ee496eeed5367e4a9ac14`. En esa misma revisión Security [40950802552](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/40950802552) SUCCESS, Premium [40950802499](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/40950802499) SUCCESS; Visual [40950802545](https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/40950802545) verificar al cierre.

PostgreSQL temporal realmente parseó y ejecutó el SQL de las tres etapas. La suite cubre: alta y aislamiento de datos sintéticos A/B, borrador privado del Coach A, rechazo de publicación sin evidencia/aceptación, rechazo de Coach A sobre alumno B, denegación de INSERT directo a objetivos por `authenticated`, carga de evidencia y aceptaciones **solo ficticias**, publicación válida con objetivo + guía + acceso + 1 notificación + 1 recibo, reintento idempotente sin duplicados, nueva revisión del borrador publicado y bloqueo por revocación del permiso. 

**Límites esenciales:** el modelo relacional de GitHub Actions es una reconstrucción mínima, NO una copia exacta de todas las migraciones, triggers, grants, extensiones, políticas ni configuración de la base Supabase. La identidad `auth.uid()` se simuló con un parámetro de sesión: **no se probaron JWT firmados ni Auth/OTP reales**. La URL del alimento ficticio `example.org` es un dato de prueba y **no constituye fuente nutricional autorizada**. Ningún usuario real ni dato de salud se usó; el workflow no conecta a Supabase, Render ni emails, no crea recursos persistentes.

## Bloqueos para cualquier publicación

1. **Staging Supabase aislado y restaurable** con el esquema realmente equivalente a producción; el proyecto actual no tiene ramas de desarrollo. Requiere autorización previa si se crea un recurso con cargo. Probar restauración, migrations y compatibilidad de roles.
2. JWT reales de dos organizaciones y tres roles; intentar REST directo, RPC cross-org, compartir y revocar ficha, consentimientos vigentes, sesiones antiguas, pérdida de red y condiciones concurrentes. No usar datos personales de producción.
3. Crear y validar la fuente **servidor** de alimentos con identificación de composición, lote/formulación cuando aplique, fuente real y revisores. Garantizar que valores `k,p,c,f,fi` por g/ml coincidan, y que productos sin evidencia o con fuente vencida **nunca** se marquen seguros.
4. Elaborar, revisar jurídicamente y aprobar Términos/Política, responsable legal y privacidad. Recién entonces construir tablas legales inmutables y aceptación trazable; la prueba sintética no suple este trabajo.
5. Definir requisitos profesionales y consentimiento separado para salud, celiaquía, alergias y patologías; ninguna regla de patrones alimentarios equivale a autorización clínica. No mostrar semáforo verde para incertidumbres.
6. Adaptar las pantallas Coach de guardar meta y guía a RPC de borrador y nueva publicación atómica; evitar que un despliegue de revocación de writes rompa histórico. Verificar diarios actuales y nuevos, roles Personal, notificaciones sin spam.
7. Revisar calidad visual de screenshots, iPhone/Android físicos, serotonina de carga y presentación mayor **OFF** hasta el GO explícito.

## Decisión

**CI PostgreSQL sintético aprobado; lanzamiento sigue NO GO.** El artefacto SQL sigue en `docs/` marcado STAGING ONLY, sin migración aplicada, sin merge a `efg-nutrition-app`, sin deploy Render, sin Auth/logout ni mensajes a usuarios. Prioridad siguiente: staging/JWT real + evidencia y revisión jurídica/profesional antes de modificar permisos productivos.
