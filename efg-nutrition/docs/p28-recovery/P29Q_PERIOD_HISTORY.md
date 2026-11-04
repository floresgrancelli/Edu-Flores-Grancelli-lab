# P29Q — Implementación y prueba QA de informes por período

2026-11-04. Formato y contenido aprobados por Edu; no se reabre revisión editorial.

- Migración `20261104_period_reports_candidate.sql` APLICADA como `ncc_period_report_history` tras validar PostgreSQL 17 aislado. No reaplicar.
- Tabla nueva separada del semanal, RLS alumno propio / coach autorizado con consentimiento y organización activa. Solo SELECT/INSERT autenticados; sin UPDATE/DELETE ni SELECT anónimo. Restricciones de formato, aprobación, fechas, ventana 1–90 y unicidad por alumno/coach/período.
- Verificación alojada inicial: 0 registros, RLS true, anon SELECT false, authenticated INSERT true, UPDATE/DELETE false. Advisors no señalaron la tabla nueva; advertencias existentes de otras RPC/privadas y contraseñas no se modificaron.
- UI: revisar vista previa antes de compartir; cualquier cambio de texto invalida esa revisión. UUID persistente durante reintentos. Historial separado para alumno/coach; PDF mediante impresión; respuesta prepara borrador contextual sin enviar.
- Pruebas locales PASS: handler real publicación, cliente historial, respuesta contextual, generación de período, regresión semanal y mensajes/notificaciones. Errores offline de suite son escenarios negativos esperados.
- PostgreSQL aislado PASS adicional: UPDATE/DELETE prohibidos, acceso anon denegado, formato/fechas/aprobación inválidos y ventana >90 rechazados; futuro rechazado por RLS. Helper sintético, no JWT real.

## Prueba firmada alojada

Coach QA A en tab12 de preview Work; alumno ficticio NCC QA Ingreso 20261104.
Generar 26/10–04/11: 10 días, 1 registrado, 9 ausentes; 487 kcal y 29,8 g proteína, metas históricas 2500/P150/HC322/G68/Fi35; ausentes no cuentan como cero. Vista previa revisada y botón Aprobar y compartir ejecutados.

Publicación confirmada en UI y lectura de historial con la misma sesión. Registro `716a17e4-8477-4d91-9c55-7a646996871a`, created_at `2026-11-04T17:37:16.722439Z`, student `09f08bd9-9acf-4348-9200-21a5df396aa5`, coach `69f78429-face-4c55-a28c-357cca35d452`. Segundo clic de publicación (mismo UUID), readback administrativo posterior: exactamente una fila. Formato `efg_luxury_period_v1`, approvedByCoach=true, daysRecorded=1.

Esto prueba generación, publicación, historial del coach y reintento firmado. NO acredita aún vista/respuesta desde sesión alumno ni exportación efectiva PDF. No se envió ningún mensaje. Histórico semanal intacto; sin merge, deploy, switches globales ni GO de producción. Preview respaldado en backups/p29q-period-history; flags previos conservados.
