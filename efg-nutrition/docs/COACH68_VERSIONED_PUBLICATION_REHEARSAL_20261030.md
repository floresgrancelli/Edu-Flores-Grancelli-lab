# COACH-68 · Servidor versionado para Nutrition Coach (ensayo aislado)

**Fecha:** 30 de octubre de 2026  
**Estado:** CANDIDATA EN PR #37 DRAFT · **NO GO** · cero publicación en Render/Supabase alojada.

## Problema cerrado en el contrato, pendiente de lanzamiento

Los SQL antiguos de borrador y publicación atómica validaban `public.efg_student_intakes`, mientras el relanzamiento obliga a completar `public.efg_coach_relaunch_intakes` con `completed_version='coach_major_2026_r1'`. Era peligroso activar ambos circuitos simultáneamente. La bandera `COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED=false` sigue impidiendo todas las vías de publicación.

## Implementación nueva, separada de los scripts antiguos

Se prepararon seis piezas de staging que **solo se compilan juntas en una base aislada y restaurable**:

1. `migrations/20261029_coach_intake_plan_access_DRAFT.sql` (acceso, ficha y plan Coach, preservando compatibilidad).
2. `docs/COACH_RELAUNCH_REONBOARDING_STAGING_ONLY.sql` (nueva ficha por alumno+versión y revisión, RLS y consentimiento explícito).
3. `docs/COACH68_VERSIONED_DRAFT_STAGING_ONLY.sql` (borrador privado, añadiendo `source_intake_revision` en la tabla y `p_intake_revision` a `efg_save_coach_plan_draft`; se bloquea la fuente obsoleta).
4. `docs/COACH68_VERSIONED_POLICY_STAGING_ONLY.sql` (evidencia alimentaria aprobada, patrones dietarios, aceptación legal vigente **del alumno y su coach**, revisión profesional/administrativa del contexto general ligada a versión, `updated_at` y `revision`; ausencia de evidencia = bloqueo).
5. `docs/NUT56_LEGACY_NOTIFICATION_COMPAT_STAGING_ONLY.sql` (compatibilidad de avisos, evitando notificaciones duplicadas).
6. `docs/COACH68_VERSIONED_ATOMIC_PUBLISH_STAGING_ONLY.sql` (transacción de objetivo+guía de cinco comidas+acceso+aviso+recibo idempotente; compara el `source_intake_revision` del borrador con la revisión actual y mantiene intactos los planes aprobados hasta el commit).

Los **SQL previos de publicación** no se editaron ni se reemplazaron en producción. El frontend de borradores `pilot/coach-plan-draft-client.js` está preparado para consultar solo la ficha nueva y enviar su revisión cuando el relanzamiento se autorice; `pilot/pilot.js` transmite la revisión. Las banderas de publicación y onboarding siguen en `false`.

## Pruebas automatizadas y límites de las evidencias

- `tests/coach68-versioned-server-contract.mjs` comprueba que las tres capas SQL y el contrato de cliente usan la versión/revisión actual, exigen permiso, validación de catálogo/legales, conservan idempotencia y nunca caen sobre la ficha antigua.
- `tests/coach68-stage-rollback.mjs --preview-sql` **no contiene modo COMMIT** y genera una única transacción `BEGIN … ROLLBACK` con las seis piezas. No posee credenciales ni conexión propia; GitHub Actions la ejecuta únicamente en una base PostgreSQL 17 `efg_nut57_restored` creada a partir de registros ficticios y un respaldo restaurado.
- `tests/sql/coach68-versioned-behavior.sql` ejercita afirmaciones ficticias dentro del mismo ROLLBACK: coach de otra organización, revisión cero, guardado privado válido, cambio de revisión con misma marca de tiempo, retiro de permiso, conservación de objetivos/diarios/avisos previos. Los IDs son sintéticos; `auth.uid()` usa **claims simulados** en PostgreSQL, no JWT reales para estas tres nuevas RPC.
- El workflow PostgreSQL exige además ausencia de `COMMIT` y de tablas nuevas tras ROLLBACK, y confirma conservación del histórico ficticio. Si falla una sentencia, aborta la prueba.
- **NO se ha probado todavía** esta versión final del circuito borrador→evidencia→publicación con tokens **firmados** GoTrue ni en un staging que reproduzca todo el esquema alojado. Los JWT firmados de la ficha de reingreso (COACH-64/65) cubren ese otro módulo, no autorizan a declarar probado este circuito COACH-68. Tampoco hay certificación de textos legales, diagnóstico clínico, semáforo médico ni fotos/catálogo reales.

