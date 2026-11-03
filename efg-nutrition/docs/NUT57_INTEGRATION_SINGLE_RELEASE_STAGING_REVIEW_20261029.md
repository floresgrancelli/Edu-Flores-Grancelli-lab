# NUT-57 — integración transaccional: avance verificable y bloqueos del único gran lanzamiento

**29/10/2026 · EFG Nutrition Pro · PR #37 DRAFT · STAGING/LOCAL únicamente · NO GO.**

## Decisión del propietario
La gran actualización será **una sola publicación final**, sin lanzar módulos parciales. Incluye la nueva UX de comidas y búsqueda, habituales, dietas guía educativas, lógica coach y alumno, Autogestión, restricciones médicas/dietarias, documentos legales, controles de acceso y presentación de relanzamiento. No hacer merge, despliegue, migración hospedada o mensajes a usuarios hasta QA, aprobación y autorización explícita.

## Trabajo efectuado en NUT-57
Se incorporó `tests/nut57-staging-bundle.mjs` con dos comandos **exclusivamente de revisión**:

```bash
node efg-nutrition/tests/nut57-staging-bundle.mjs --status
node efg-nutrition/tests/nut57-staging-bundle.mjs --preview-sql > nut57-STAGING-REVIEW-ROLLBACK-ONLY.sql
```

El segundo comando **NO ES UNA MIGRACIÓN NI DEBE APLICARSE A PRODUCCIÓN**. Genera una concatenación temporal, determinista, de los cinco módulos actualmente versionados, tomando SHA-256 de cada fuente y validando su estructura de transacciones. El resultado tiene una sola instrucción externa `BEGIN;` y **termina exclusivamente con `ROLLBACK;`**. No existe opción `--apply`, `--commit`, `--deploy` ni conexión a ninguna base desde la herramienta. Los scripts originales permanecen intactos.

Orden estudiado:

1. `migrations/20261029_coach_intake_plan_access_DRAFT.sql`: ficha, acceso, conservación de usuarios históricos y permisos de nutrición.
2. `docs/COACH_PLAN_DRAFT_STAGING_SQL_20261029.sql`: borrador privado del coach y revisión segura.
3. `docs/COACH_PUBLICATION_EVIDENCE_POLICY_STAGING_SQL_20261029.sql`: reglas fail-closed con fuentes alimentarias y aceptación legal versionada.
4. `docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql`: evita triple aviso manteniendo triggers heredados en operaciones independientes.
5. `docs/COACH_PLAN_ATOMIC_PUBLISH_STAGING_SQL_20261029.sql`: meta + guía + habilitación + una notificación + recibo idempotente en una RPC.

Antes del primer `LOCK`/`CREATE`, una guarda SQL exige una tabla-marker de una base aislada `efg_private.nut57_isolated_staging_marker` y la presencia del esquema actual de usuarios, metas, guías, consentimientos y tablas legales. El marker **no es una prueba de seguridad ni un sustituto de controles organizacionales**: no se instala en producción. El SQL de ensayo mantiene `SET LOCAL lock_timeout='3s'` y `statement_timeout='45s'` para minimizar bloqueos en pruebas. Incluso con todos los requisitos, **se revierte siempre**.

## Pruebas automáticas añadidas
- `tests/nut57-staging-bundle-contract.mjs`, invocado por Premium QA: un solo BEGIN/ROLLBACK externo, sin COMMIT, 5 módulos en orden, hashes, fuente completa, compat de avisos, revocación de escritura directa legacy, imposibilidad de usar `--apply-production` y estado RELEASE NO GO.
- Workflow PostgreSQL 17 efímero: genera el SQL de ensayo y verifica que **falle antes del DDL** cuando no está instalado el marker. Comprueba que la cantidad de metas ficticias no cambió. **Este ensayo negativo NO prueba que la secuencia completa de 5 módulos aplique con éxito**.
- Las pruebas locales anteriores NUT-53 a NUT-56 siguen usando modelos sintéticos y JWT firmado local; no equivalen al esquema completo hospedado, OTP externo ni al backup completo.

## Bloqueos reales, sin simular aprobaciones
1. **LEGAL-07:** aún no existe implementación definitiva y revisada de `efg_legal_documents`, `efg_legal_acceptances`, RPC de consentimiento/versionado inmutable y acceso a derechos; las tablas de test son sólo facsímiles ficticios. Revisión jurídica de Términos y Privacidad antes de habilitar.
2. **CLÍNICA/CATÁLOGO:** fuente verificada, alérgenos/celiaquía, restricciones y semáforo evaluados por profesional competente; el código no demuestra que un alimento sea seguro para una persona con condición médica. No sembrar tablas de evidencia marcándolas "reviewed" sin revisión.
3. **ESQUEMA COMPLETO:** el primer módulo contiene `LOCK` y backfill de alumnos antiguos que requieren auditoría real de restricciones, tablas, triggers, RLS y plan de mantenimiento. Staging actual de QA ya tiene estructuras duplicadas y **NO es réplica fiel de producción**; no usarlo para afirmar éxito de migración integral.
4. **RESTORE INTEGRAL:** NUT-55 demostró restauración de sólo tres tablas sintéticas. Faltan backup/restauración de alcance completo, ensayo de falla intermedia, concurrencia y compat con clientes/PWA antiguos. No copiar datos personales a entornos de prueba.
5. **AUTOGESTIÓN / QA:** pendiente completar ese flujo real y revisar las restricciones y permisos en los cuatro roles (Admin, Coach, Alumno, Personal). Faltan pruebas físicas Safari MacBook, iPhone, Android y confirmación de experiencia de relanzamiento.
6. **CUTOVER:** finalización de migración definitiva aprobada con una sola transacción y ensayos POSITIVOS en staging autorizado, estrategia comprobada de backup/rollback posterior al commit, mantenimiento/compatibilidad de versiones, revisión de seguridad/legal/nutrición y GO explícito.

**Estado NUT-57:** ahora hay **ensamblador seguro para revisión y prueba de rechazo previa a DDL**. No hay migración final lista ni SQL ejecutado sobre Supabase Pro. `COACH_ATOMIC_PLAN_UI_ENABLED=false`, `LEGAL_ONBOARDING_ENABLED=false`. Producción Render permanece en rama `efg-nutrition-app` SHA `9000e4d8e08bd9483770209a863b1cdba2141c43`; PR #37 continúa DRAFT. No hay cargo de rama staging nueva.

**Próximo paso:** diseño y validación del backend legal versionado + reproducción del esquema productivo completo en un staging aislado/restaurable antes de probar la aplicación real de los cinco módulos de manera transaccional, sin tocar producción.
