# EFG Nutrition Pro — matriz de pruebas para staging de ingreso Con Coach
**29/10/2026 | PR #34 DRAFT | Documento de auditoría, NO autorización para migrar.**

Esta matriz prepara la comprobación de la migración
`migrations/20261029_coach_intake_plan_access_DRAFT.sql`.
**No ejecutar en producción ni usar cuentas de alumnos reales.** El CI sintético confirma
estructura y comportamiento JS, NO permisos reales ni recuperación de backup.

## Condiciones previas imprescindibles
1. Staging **separado** de Supabase productivo, credenciales, proyecto y URL propios;
   evaluar costo del nuevo proyecto/rama y obtener aprobación previa. No copiar PII,
   correos reales, JWT, documentos de salud ni archivos de pagos.
2. Esquema y políticas equivalentes a producción mediante migraciones versionadas;
   inventario de `SECURITY DEFINER`, privilegios, RPC, triggers y vistas. Todas las
   operaciones adversariales usan identidades ficticias, no `service_role`.
3. Copia de seguridad y restauración **ejecutada** en ambiente descartable, incluyendo
   datos y Storage pertinentes; registrar versión, alcance, tiempos, comprobación y
   procedimiento de reversión. `ROLLBACK` de una prueba transaccional **no equivale**
   a una restauración verificada después de un despliegue.
4. Snapshot estructural: cuentas/cohortes previas, perfiles huérfanos, organizaciones sin
   coach, estado de consents, columnas y constraints, sin exponer información personal.
   Detener despliegue si cualquier perfil histórico queda fuera del backfill.
5. Revisar Legal/Privacidad antes de introducir datos sensibles: los campos presentes
   en el DRAFT actual no incluyen diabetes, celiaquía, glucemia o colesterol. No inferir
   consentimiento de salud a partir de OTP ni de aceptación general.

## Identidades de prueba
- **Coach A** activo, **Alumno A1** nuevo, **Alumno A0** histórico con datos sintéticos.
- **Coach B** activo en otra organización, **Alumno B1** nuevo.
- **Alumno C** con invitación pendiente y sin consentimiento.
- **Administrador** con rol real, **Anónimo** sin JWT y cuenta desactivada.
Crear y destruir solo fixtures en staging. Separar tokens, no compartir sesión.

## Matriz de seguridad, E2E y retrocompatibilidad

