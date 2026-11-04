# P29E — Fuentes concretas de la guía QA v1

Consulta ejecutada el 4 de noviembre de 2026 a la API oficial USDA FoodData Central. Los JSON conservan identidad, unidades y cinco nutrientes de interés; son proyecciones, no archivos completos de análisis o muestreo. Los hashes identifican las respuestas originales de trabajo, que no se incluyen en este commit. Datos USDA de dominio público, según https://fdc.nal.usda.gov/api-guide/.

Selección exacta: `625e3aa089a4a42166b21d0bd3f020a124eda1cbb898f5a3b70be8f496e7a275`. Se mantiene el borrador QA de seis horarios y sus elecciones. No cambia catálogo, recetas, cantidades ni revisiones del servidor. **Cero aprobaciones humanas.**

| Alimento | Evidencia y decisión pendiente |
| --- | --- |
| Huevo | FDC748967 capturado: los cinco valores coinciden. Pendiente revisión humana de identidad/preparación y fuente. |
| Clara | FDC747997 capturado: cuatro valores coinciden; fibra ausente en la respuesta. Se conserva null; no se transforma ausencia en cero. |
| Rúcula | FDC169387 capturado: diferencias pequeñas de redondeo, detalladas en comparison.json. Pendiente revisión. |
| Mandarina | FDC169105 capturado: diferencias pequeñas de redondeo. Pendiente revisión. |
| Tofu firme | FDC172475 es una variante con sulfato cálcico: 144 kcal/17,27 g proteína frente a 119/12 del catálogo. Candidato no equivalente; definir producto antes de adoptar fuente. |
| Calabaza | FDC168449 hervida/escurrida: 20 kcal frente a 34 del catálogo. No equivalente sin definir variedad y preparación. |
| Café | FDC171890 preparado con agua, por100g; catálogo por100ml. No calcular diferencias sin conversión y preparación justificadas. |
| Merluza | Búsqueda SR Legacy “hake cooked” sin correspondencia válida seleccionada. Sigue pendiente. |
| Arroz integral | Se conserva reconciliación P29C: fibra1,8 del catálogo frente a1,6 de la captura anterior. |
| Manzana, banana, aceite, papa | Se conservan capturas P29C pendientes de revisión humana. |

`official-api-projections.json` contiene siete registros. `comparison.json` contiene sus comparaciones y marca todas las filas `approvedForServer=false`. Es material para revisión, no autorización para cargar estados reviewed.

## Publicación QA: lectura alojada, sin activación

Las definiciones alojadas confirman que no existe alcance QA en estos controles:

- `efg_publish_coach_plan_draft_atomic`: requiere el interruptor global de publicación; MD5 observado `90c7c64b6581f84a893d67ada77b7af6`.
- `p28_require_current_health_source`: con el interruptor sanitario OFF retorna sin exigir la fuente sanitaria; MD5 observado `a184be87eb4c7c9465f8c1b4bad74fa1`.
- `coach_diary_write_gate`: con el interruptor de diario OFF conserva escrituras legacy; ON exige alumno firmado, propietario inmutable y entry status ready/can_log_meals. Conserva excepción service_role de mantenimiento.

Por ello habilitar solo la RPC de publicación no constituye un ensayo del recorrido protegido. Próxima implementación debe coordinar los tres controles con una inscripción privada de alumno/organización/coach QA, vigencia limitada y comprobación de is_test; fallar cerrado ante vencimiento/cambio de pertenencia y conservar todos los controles nutricionales, sanitarios, RLS e idempotencia. No se ha implementado ni instalado ese alcance en P29E.

Pruebas necesarias antes de instalarlo: sin inscripción, actor ajeno, organización no test, caducidad, cambio de coach/org, preservación de comportamiento OFF para cuentas no inscritas, validación sanitaria obligatoria para QA y rechazo de fuentes no revisadas. Después, publicación desde sesión real cuando estén satisfechos los requisitos humanos, reintentos/historial y Mi Día. No certificar esas pruebas mediante SQL administrativo.
