# SEC-08 · Auditoría de permisos reales en Supabase — Nutrition Coach

**Fecha:** 30/10/2026 · **Proyecto alojado:** `cyjvddhimbsfipjfctsl`  
**Modo de ejecución:** exclusivamente consultas `SELECT` al catálogo PostgreSQL y lectura de advertencias. **Ningún cambio de permisos, políticas, funciones, usuarios o datos.**

## Hallazgos constatados

La consulta reproducible en `docs/SEC08_LIVE_READONLY_AUDIT_20261030.sql` devolvió:

| Indicador | Observado |
| --- | ---: |
| Funciones `SECURITY DEFINER` accesibles al rol `authenticated` | **19** |
| Funciones privilegiadas accesibles al rol `anon` | **0** |
| Funciones de esas 19 sin `search_path` explícitamente restringido | **0** |
| Funciones de esas 19 cuyo texto NO refiere ni a `efg_private.is_admin()` ni a `auth.uid()` | **0** |
| Exposiciones directas de las 2 tablas internas con RLS sin política a `anon` o `authenticated` | **0** |
| Componentes indispensables del relanzamiento Nutrition Coach que aún faltan en producción | **7** |

Las 19 funciones públicas de la advertencia de Supabase son:
`efg_activate_paid_coach`,
`efg_claim_invitation`,
`efg_confirm_payment`,
`efg_delete_pending_invitation`,
`efg_invite_coach`,
`efg_invite_student`,
`efg_invite_test_student`,
`efg_offer_coach`,
`efg_revoke_invitation`,
`efg_revoke_test_invitation`,
`efg_set_coach_alias`,
`efg_set_coach_plan`,
`efg_set_platform_alias`,
`efg_set_platform_aliases`,
`efg_set_seats`,
`efg_set_student_active`,
`efg_submit_coach_payment`,
`efg_submit_payment` y
`efg_update_subscription`.

**Privacidad del alumno:** la ausencia de acceso anónimo y la presencia de RLS no demuestran por sí solas aislamiento entre organizaciones. Antes de publicar deben confirmarse solicitudes firmadas de Coach A contra Alumno B, con consentimiento revocado y sesión desactivada.\n\n**Interpretación:** la advertencia `authenticated_security_definer_function_executable` identifica 19 vías **privilegiadas**. No demuestra por sí sola una vulnerabilidad. Las funciones están concedidas al rol autenticado por sus flujos de invitaciones, licencias, alias, alumnos y pagos. No revocar indiscriminadamente: eso interrumpiría el piloto. Los análisis sintácticos de `is_admin`/`auth.uid` son **pistas para revisión**, no certificación de autorización. Se leyó el cuerpo del helper `efg_private.is_admin()`: comprueba rol admin y perfil activo por `auth.uid()`. El helper `efg_private.coach_has_student(uuid)` exige coach de organización correcta, alumno activo, licencia aplicable y consentimiento aceptado. Se revisaron además controles por actor/organización en funciones seleccionadas de invitaciones, pagos y activación de alumnos. **Aún faltan pruebas negativas con JWT firmados para cada una de las 19 rutas de producción** y comprobación de accesos a objetos subordinados.

Los dos avisos `rls_enabled_no_policy` corresponden a `efg_private.daily_mail_jobs` y `public.efg_daily_email_deliveries`. Tienen RLS activado y no hay permisos `SELECT`, `INSERT`, `UPDATE` ni `DELETE` directos para `anon` o `authenticated`; son procesos internos. No crear políticas abiertas para silenciar esos avisos.

La consulta del esquema productivo confirmó **ausencia** de:
`efg_coach_relaunch_intakes`,
`efg_coach_plan_drafts`,
`efg_legal_documents`,
`efg_coach_plan_publish_receipts`,
`efg_submit_coach_relaunch_intake(text,jsonb,integer,boolean)`,
`efg_save_coach_plan_draft(uuid,jsonb,jsonb,timestamptz,integer,bigint)` y
`efg_publish_coach_plan_draft(uuid,bigint,uuid)`.

**Implicación:** los 5/5 checks GitHub y los JWT locales satisfacen el entorno de pruebas, **no** certifican paridad ni instalabilidad del esquema alojado. El código sigue en PR #37 DRAFT con flags OFF y producción en `9000e4d8`.

## Requisitos de cierre

1. Completar pruebas autorizadas de 19 RPC con identidades ficticias y permisos correctos/incorrectos por rol, organización, sesión suspendida y objeto ajeno. Anotar resultado individual y evidencia. Añadir cualquier refuerzo a la candidata **sin aplicarlo a hospedado**.
2. En staging separado y respaldado, aplicar en el orden correcto los cambios de Coach, probar migración desde el esquema alojado actual, verificar rollback/restauración de cuentas y diarios y el comportamiento de PWA preexistentes. No reutilizar el marcador sintético `nut57_isolated_staging_marker` para engañar un entorno real.
3. Aprobar documentos jurídicos definitivos y revisión profesional de datos sensibles, planes y semáforos alimentarios; la seguridad de base de datos no certifica indicaciones clínicas.
4. UAT física iPhone/Android/PC de alumno piloto antiguo → documentos actuales → ficha nueva vacía → coach recibe con consentimiento → calculadora → guía revisada → publicación única → historiales conservados.
5. Verificar de nuevo asesores Supabase y las 5 pruebas de GitHub en el **mismo último SHA**, con autorización explícita del propietario antes del GO.

**Estado: SEC-08 INVENTARIO + EXPOSICIÓN ANÓNIMA EVALUADOS, AUTORIZACIÓN EXTREMO A EXTREMO PENDIENTE. RELEASE NO GO.**

**Enlaces de remediación Supabase:** [Advertencia de funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) · [RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
