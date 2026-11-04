# P29G — Rechazo firmado y mensaje persistente

2026-11-04. Cloud Browser se reinició sin pestañas anteriores. Se reanudó el servidor HTTP de la copia existente (dist, puerto4173); tab12 restauró Coach QA A sin OTP. ABRIR alumno nuevo → Objetivos recuperó v1/2447kcal/6horarios/receta100g+100g. No se regeneró ni guardó otra revisión.

## Alcance de ensayo

Una inserción administrativa restringida a alumno09f08bd9-9acf-4348-9200-21a5df396aa5, organización399daabf-3ae9-43bd-b770-b02f1a3672bf is_test y coach69f78429-face-4c55-a28c-357cca35d452 activos. Exige switchesOFF y exactamente1fila. Inscripción P29 QA creada2026-11-04T16:32:12.163399Z, vence2026-11-04T18:32:12.163398Z. No nueva infraestructura ni permisos de otras cuentas. No borrar inscripción al vencer para evitar retorno al diario legacy. Continuación requiere comprobar vigencia; no renovar silenciosamente si cambió el alcance.

## Ensayo real

Primer intento de publicación desde UI y sesión Coach QA: confirmación aceptada para ensayo negativo autorizado. No capturó causa textual: consola Object y mensaje efímero. Readback v1/draft,0goals/0receipts/0diaries. No atribuir a este primer intento un código o motivo observado.

Se corrigió pilot.js: alert persistente junto a Revisar y publicar juntos. Traduce mensajes conocidos de fuentes/scope y conflicto PT409; resto usa respuesta prudente sin exponer SQL. Solo actualiza DOM si alumno/sesión/ficha/borrador siguen vigentes y el panel continúa conectado. Conserva UUID de reintento. El aviso desaparece al navegar/reabrir; no persiste información entre cuentas.

Después de actualizar SOLO pilot.js del preview con respaldo backups/p29g-publication-error, recargar y reabrir v1, segundo intento firmado. Clic tuvo timeout del transporte, pero existía confirm: se inspeccionó y aceptó SIN repetir clic. Panel visible y captura inspeccionada:

> No se publicó: falta completar la revisión de las fuentes nutricionales de los alimentos de esta guía. El borrador sigue disponible.

Este texto solo corresponde al mensaje exacto del servidor `Guide foods are not independently reviewed and current`. Ahora sí se observó rechazo por revisión nutricional a través de la sesión real. No es PASS de publicación positiva, idempotencia o historial.

Readback posterior: mismo borradorv1/draft;0objetivos/0recibos/0diarios del QA;3switchesOFF. No reviewed insertados ni aprobaciones humanas inventadas. Tab12 marcada para continuidad.

## Validación dirigida

coach-plan-draft-client.mjs PASS contratos existentes y ejecución del código real UI en VM: error persistente, fallback sin detallesSQL, UUID conservado, respuesta descartada si cambia workspace. Primera prueba nueva tenía nombres de constantes incorrectos (S/C); corregidos a STU/COACH antes de PASS. node --check y diff --check PASS. No repetir resto de pruebas sin cambios relevantes.

CI de5a2e6d8 observado al inicio: Premium41867692517 success;Security41867692562/Educación41867692597/JWT41867692508/Visual41867692488/PG41867692495 in_progress. Sin reruns. El nuevo commit requerirá sus propios resultados.

Pendientes reales: fuentes ambiguas P29E y revisión humana registrada; después publicación positiva firmada/reintentos/historial y MiDía. Catálogo y borrador conservados. Producción sin despliegue.
