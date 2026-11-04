# P29W — Fuentes para piloto real: implementación candidata y alcance concreto

2026-11-04. Base remota verificada PR53 DRAFT 964e1ce2cdd461750aa561d54d4f02142a0ca002, producción ab7c241. No merge/deploy ni escrituras alojadas.

## Lecturas realizadas
- Continuidad535 y QA560 coinciden P29V; filas536/561 vacías en primera lectura.
- PR53 descripción P29V y HEAD exacto confirmados con get_pr_info; fetch_pr falló dos veces por Transport closed (sin mutaciones).
- CI del HEAD: cinco SUCCESS; Visual41884947276 FAIL paso16. Log exacto: prueba P21 esperaba7 flags, preparador produce10. Se corrigió el contrato enumerando10 ON/5 OFF; QA sigueOFF. No reruns de CI anterior.
- Supabase18:17:25Z:13 filas reviewed QA, expiración común18:32:12.163398Z. Vigentes SOLO en ese instante; no asumir vigencia posterior. Verificador exige IDs/unidad g/ml/qty<=1000, estructura2–6horarios oV1, coincidencia k<=.01 y macros<=.003 porunidad, reviewer/fechas vigentes. Fuente HTTPS también exigida por selección de IDs. El registro original no codifica alcance productivo, y el módulo cliente depende de cuenta QA exacta. No borrar ni extender scope.

## Cambios candidatos
- Nuevo registro privado `coach_pilot_reviewed_foods`: independiente/versionado por approval_id, alcance pilot_real, identidad/preparación, fuente, valores, responsable/quote/fechas, revocación. Empieza VACÍO. No modifica registros QA ni históricos.
- RPC autenticada exige vínculo coach/alumno; solo devuelve referencias vigentes de IDs solicitados. Inscripción QA existente, incluso vencida, no puede utilizar esta ruta.
- Verificador de piloto mantiene estructura/límites/tolerancias e incorpora ID de aprobación, nombre exacto de preparación y URL. Publicación atómica conserva gates/consentimientos/ficha/idempotencia; usa verificación QA original para QA y nueva referencia para noQA, con locks de filas durante publicación y approvedFoodIds exactos. Parche falla y revierte todo si hash de función alojada cambió.
- Editor general: botón «Verificar referencias del piloto y recalcular», bajo editor atómico existente. Conserva catálogo completo y no usa módulo QA. Consulta servidor; faltantes/unidades/vigencia muestran error sin mutar borrador. Descarta respuesta ante cambio de actor/alumno/ficha/consentimiento/borrador/meta. Clona/aplica/recalcula y requiere revisión del coach antes de guardar/publicar. Cambios posteriores de ingredientes deben verificarse otra vez; servidor es autoridad final.
- Descripción de merluza reconoce preparación revisada de piloto además de QA.

## Evidencia ejecutada
PASS `p29w-pilot-sources.mjs`: 13 referencias ficticiamente aprobadas solo en memoria, vigencia/alcance/unidad/NaN/duplicados/faltantes, clon intacto, sourceApprovalId preservado por cliente de guardado, receta100+100 bloqueada, preparación, recálculo<4%, respuestas obsoletas y error RPC.
PASS `p29w-pilot-sources-pglite.mjs`: PG17 aislado, instalación vacía, deriva aborta/revierte paquete, valores/identidad/URL/unidad/ID/qty rechazados al alterar, vencimiento/revocación/futuro/pending, acceso privado denegado y RPC con vínculo sintético; QA no puede usar fuentes reales. Rama EXACTA de validación de RPC instalada ensayada, incluye lista de IDs sin extra/duplicado. NO publicación completa/JWT alojado/concurrencia. SQL candidato NO APLICADO.
PASS regresiones afectadas `p29i-reviewed-sources.mjs`, `coach-plan-draft-client.mjs`, sintaxis y diff.
Primeros errores del harness PG fueron parámetros omitidos en stub y punto y coma tras definición exportada; corregidos antes de PASS. Nada alojado ejecutado.

## Alcance y decisiones pendientes
`P29W_REVISION_PILOTO.md` + JSON de propuesta: mismas13 referencias P29H, valores/deltas/preparaciones, alcance piloto real propuesto90días, campos humanosNULL. No se extrapola aprobación QA.
`P29W_coverage.json`: catálogo real+generador, cinco perfiles sintéticos/meta2500. Equilibrada faltan5 referencias; celiaquía0 en esta muestra; lactosa2; vegana7; keto7. Unión15 IDs adicionales. No certificar todas las metas/perfiles ni forzar sustituciones para pasar.
Antes de declarar punto2 cerrado: completar expediente de esos faltantes según guías que se pretenda publicar, decisión humana de alcance concreto, ensayo integral/publicación del cambio de backend y aplicación controlada. La aprobación de13 sola NO resuelve guía equilibrada. No pedir una aprobación genérica de todo el catálogo.
Regenerar paquete de activación desde nuevo HEAD por cambios runtime; P29V queda histórico, no aplicar su patch sobre P29W.
