# SEC-08 · Auditoría de funciones privilegiadas en Supabase Pro

**30/10/2026 | estado: REVIEW EN CANDIDATA / NO GO.** Informe basado en **consultas solo de metadatos/código de funciones**, sin consultar ni modificar usuarios, comidas, diagnósticos, pagos o filas comerciales.

## Evidencia verificable

Se consultaron `get_advisors(type=security)`, `pg_catalog.pg_proc`, `information_schema.routines` y el cuerpo de `efg_private.is_admin()` sobre el proyecto Supabase alojado `cyjvddhimbsfipjfctsl`, estrictamente en modo SELECT. No se invocó ninguna RPC comercial, se alteraron permisos ni se corrieron migraciones.

- **19 funciones `public` `SECURITY DEFINER`** son ejecutables por `authenticated`. **Ninguna** de esas 19 es ejecutable por `anon`, según `has_function_privilege`. En las 19, `search_path=""` y propietario `postgres`, confirmado por catálogo. Esto reduce riesgos de acceso anónimo y manipulación de resolución de nombres, pero **no impide por sí mismo ataques por usuario autenticado**.
- El código de `efg_private.is_admin()` comprueba perfil de `auth.uid()`, `role='admin'` y `active`. Se inspeccionaron los 19 cuerpos: cada función contiene una comprobación de identidad/rol o delega a una que la contiene. **No es una prueba dinámica de autorización ni de ausencia de vulnerabilidades**. Comprobar rutas intermedias y efectos laterales requiere un entorno staging aislado y JWT por rol.
- El Security Advisor también informó dos tablas con RLS activo y sin políticas: `efg_private.daily_mail_jobs` y `public.efg_daily_email_deliveries`. Una consulta adicional a `has_table_privilege` confirmó que `anon` **no tiene SELECT** y `authenticated` **no tiene SELECT, INSERT ni UPDATE** sobre ninguna. Esto es coherente con tablas internas, pero no se comprobó toda la superficie API ni el programa de envío.
- Existe una alerta separada de **Leaked Password Protection disabled**, relevante si se mantienen entradas con contraseña además del OTP; requiere revisar configuración de Auth y decidir habilitarla con atención a impacto. No se modificó la configuración.

## Clasificación de las 19 funciones de interfaz

| Grupo de intención y control visto en código | Funciones | Estado |
|---|---|---|
| Operaciones exclusivas de administración EFG (validan `efg_private.is_admin()`) | `efg_activate_paid_coach`, `efg_invite_coach`, `efg_invite_test_student`, `efg_offer_coach`, `efg_revoke_test_invitation`, `efg_set_coach_plan`, `efg_set_platform_alias`, `efg_set_platform_aliases`, `efg_set_seats`, `efg_update_subscription` | Revisado estáticamente, requiere JWT firmado E2E de admin, coach y alumno |
| Invitaciones que bifurcan por rol/propietario | `efg_delete_pending_invitation`, `efg_revoke_invitation` | Revisar exhaustivamente organización ajena y carreras entre reclamar/revocar |
| Operaciones de coach sobre organización y alumnos propios | `efg_invite_student`, `efg_set_coach_alias`, `efg_set_student_active` | Revisar coach A/B, alumno activo/suspendido, cupos, licencia, consentimientos revocados |
| Autogestión por identidad autenticada/destinatario/propiedad | `efg_claim_invitation`, `efg_confirm_payment`, `efg_submit_coach_payment`, `efg_submit_payment` | Revisar verificación de correo confirmado, identidad/recipient, comprobante en storage, rol y organización |

`efg_confirm_payment` limita la actualización a `recipient_id=auth.uid()`, `status='pending'` y resultado `approved/rejected`. `efg_submit_payment` verifica inicio de sesión, rol, ruta de comprobante con UUID del autor y propiedad del objeto en `storage.objects`; hay que comprobar políticas del bucket completo y transacciones de pago en staging. `efg_set_student_active` evita reautorizar automáticamente consentimientos al activar un alumno. Estos controles se observaron en código, no mediante explotación simulada del Supabase hospedado.

## Performance Advisor (sin modificaciones)

Se comprobó también `get_advisors(type=performance)`, que informó 6 claves externas sin índice de cobertura, 5 índices sin uso registrado, 2 tablas con políticas permisivas de SELECT que pueden solaparse (`efg_sunday_rewards` y `efg_weekly_reports`) y un aviso de configuración de conexiones de Supabase Auth. Esas alertas deben revisarse contra consultas reales y cardinalidades antes de agregar/eliminar índices o alterar RLS. Los 2 avisos de políticas permisivas no equivalen automáticamente a filtración de datos, pero exigen tests de acceso por organización.

## Política antes de lanzar

1. No retirar `EXECUTE` por impulsos: estas RPC sostienen coach, cobros e invitaciones reales. Toda corrección debe ser una migración revisada, transaccional y probada contra copias ficticias con estructura fiel.
2. Preparar suite JWT real local con funciones versionadas/replicadas para los **19** endpoints, casos anónimo/estudiante/coachA/coachB/admin, datos ajenos, roles desactivados, consentimiento revocado, pagos y validación de comprobantes; no introducir datos reales de Supabase hosted.
3. Verificar directamente en un staging autorizado y restaurable: dependencias de `efg_private`, schema exposure/PostgREST, `GRANT`, RLS, funciones SECURITY DEFINER y `search_path`; controlar que la inclusión de LEG-07 y NUT-57 no abra nuevos bypass.
4. Releer avisos de Seguridad y Performance tras cualquier migración. Verificar seguridad real con legal/privacidad, clínica, personal/autogestión y QA dispositivos físicos. Documentar resultado por rol.
5. No afirmar que una alerta de lint sea una vulnerabilidad explotable; tampoco concluir «seguro» únicamente porque la función mencione `auth.uid()`.

Documentación de Supabase: https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable ; guía Auth sobre contraseñas comprometidas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

**Cierre:** 19 funciones inventariadas, 19 grants anon=false, 19 `search_path` fijados y cuerpos inspeccionados **solo estáticamente**. E2E completo por rol pendiente. PR #37 DRAFT, `LEGAL_ONBOARDING_ENABLED=false`, `COACH_ATOMIC_PLAN_UI_ENABLED=false`, Render y Supabase productivo intactos. **RELEASE NO GO.**
