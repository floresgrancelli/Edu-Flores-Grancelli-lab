# COACH-PILOT-10 + REPORT-LUX-77 · Gran Actualización · 30/10/2026

## Petición aprobada para desarrollo
1. Poder convertir una cuenta **existente de Alumno** (caso previsto: Carla) en **Coach piloto EFG**, sin alta de una cuenta distinta.
2. Que siga usando **MI DÍA** con sus registros personales; todos los coaches tienen ese espacio personal.
3. Coach piloto podrá invitar **hasta diez alumnos de prueba**. Las invitaciones pendientes también ocupan cupo. No hay facturación de licencia durante el piloto.
4. Conclusión automática semanal en español argentino **más humana**, pero con calorías, proteína, hidratos, grasas y trazabilidad de evidencia inalteradas; edición y aprobación por coach.
5. Sección **«Espacio para disfrutar»** en celeste, también al imprimir/guardar PDF, que respete preferencias y restricciones y no presente la comida como premio.

## Backend de promoción existente · SOLO STAGING
Archivo: `docs/COACH_PILOT_10_EXISTING_STUDENT_PROMOTION_STAGING_ONLY.sql`

- Se ejecuta **únicamente en PostgreSQL 17 aislado autorizado**, con marcador `efg_private.nut57_isolated_staging_marker`. No es una migración aplicada al Supabase de producción.
- RPC `public.efg_promote_existing_student_to_pilot_coach(p_email text)` con `SECURITY DEFINER SET search_path=''`, EXECUTE para `authenticated`, verificación `efg_private.is_admin()`, identidad confirmada y coincidencia del email existente. No permite autopromoción, roles distintos de alumno, cuentas inactivas ni duplicados.
- Cambia atómicamente la **misma identidad `auth.uid`** al rol coach y `organization_id = NULL` (por el CHECK `profile_org_role`). Crea organización `is_test=true`, `status='trial'`, `seat_limit=10`, `license_fee_ars=NULL`; auditoría privada `efg_private.efg_pilot_promotions`.
- **No borra, reemplaza ni reasigna** diarios, pesajes, recetas, hábitos, metas históricas, mensajes, consentimientos ni comprobantes. El coach anterior deja de tener acceso por RLS del alumno una vez que `role` ya no es `student`. La nueva coach accede a su propio MI DÍA por ownership del `user_id`.
- `efg_invite_student` ya contiene verificaciones por dueño de la organización, rol activo, estado y `seat_limit`, contando alumnos activos más invitaciones pendientes. El org piloto `is_test=true` permite invitar aunque no exista licencia comercial.
- La pantalla administrativa «Habilitar coach piloto existente» solo está visible para Admin EFG; por seguridad `COACH_PILOT_PROMOTION_ENABLED=false` hasta el GO backend. La habilitación real debe realizarse tras verificar y liberar la migración, nunca antes.
- Coach piloto ve «MI DÍA» y funciones Coach, con cuponera de 10 estudiantes; no se muestra el pago de licencia ni acciones comerciales de EFG. Admin sí ve las organizaciones piloto, diferenciadas de contratos pagos. Los cupos piloto no inflan los KPI comerciales.

## Ensayo de PG17 y regresiones
- `tests/sql/coach-pilot-10-fixture.sql` crea usuario ficticio «Carla DEMO», coach anterior, administrador, otra alumna y registros históricos inventados (comidas, peso, recetas, habituales y metas).
- `tests/sql/coach-pilot-10-scenarios.sql` comprueba denegación a coach anterior y alumna, promoción admin solo una vez, conservación de UID y datos, organización sin facturación con 10 cupos, antiguo coach sin lectura de la alumna convertida, 10 invitaciones exitosas y rechazo de la número 11. Corre en **`efg_pilot_ephemeral`** dentro del workflow `isolated-postgres`; no es una prueba de producción ni JWT real de este flujo específico.
- `tests/coach-pilot-10-and-human-report.mjs` verifica UI, bandera OFF, condiciones de permiso y las nuevas conclusiones Luxury Pro. Premium QA ejecuta el test.
- Antes de activar: ensayar roles con tokens GoTrue firmados y el esquema hospedado fiel **restaurado**, constatar conservación de los recibos/Storage, confirmación de identidad de la cuenta de Carla y consentimiento de cambio de rol, probar en Android/iOS y habilitar con aprobación explícita del propietario.

## REPORT-LUX-77 · Narrativa humana con responsabilidad científica
- La conclusión ahora saluda por el nombre registrado (escapado), reconoce los días cargados, describe promedios **solo de esos días**, coteja objetivos vigentes y diferencia **registro** de consumo real. Las prioridades siguen basadas en metas individuales y reglas EFG expresamente **no clínicas**.
- Con pocos días/comidas registradas, se explica sin culpabilizar que no hay cobertura para inferir ingesta insuficiente.
- La sugerencia `flexibleNote` propone incluir una comida, helado o experiencia agradable según contexto y preferencias: no se trata de premio, permiso sanitario ni comida obligatoria.
- `pilot/weekly-luxury-report.css`: fondo celeste `#dff5ff` → `#c4eafa`, textos azules accesibles y `print-color-adjust:exact` para impresión/PDF.
- Se conserva la revisión editable exacta y el botón «Responder informe al coach» sin envío automático.

## Estado de release
**PR #37 DRAFT. Sin cambios en Supabase alojado ni Render ni cuentas reales.**
Se puede integrar la nueva funcionalidad en la Gran Actualización **solo cuando** se apliquen y verifiquen scripts de staging sobre restauración real, consentimiento/legal, QA físico de los tres roles y todos los 5 controles CI; además requiere GO explícito de publicación.
