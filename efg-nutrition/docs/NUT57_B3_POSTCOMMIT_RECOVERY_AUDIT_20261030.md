# NUT-57 · Fase B3 — Auditoría de dependencias y recuperación POST-COMMIT (sintética)

**Fecha:** 30/10/2026  
**Estado:** PR #37 DRAFT · RELEASE NO GO · NO tocar producción.

## Prueba POSITIVA realizada

GitHub Actions PostgreSQL 17, ejecución **41004147755 — SUCCESS**, en runner aislado y bases ficticias sin credenciales ni datos alojados:

1. Generar una base preactualización exclusivamente ficticia con dos organizaciones, dos alumnos históricos, guía, objetivo, pesos, actividades, diarios, comidas habituales y recetas.
2. Tomar `pg_dump -Fc` antes de migrar. Restaurarlo en una base nueva mediante `pg_restore --exit-on-error`.
3. Ejecutar los cinco módulos NUT-57 en una única transacción sin persistencia para verificar compatibilidad y reversiones por error.
4. En otra base de **nombre fijo** `efg_nut57_postcommit`, restaurar el mismo backup, instalar el diseño legal sintético y transformar el preview ROLLBACK-only a COMMIT **dentro del CI**. El transformador `tests/nut57-ci-fixture-commit.mjs` exige a la vez `GITHUB_ACTIONS=true`, `PGHOST=127.0.0.1`, `PGDATABASE=efg_nut57_postcommit` y `NUT57_SYNTHETIC_RESTORE_TEST=true`; valida que el preview tenga exactamente un BEGIN y ROLLBACK y cinco fuentes SHA. NO se modifica `tests/nut57-staging-bundle.mjs`, que continúa sin modo de COMMIT.
5. Verificar que el COMMIT persistió tablas nuevas, recibos de publicación y backfill de los dos alumnos, mientras la huella histórica determinista de **12 tablas sintéticas** continuó idéntica a la anterior.
6. Destruir **únicamente esa base ficticia del CI**, crearla nuevamente y restaurar el backup preactualización. Comprobar que desaparecieron las tablas nuevas y que regresaron esquema, conteos y huella histórica originales.
7. Repetir los controles de 15 columnas nutricionales y RLS de cinco tablas; contrastar siete eventos de triggers y cinco restricciones `CHECK` del viejo esquema ficticio.

En la primera ejecución se detectó un **error de formato de nueva consulta SQL** antes de ejecutar el escenario COMMIT; quedó corregido en `tests/sql/nut57-synthetic-history-fingerprint.sql`. Después, el workflow PostgreSQL 17 confirmó el escenario B3 con mensaje `PASS NUT57 B3: COMMIT really persisted ... exact 12-table history digest after destructive restore`.

## Dependencias comparadas por metadatos del Supabase alojado (lecturas SELECT, sin filas)

La consulta de `information_schema.triggers` identificó exactamente los siguientes eventos relevantes del sistema previo: `efg_consent_identity_immutable` (BEFORE UPDATE en consentimientos), `efg_food_plan_lock_owner` (BEFORE UPDATE en guía), `efg_verify_guide_goal` (BEFORE INSERT/UPDATE en guía), `trg_efg_notify_food_guide` (AFTER INSERT/UPDATE) y `trg_efg_notify_goal` (AFTER INSERT). Son **7 combinaciones trigger/evento** con nombres de cinco triggers.

De `information_schema.table_constraints` se constataron nombres y tipos de restricciones relevantes, incluidos `meals_object`, `sports_array`, `approved_food_ids_limit`, `efg_guided_plan_shape` y `profile_org_role`. Se incorporaron al fixture los dos CHECK de diario faltantes y se añadió `tests/sql/nut57-b3-dependency-contract.sql` para fallar si alguno de los siete eventos o cinco CHECK falta en la copia sintética antes de tomar el backup o después de restaurarlo.

La observación **no comparó todavía** definiciones completas de `pg_get_triggerdef`, cuerpos de funciones, todas las constraints, extensiones, dueños, permisos GRANT, políticas RLS por rol o carga de concurrencia. Algunos accesos de lectura de metadatos ampliados no estuvieron disponibles; no se inventó información para completarlos.

## MUY IMPORTANTE — qué NO queda aprobado

Este experimento demuestra que un **backup de una base totalmente ficticia** puede recuperar el estado anterior después de un COMMIT de cinco módulos también ficticio/aislado. **NO es una restauración real del Supabase de EFG Nutrition**, ni garantiza que no se perderían escrituras realizadas entre respaldo y incidente. No valida PITR, ventanas de corte, restauración de todos los esquemas, usuarios Auth, credenciales, Storage, pagos, mensajería, OTP, PWA instalada, planes de coach, permisos entre organizaciones ni dispositivos físicos.

**No es viable prometer RPO cero** sin bloquear escrituras o tener mecanismos de replay/PITR comprobados. El próximo gate requiere acordar y probar en staging autorizado la capacidad concreta de backup/PITR del proyecto, RPO/RTO, pausa de escrituras, procedimiento de vuelta atrás y reconciliación de cambios post-backup, con revisiones legal/nutricional y prueba de compatibilidad PWA.

**Sistema público:** Render último deploy verificado `9000e4d8e08bd9483770209a863b1cdba2141c43`; **PR #37 sigue DRAFT sin merge**. `LEGAL_ONBOARDING_ENABLED=false` y `COACH_ATOMIC_PLAN_UI_ENABLED=false`. Ninguna migración se ejecutó en Supabase hospedado.

**Continuidad:** Plan Maestro Google Sheets, pestañas «Continuidad chat» y «Control QA». **Único lanzamiento** tras todos los gates y GO expreso.
