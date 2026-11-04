# SEC-08 · Inventario real de funciones SECURITY DEFINER (lectura de metadatos)

**30/10/2026 · EFG Nutrition Pro · PR #37 DRAFT · NO GO**

## Consulta realizada (SOLO SELECT, Supabase alojada)

Se consultó exclusivamente `pg_catalog.pg_proc`, `pg_catalog.pg_namespace` y ACL de funciones del esquema público del proyecto alojado, sin acceso al contenido de perfiles, alimentos, pesos, consentimiento, pagos o historiales y sin sentencias DDL/DML. Método: contadores de `has_function_privilege('anon'/'authenticated',oid,'EXECUTE')`, existencia de `search_path=""` y concesión pública mediante `aclexplode`.

**Resultado comprobado:** 30 funciones `SECURITY DEFINER` en `public`. De ellas, 19 admiten `EXECUTE` del rol `authenticated`; ninguna admite `EXECUTE` de `anon`; las 30 tienen `search_path` vacío. La lista consultada no mostró `EXECUTE` otorgado a `PUBLIC`. Estos son **controles de superficie**, no pruebas de autorización por identidad/organización/estado ni aprobación para producción.

### Las 19 RPC que requieren pruebas dinámicas JWT y multi-organización

| Función | Familia de prueba obligatoria |
| --- | --- |
| `efg_activate_paid_coach(p_org)` | Admin/activación de organización, bloqueo cruzado |
| `efg_claim_invitation()` | Invitación, rol, caducidad y competencia |
| `efg_confirm_payment(p_payment,p_status)` | Beneficiario, rechazo/confirmación, otras organizaciones |
| `efg_delete_pending_invitation(p_invitation)` | Revocación/alta, pertenencia y auditoría |
| `efg_invite_coach(p_email,p_name,p_seats)` | Solo EFG/Admin autorizado |
| `efg_invite_student(p_email,p_name)` | Coach de la organización adecuada, límites |
| `efg_invite_test_student(p_email,p_name)` | Solo instancia de prueba aprobada |
| `efg_offer_coach(p_email,p_name,p_seats,p_fee_ars)` | Solo admin y cupos válidos |
| `efg_revoke_invitation(p_invitation)` | Autorización del emisor/administrador |
| `efg_revoke_test_invitation(p_invitation)` | Contexto de pruebas/no producción |
| `efg_set_coach_alias(p_alias)` | Autor del alias, entrada y organización |
| `efg_set_coach_plan(p_org,p_seats,p_fee_ars)` | Solo admin autorizado, sin suplantación |
| `efg_set_platform_alias(p_alias)` | Solo admin EFG |
| `efg_set_platform_aliases(p_primary,p_secondary,p_tertiary)` | Solo admin EFG y datos válidos |
| `efg_set_seats(p_org,p_seats)` | Organización autorizada, no cruzada |
| `efg_set_student_active(p_student,p_active)` | Propiedad de la organización y revocación |
| `efg_submit_coach_payment(p_amount_ars,p_period,p_receipt_path,p_alias)` | Solicitante propietario, comprobante y destinatario |
| `efg_submit_payment(p_kind,p_amount_ars,p_period,p_receipt_path)` | Alumno/coach autorizado, ruta storage propia |
| `efg_update_subscription(p_org,p_status)` | Solo admin, estado aceptado y ámbito |

Las otras **11** funciones `SECURITY DEFINER` pertenecen a generación de correos diarios, notificaciones internas y verificación del corredor; el rol `authenticated` no tenía `EXECUTE` sobre ellas en la consulta. También requieren auditar triggers y entradas indirectas; que no sean invocables directamente por `authenticated` no las hace automáticamente seguras.

## Requisitos antes del GO

1. Extraer en staging fiel y documentar el cuerpo, dependencias, propietarios, ACL, RLS y efectos reales de cada una de las 19 funciones; no inferir validación de `auth.uid()` de su mero nombre.
2. Ejecutar JWT firmados para `anon`, estudiante A/B, coach A/B, admin EFG y un rol desconocido/inactivo; entradas inválidas, concurrencia, suplantación, reautorización y aislamiento de organizaciones.
3. Realizar pruebas **negativas** que verifiquen ausencia de cambios de datos y **positivas** solamente en entornos desechables; confirmar que errores no filtran información privada.
4. Incluir clientes antiguos PWA, funciones indirectas, RPC de pagos e invitaciones, respaldos y restauración. Documentar resultados de cada función/rol en Control QA con evidencia.
5. Solicitar revisión de seguridad independiente de cualquier decisión de lanzamiento. **Las comprobaciones de catálogo de PostgreSQL no sustituyen las pruebas dinámicas.**

**Estado:** inventario de superficie y ACL CONCLUIDO (lectura alojada). Matriz de ejecución con JWT real sobre esquema fiel, pendiente. Ningún cambio alojado ni publicación autorizada.

## Advisor de seguridad oficial, solo lectura (30/10)

`get_advisors(type=security)` reportó:
- **WARN ×19:** funciones `SECURITY DEFINER` ejecutables por `authenticated`; coincide con el inventario. No implica por sí solo explotación, pero obliga a probar la autorización interna. [Referencia de remediación](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- **WARN ×1:** protección de contraseñas filtradas desactivada en Auth. Revisar si se utilizan contraseñas en cualquier flujo real; OTP no elimina automáticamente el valor de verificar esta opción. [Referencia](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **INFO ×2:** RLS habilitado sin políticas en `efg_private.daily_mail_jobs` y `public.efg_daily_email_deliveries`. Puede ser correcto para tablas sólo de servicio, pero exige verificar las rutas y los roles internos de correo. [Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

**Ninguna configuración se alteró en la base real.** Un inventario con `anon_execute=false` no sustituye análisis de cuerpos, credenciales de servicio, entradas indirectas o pruebas de penetración.