## Qué falta exactamente para GO

1. Probar todas las RPC COACH-68 y las revocaciones con JWT firmados de Coach A/Coach B, Alumno A/Alumno B, múltiples sesiones y condiciones de carrera, incluyendo publicar exactamente una vez y rechazar alimentos/revisiones no validados.
2. Ejecutar una migración revisada sobre staging fiel con respaldo y restauración/PITR demostrados, incluyendo 19 funciones SECURITY DEFINER por auditar, permisos de clientes PWA anteriores y opciones de reversión sin pérdida de datos.
3. Obtener textos legales definitivos y criterios profesionales para la ficha de salud, restricciones y el catálogo: **no** inventar aprobación médica o legal ni marcar alimentos clínicamente seguros sin evidencia.
4. QA de punta a punta con iPhone y Android físicos, PC, menú Coach/Alumno/Admin, diarios, guía, notificaciones, pagos, mensajes, UX, versionado de sesiones y accesibilidad.
5. Verificar las cinco suites GitHub sobre **el mismo último SHA**, revisar PR y obtener autorización expresa del propietario antes de merge o deploy.

**Nutrition Autogestión permanece en pausa. Ninguna modificación alojada ni publicación fue autorizada o ejecutada.**


## COACH-69 · JWT firmados en GoTrue local (30/10/2026)

Se agregó **una fase real de autenticación local** después de que terminan las pruebas del circuito Coach anterior en el mismo stack descartable de Supabase. `tests/sql/coach69-disposable-local-version-switch.sql` exige el marcador de aislamiento, base local `postgres`, la tabla nueva de ficha y el esquema legado de prueba antes de retirar **solo en ese stack ficticio** las RPC/tablas antiguas de borrador, revisión alimentaria y publicación. A continuación el workflow aplica los tres SQL nuevos COACH-68 y relee el esquema de PostgREST; nunca se ejecuta contra Supabase alojada.

`tests/coach69-versioned-auth-local-e2e.mjs` crea nuevos usuarios ficticios mediante GoTrue y verifica el token con `/auth/v1/user`. Luego prueba de punta a punta: dos organizaciones, permisos negativos de coach/estudiante/anónimo, aceptación explícita de los dos documentos vigentes para alumno y coach, nueva ficha del alumno compartida, revisión vinculada al borrador, aislamiento RLS del borrador, rechazo por falta de evidencia alimentaria, evidencia/revisión totalmente sintéticas, publicación atómica de objetivo y cinco comidas, repetición idempotente del identificador sin nuevos recibos ni avisos, bloqueo de API antiguas y revocación posterior del permiso de compartir que impide lecturas, cambios y reenvíos. Se comprueba conservación del número histórico de objetivos anterior a la prueba, sumando exactamente uno tras aprobación.

**Evidencia de ejecución:** workflow `EFG Nutrition Supabase Auth local JWT/RLS QA`, run `41046329327`, commit `e33cc51b1dc988c4866af23477de178b9a0af1b9`: los pasos `COACH-69 switch ONLY disposable local stack` y `COACH-69 signed LOCAL JWT` finalizaron ambos `success` verificado en su lista de pasos. La comprobación de finalización del workflow completo y el resto de checks debe hacerse por ese mismo SHA.

Los resultados validan **control de acceso y mecánica de publicación con documentos y alimentos inventados**. NO son evidencia nutricional/diagnóstica para alimentos ni aprobación de legales, migración de producción, restauración PITR o uso en iPhone/Android reales. La bandera de publicación y la bandera de ingreso versionado permanecen OFF hasta GO documentado.