| ID | Acción con token real de staging | Resultado esperado |
|---|---|---|
| ST-01 | Alta por invitación A1 → OTP válido → efg_claim_invitation | Perfil nuevo y `plan_access.pending` en una transacción; una sola fila por alumno |
| ST-02 | A0 ya existente antes de migrar | `published`; diarios, pesos, recetas, hábitos y gráficos sin alteración |
| ST-03 | A1 intenta escribir diario/peso/actividad/habitual/receta por REST | INSERT/UPDATE/DELETE denegados **en servidor**, aunque altere la UI |
| ST-04 | A1 lee y guarda ficha sin compartir | Solo A1 tiene lectura; Coach A y B no reciben texto; `shared_at=NULL` |
| ST-05 | A1 marca compartir explícitamente | Coach A ve ficha; Coach B, admin no autorizado y anónimo no la ven |
| ST-06 | A1 revoca `shared_at` o consentimiento de vinculación | Coach A pierde lectura inmediatamente, incluidas consultas REST nuevas |
| ST-07 | Coach B intenta publicar plan de A1 con RPC y objetivo inventado | Denegado; ni cambio de estado ni notificación |
| ST-08 | Coach A intenta publicar sin objetivo o guía aprobada | Denegado, `pending` preservado |
| ST-09 | Coach A publica con objetivo más reciente y guía correcta | Una transición `pending→published`, notificación genérica, registro permitido |
| ST-10 | Coach A usa guía de objetivo viejo o alumno B1 | Denegado, no se permite publicar con ID ajeno ni obsoleto |
| ST-11 | POST REST directo cambia `efg_student_plan_access.status` como alumno | Denegado aun con JSON/ID manipulado |
| ST-12 | Coach A pierde licencia, vínculo o consentimiento; nuevo intento RPC | Denegado, sin desbloqueo |
| ST-13 | A1 deja sesión abierta al publicarse plan | Reconsulta consistente de status; sin cache permanente bloqueante |
| ST-14 | Caída de red al guardar ficha/publicar | No hay estado ficticio ni notificación de éxito; reintento idempotente |
| ST-15 | Editar/retirar consentimiento con coach conectado | El cache de coach deja de mostrar ficha al refrescar, sin nuevos accesos |
| ST-16 | Registro desde admin o coach personal de su propia comida | No es bloqueado por error por el gate previsto para alumnos |
| ST-17 | A1 intenta RPC de escritura alternativa, vistas o endpoints no contemplados | Mismo rechazo; no existe bypass del estado pending |
| ST-18 | Invitar dos veces / eventos concurrentes de alta y publicación | Sin duplicados, inconsistencias ni bloqueo accidental de históricos |
| ST-19 | Interrupción a mitad de migración y recuperación desde backup | Esquema, usuarios históricos y registros restaurados; evidencia auditada |
| ST-20 | Accesibilidad/visual en 320/360/390/430/768/1280 y WebKit | Textos, contraste, modales, foco, teclado móvil sin pérdida de datos |
| ST-21 | Términos y privacidad preacceso futuros | Aceptación versionada, no premarcada, separada del permiso de salud; negativa impide acceso funcional |
| ST-22 | Ficha voluntaria: campos vacíos, valores inválidos y revocación | Validación servidor/cliente, ninguna condición médica deducida |
| ST-23 | Plan guía visual y 5 comidas | Datos coherentes, comprobación de estructura **no solo JSON no nulo** |

## Hallazgos de revisión preliminar read-only (29/10)
- GitHub PR #34 sobre `acd79130` tenía Security, Premium y Visual 3/3
  SUCCESS. Se incorporan tests adicionales en rama DRAFT sin publicar.
- Supabase productivo no tiene `efg_student_intakes` ni
  `efg_student_plan_access`; la migración no figura aplicada. Sin ramas staging.
- Las cinco tablas previstas para el gate tienen `student_id`; objetivos y planes
  tienen las columnas utilizadas por la RPC. Esto **no verifica** su ejecución.
- `efg_claim_invitation()` inserta perfil antes del consentimiento inicial: la nueva
  trigger `AFTER INSERT` crea `pending` en esa misma transacción. Probar este orden.
- `efg_private.coach_has_student` exige coach activo, vínculo, consentimiento y
  licencia válida; confirmar en staging que no hay caminos alternos.
- La RPC en DRAFT verifica `guided_plan is not null` y timestamp de aprobación:
  contrastar **estructura real de cinco comidas y vigencia de la aprobación**
  antes de considerarla apta. `verify_guide_goal()` actual solo verifica vínculo
  de objetivo/alumno/coach, no el contenido de cinco comidas.
- El backfill histórico incluye únicamente alumnos de organizaciones con coach
  asignado. Comprobar cobertura total; abortar si hubiera excepciones.
- El DRAFT no concede borrado de ficha por alumno: revocación de compartir sí,
  supresión a petición y política de retención requieren diseño antes de liberar.
- Supabase Advisors mostró avisos sobre RPC `SECURITY DEFINER` accesibles para
  `authenticated`, además de protección de contraseñas. Los avisos no implican
  vulnerabilidad demostrada: evaluar identidad/rol en cada función pertinente.

## Criterio de salida
Ninguna prueba con fixtures emulados sustituye JWT de dos organizaciones distintas.
No fusionar PR #33/#34, migrar, activar bloqueo, registrar salud sensible ni publicar
hasta que ST-01…ST-20 críticos estén documentados y aprobados, restauración real
confirmada, revisión de privacidad concluida y autorización específica del dueño.
El merge secuencial de UX1 y luego Coach exige repetir los tres controles de CI.
