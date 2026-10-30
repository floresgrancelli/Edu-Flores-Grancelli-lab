# NUT-60 · Primera implementación técnica *aislada* de Autogestión

**30/10/2026 | PR #37 DRAFT | NO GO | NO producción**

## Qué incorpora este prototipo y qué no

`docs/NUT60_PERSONAL_ENROLLMENT_STAGING_ONLY.sql` contiene un experimento reversible que **rechaza** cualquier base que no tenga el marcador exclusivo `efg_private.nut57_isolated_staging_marker`. No forma parte de la migración NUT-57 ni del frontend PWA. No puede aplicarse con las credenciales alojadas ni debe copiarse a un procedimiento de deploy.

En una Supabase local desechable, amplía el CHECK del rol para admitir `personal` y mantiene la restricción `profile_org_role`, que exige **organization_id NULL** para todos los perfiles que no son `student`. Crea `efg_personal_accounts` y `efg_personal_goals` con RLS SELECT solo por `auth.uid()`. No concede INSERT/UPDATE/DELETE directo a `anon` ni `authenticated`.

La segunda etapa añadida creó `efg_personal_daily_logs` y `efg_personal_habitual_meals` separadas del diario y favoritos de los alumnos del coach: acceso de solo titular `auth.uid()` por RLS, lectura/alta/edición/borrado permitidos al titular, restricciones mínimas de tipos JSON y comidas históricas, sin acceso de otras cuentas. **Estas políticas aún no incorporan la obligación de reaceptar términos tras un cambio de versión, ni validan condiciones médicas, cuenta inactiva o límites por rol real completo**; por eso siguen exclusivamente en staging ficticio, nunca en producción.

Las RPC `efg_register_personal(text)` y `efg_save_personal_goal(jsonb,integer)` son `SECURITY DEFINER` con `search_path=''`, sin parámetros `user_id`, `role` ni `organization_id`. Verifican identidad firmada, correo confirmado, perfil existente y aceptación **explícita de los dos documentos legales vigentes** (únicamente versiones ficticias en estos tests). Si existe una invitación previa no utilizada, no permiten saltar ese vínculo. La segunda RPC registra revisiones de metas con control de concurrencia `p_expected_revision` y no cambia las metas ni las guías de coach.

`tests/personal-auth-local-e2e.mjs` crea mediante GoTrue **dos personas ficticias** con JWT realmente firmados y verifica: rechazo anónimo; ausencia de autorregistro sin términos/privacidad completos; aceptación individual; bloqueo de un perfil ya creado; aislamiento RLS por titular; bloqueo de escalamiento a admin; denegación de escritura REST directa; metas versionadas personales, concurrencia con revisión obsoleta y preservación de metas/guías/notificaciones de Coach. Se ejecuta en la suite `.github/workflows/efg-nutrition-auth-local-qa.yml` **al final**, luego de los escenarios previos de restauración y notificaciones, para no alterar los asserts antiguos.

La suite también registra y modifica un desayuno propio, comprueba que la persona B no puede ver/crear/alterar el diario de A ni sus comidas habituales, que A sí puede gestionar sus favoritos, y que el diario histórico del Alumno del coach se conserva sin cambios. Se corrigieron dos supuestos falsos de pruebas: LEG-07 exige los dos documentos legales iniciales **atómicamente**, y el número de objetivos del coach varía tras escenarios previos de notificación; ahora se compara contra el baseline antes/después de NUT-60. Se agregó rechazo explícito de kilocalorías fraccionarias.

## Gates antes de considerarlo integración apta

1. Sustituir el facsímil por staging fiel y autorizado, inventario completo de funciones/constraints/RLS y restauración después de COMMIT. No aplicar este SQL a la base real.
2. Añadir planes personales y guías versionadas, suplementos, resolver faltantes, informes, gráficos, pagos propios si proceden, privacidad y borrado/exportación; integrar al frontend el diario y habituales ya ensayados en RLS local, con control server-side de legal vigente y cuenta activa, límites de volumen y versión del plan. Verificar no confundir seguimiento personal de coach con nuevo usuario Autogestión.
3. Integrar interfaz **personal**, alta/autorización OTP, aceptación legal real aprobada, seguimiento por restricciones dietéticas sólo revisadas por profesionales, sin permitir autorizaciones de datos sensibles por defecto.
4. Cubrir pruebas JWT anon/admin/coach/student/personal A/B contra todas las tablas y RPC reales, cambios de rol, cancelación, email confirmado, datos históricos, sesiones PWA, actualización de clientes anteriores y cortes de red.
5. Revisar clínica, términos, privacidad, seguridad, accesibilidad y pruebas físicas iPhone/Android/Mac, más checklist de lanzamiento único, para finalmente solicitar GO expreso.

**El prototipo no constituye un producto Autogestión funcional.** No se cargaron ni compartieron datos de usuarios reales, y las condiciones de salud no se utilizaron para generar recomendaciones médicas.
