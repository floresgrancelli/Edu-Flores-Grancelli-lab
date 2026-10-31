# Continuidad técnica — 31/10/2026 — PR37, sin publicar

Fuente del alcance: pestaña `GRAN ACTUALIZACION 30-10` del Plan Maestro,
filas 9–63, exactamente 55 requisitos. No se reemplaza esa lista.

## Cambios funcionales de esta ejecución

- 01-01/01-04/01-06/02-01/02-04: el ingreso nuevo (`COACH_STUDENT_JOURNEY_ENABLED`)
  y el ingreso versionado anterior ahora seleccionan el mismo backend Coach.
  `coach-versioned-mode.js` evita leer fichas antiguas o publicar por el endpoint
  antiguo cuando solo se habilita la nueva ruta. No habilita ninguna bandera.
- La ficha mostrada al coach incluye patrón y ventana horaria. Se valida la
  revisión incluso si dos cambios comparten fecha/hora. El coach también pasa
  por aceptación legal cuando la ruta nueva es la elegida.
- 01-04/01-06: el alumno pendiente y publicado puede abrir su ficha desde
  Privacidad; editar, retirar el permiso o limpiar únicamente los datos de la
  ficha con confirmación, identidad autenticada, CAS y lectura posterior.
  Las operaciones no escriben planes, diarios, mensajes ni históricos.
- 01-05/03-03: ocho códigos sanitarios opcionales preparados: lactosa, SIBO,
  diabetes, celiaquía, alergia alimentaria, HTA, lípidos e hígado graso.
  El formulario sigue desactivado y la persistencia clínica usa solo el esquema
  privado de staging. Declarar una condición no crea una dieta ni autoriza verde.
- 02-03/02-04: la prueba PostgreSQL completa encontró que el CHECK de URLs
  `{8,1990}` era inválido (PostgreSQL limita repetición a 255). Se separó la
  longitud del patrón. Para instalaciones existentes se preparó
  `20261031_coach_reviewed_food_url_constraint_fix_NOT_APPLIED.sql`, con preflight.
  NO se aplicó a ninguna base alojada y NO se cargaron fuentes ficticias allí.

## Pruebas añadidas y límites

- `coach-versioned-journey-integration.mjs`: módulo real copiado a un directorio
  temporal, solo ingreso nuevo ON; verifica lectura versionada, endpoint COACH119,
  CAS, guardas y bloqueo de operaciones antiguas. Base simulada, no JWT.
- `coach119-guide-history-pg17.mjs`: conserva el parche de seguridad de 8848a127;
  comprueba que un GUC falsificado no suplante el marcador privado de transacción,
  titular correcto, revocación de EXECUTE/INSERT y rollback.
- `coach119-full-atomic-pg17.mjs`: ejecuta la RPC candidata exacta y los módulos de
  borrador/legal/composición sobre PostgreSQL 17 efímero. Prueba RLS de borradores,
  organizaciones A/B, consentimiento revocado, revisión obsoleta, evidencia/legal
  ausentes, publicación, reintento, aviso único, reemplazo con archivo y error
  inyectado en la última escritura con rollback total. Identidades/claims sintéticos.
- `coach112-pilot-general-intake.mjs`: conservar datos al retirar permiso, limpiar
  la ficha, rechazar revisión vieja, falta de confirmación y cuenta ajena.
- `clinical-health-auth-local-e2e.mjs`: los ocho códigos recorren el backend
  clínico aislado con JWT de GoTrue locales. Documentos e identidades ficticios.
- `coach-pilot-privacy-visual-qa.mjs`: app real en servidor local, nuevo ingreso
  activado únicamente en fixture, privacidad/edición esperando y publicado en
  Chromium/WebKit. No equivale a OTP real ni dispositivo físico.
- Premium CI continúa módulos independientes aunque otro falle; el job conserva
  el fallo. Nunca usa `continue-on-error` para convertir fallos en aprobaciones.

## Reanudar sin otra auditoría general

Consultar HEAD de PR37 y sus cinco workflows. El SHA y resultados definitivos
se registran en G/L/M de la pestaña obligatoria, especialmente 10-05 (fila 59).
No atribuir los PASS de un SHA a otro. No mezclar el test de claims sintéticos de
COACH119 con los JWT del circuito local anterior.

Siguiente trabajo técnico: integrar un ensayo de extremo a extremo del circuito
nuevo completo con GoTrue/PostgREST locales y migraciones COACH106–119 exactas;
el flujo Auth local anterior prueba otros RPC versionados. Después conectar y
probar el editor clínico opcional con su RPC privada antes de considerar habilitar
la ficha sanitaria; ahora los ocho campos y el backend aislado están preparados,
pero la pantalla sigue sin recoger datos. No certificar 55/55 ni afirmar que solo
quedan dependencias externas.

Además siguen pendientes revisión legal/documentos finales, corpus nutricional
y reglas de compatibilidad revisados, restauración fiel DB/Auth/Storage, pruebas
físicas iOS/Android y autorización de publicación. Mantener todos los switches de
release y salud OFF. Ningún merge, deploy, SQL alojado, gasto ni datos reales
modificados por esta ejecución.
