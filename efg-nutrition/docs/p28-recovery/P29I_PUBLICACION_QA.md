# P29I — Publicación QA firmada completada

2026-11-04. Edu respondió «Aprobado» al paquete P29H de 13 referencias y preparaciones, commit 0051dae2233887854c1199c92e8ee9e9d85c38af. Registro aditivo en docs/p29h-review/approval-p29i.json: alcance QA, sin atribuir credenciales profesionales ni GO productivo. La propuesta original pendiente permanece inmutable.

## Aplicación y recálculo

Registro privado inicialmente vacío. INSERT de 13 referencias validado en transacción con ROLLBACK, después instalado a 16:48:46.857102Z. Caducidad 18:32:12.163398Z, igual al ensayo QA. Sin sobrescribir filas existentes. SQL archivado con ROLLBACK por defecto, YA APLICADO: no repetir. Los tres switches globales permanecen OFF. El registro de fuentes existente es global por food_id, no por alumno: esta aprobación corta no debe presentarse como certificación de producción; únicamente el alumno inscrito en QA puede publicar con switches OFF.

Nuevo módulo de referencias QA, OFF en repositorio, ON exclusivamente en preview. Botón exige coach y alumno exactos. Clona la guía, falla ante ID/unidad inesperados, conserva seis horarios, receta bloqueada banana100g + manzana100g y catálogo completo. No modifica nutrientes globales del catálogo. Merluza y descripción ahora cocidas/escurridas, no al horno. Los componentes explicitan tofu con sulfato cálcico, anco horneado y café preparado con agua.

Recálculo: 2425.72072 kcal; P153.53558; HC313.213; G68.944; fibra36.05. Meta 2500/150/322/68/35: desvíos visibles, todos <4%, NO se afirma <2%. Versión1 conservada como fixture inmutable en tests/evidence/p29c-qa-guide-v1.json; la tabla de borrador mantiene revisión actual, no se afirma archivo histórico automático de cada borrador.

## Prueba real firmada

Cloud Browser tab12, sesión NCC QA Coach A restaurada. Aplicar referencias → recalcular → Guardar borrador privado. Readback: draft_revision2, status draft, source_intake_revision2, coach_guide_foods_verified=true.

Revisar y publicar juntos → confirmación QA aceptada. El click reportó timeout por diálogo abierto; se inspeccionó y aceptó sin duplicar click. UI: «Última propuesta publicada. Podés comenzar otra revisión».

Publicación 16:50:21.500279Z. Goal ff63b50c-c60e-4b2e-a9f8-ee810ea85be4; request bb926d45-8fa7-4a23-8acb-88b03b0cf335; draft revision2/status published; acceso published y guía guided_goal_id iguales al goal; seis horarios. Readback 1 goal/1 receipt/0 diaries. Publicación real con sesión firmada; sin escrituras directas de goals/guide/access por SQL.

Reintento administrativo en transacción con claims QA explícitos y ROLLBACK devuelve mismo goal. Readback 1/1/0. **No equivale a reintento JWT firmado ni a concurrencia.** Pendiente simular pérdida de respuesta con sesión real.

## Validación y continuación

PASS tests/coach-plan-draft-client.mjs (incluye alerta persistente/UUID/aislamiento), tests/p29i-reviewed-sources.mjs (clon inmutable, gates, unidad, receta, seis horarios, preparación y desvíos), sintaxis. Nuevo test incluido en Premium workflow. Visual de 58288c terminó success; con los cinco resultados anteriores completa seis CI de ese commit. No reruns; CI del nuevo código pendiente.

Durante readback dos consultas de solo lectura fallaron por nombres supuestos (published_goal_id en drafts y efg_coach_plan_publications). Corregidas consultando código real: published_goal_id está en access, recibos en efg_coach_plan_publish_receipts. Ninguna escritura parcial de esas consultas.

Pendiente: reintento firmado, historial de revisión posterior, ingreso de alumno/Mi Día/primer alimento/habituales/sushi/cambio de sesión; matriz55 y prueba guiada Edu. No nuevo GO, merge ni despliegue Render. Scope y fuentes vencen 18:32 UTC; no borrar inscripción al vencer ni dejar caer a legacy.
