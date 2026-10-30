# CLIN-GUT-03 · Privacidad de datos digestivos en Nutrition Coach
**30/10/2026 · STAGING-ONLY; NO PRODUCTION APPLY · PR #37 DRAFT · RELEASE NO GO**

## Trabajo implementado
Se añadió el script `docs/CLIN_GUT_03_PRIVATE_HEALTH_INTAKE_STAGING_ONLY.sql` con una prueba de aislamiento obligatoria: exige marcador privado `nut57_isolated_staging_marker`, nombre permitido de base ficticia y dependencias Coach/Legal. No contiene datos ni documentos legales clínicos publicados; una base sin documento clínico actual **rechaza las escrituras**.

### Separación de datos y permisos
- `efg_private.efg_coach_health_documents` contiene el texto/versionado/hash de consentimiento clínico a aprobar en el futuro. La migración deja esta tabla **vacía**. No hay consentimiento clínico aprobado por defecto.
- `efg_private.efg_coach_health_intakes` guarda por alumno/organización, en un esquema **no expuesto en REST**, solo dos códigos permitidos (`lactose_intolerance`, `sibo`), estado `suspected`/`confirmed`/`not_reported`, revisión y permiso explícito de compartir. Guarda fase SIBO `none` en esta etapa: **no activa dietas bajas en FODMAP**. Sin campos de texto libre ni diagnósticos distintos.
- Se habilita RLS como defensa en profundidad y se revocan todos los permisos públicos, anónimos y autenticados de las tablas privadas. La API expone solo cuatro RPC de alcance acotado, con `SECURITY DEFINER SET search_path=''` y permiso de ejecución exclusivamente a `authenticated`:
  - `efg_current_coach_health_document()`: solo el documento clínico publicado a usuarios identificados.
  - `efg_submit_coach_health_intake(jsonb,uuid,text,integer,boolean,boolean)`: únicamente alumno activo autenticado, exige Términos/Privacidad vigentes, consentimiento clínico distinto con ID/hash actual, permiso de procesamiento explícito y, si corresponde, seguimiento autorizado del coach. Rechaza claves arbitrarias, cambios desactualizados y estados inválidos.
  - `efg_get_coach_health_intake(uuid)`: titular o coach del mismo vínculo con compartir clínico independiente **y** consentimiento de seguimiento vigente; otras organizaciones obtienen `null`.
  - `efg_revoke_coach_health_intake(integer)`: solo el titular identificado, elimina fila clínica y permiso de compartir conjuntamente; necesita revisión válida.
- La ficha general de relanzamiento rechaza `health_flags` deliberadamente; no se introduce información de salud en `notes`, `preferred_foods`, mensajes, formularios heredados ni tablas accesibles mediante REST.

### Validación incorporada al flujo CI
`.github/workflows/efg-nutrition-auth-local-qa.yml` aplica el SQL a **Supabase completamente local** y ejecuta `tests/clinical-health-auth-local-e2e.mjs` con JWT reales de GoTrue y usuarios ficticios de dos organizaciones. Prueba que nadie puede escribir sin documento clínico publicado; después genera un **documento exclusivamente sintético** para verificar procesamiento, lectura propia, lectura de coach con autorización separada, denegación a anon/otros coaches/otros alumnos, revisión optimista, revocación de seguimiento y eliminación. El documento de prueba NO corresponde a consentimiento legal ni profesional.

## Riesgos y gates que siguen pendientes
1. **No activar** el flujo clínico aún: falta texto jurídico efectivo de consentimiento específico de salud, versión/hash controlados y revisión de responsable de tratamiento y profesional sanitario. Ningún material ficticio aprobado sirve como consentimiento.
2. Completar análisis técnico de riesgos/retención y solicitudes de supresión; revisar protección de datos sensibles, seguridad, continuidad y **replay de solicitudes antiguas tras revocación** antes de uso real. El esquema actual elimina la fila: diseñar marcador de revocación sin datos clínicos si hiciera falta impedir reenvíos obsoletos.
3. Verificar compatibilidad exacta y permisos sobre **backup real restaurado**, ejecutando JWT A/B sobre las 19 funciones de producción además de las nuevas.
4. Validar catálogo de alimentos y tamaños de porción con profesionales; semáforo amarillo por falta de evidencia y ninguno verde basado en nombres; no copiar bases propietarias Monash sin licencia.
5. QA físico Android/iPhone/PWA, pruebas de flujos reales, revisión del coach y autorización expresa GO. No fusionar PR, no crear branch Supabase de pago ni desplegar Render hasta completar las verificaciones.

**CLIN-GUT-03 es una implementación preparatoria de seguridad local, no un servicio clínico habilitado ni una revisión médica realizada.**
