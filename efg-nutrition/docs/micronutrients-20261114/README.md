# Ampliación de micronutrientes — candidata

Base: producción PR126, 8f660da95964021fae389cdf52873e3988f4b10a. No publicada.

El catálogo mantiene los 617 alimentos, sus identidades, macros, cantidades y diarios. La composición de micronutrientes pasa de 63 a 218 identidades: 39 tienen los ocho componentes (EPA y DHA separados); 179 tienen datos parciales. Quedan 399 sin una referencia incorporada. No equivale a 218 alimentos con siete indicadores completos. Coverage.json enumera los 617, nutriente por nutriente; las recetas y marcas pendientes no reciben composiciones supuestas.

Fuentes: descarga oficial USDA SR Legacy (abril 2018), captura y SHA256 en source-manifest.json, registros completos seleccionados en usda-sr-selected.json.gz. Las fuentes anteriores tienen prioridad: se conserva cada valor no nulo y se completan solo nutrientes ausentes del mismo FDC ID. nutrientSupplementalCaptures identifica el origen del complemento. reviewed-mappings.json es una lista explícita revisada de alimento/preparación, no un emparejamiento automático por nombres. Los promedios genéricos no se presentan como análisis del alimento argentino ni como etiqueta de fabricante. No se modifican los macros para hacerlos coincidir con otra fuente.

Lomo vacuno cocido: referencia USDA FDC 170641, tenderloin magro, cocido a la parrilla. Por 100 g: hierro, zinc y B12 se proyectan desde los nutrientes originales y se multiplican por los gramos realmente registrados. No se mezclan pesos crudos con cocidos.

Achuras: SARA 2 (Ministerio de Salud, 2022), tabla 7.B, páginas 83, 87 y 89, revisadas visualmente. Calcio, hierro, magnesio y zinc se transcriben por 100 g. El encabezado impreso de B12 indica mg; se retiene como desconocido hasta corroborar la unidad, sin reinterpretar silenciosamente como µg. No se infiere ALA a partir de 18:3 indiferenciado ni EPA/DHA desde grasa total. La morcilla vasca usa exclusivamente el modelo 85/10/5 ya declarado en el catálogo: si falta un nutriente en cualquier ingrediente, el resultado de ese nutriente queda nulo. La ensalada de frutas usa el modelo existente de cuatro partes iguales.

catalogSourceId conserva el vínculo con la identidad nutricional histórica del diario; sourceId describe la evidencia de micronutrientes. Así, la referencia SARA no invalida una achura guardada con su identificador anterior. Una identidad incompatible continúa rechazada. La estimación es de lectura: no reescribe comidas, metas, fichas ni roles.

Validación: 20 contratos locales aprobados, incluidos conservación de cada valor anterior, trazabilidad del archivo, escalado del lomo, seis achuras, propagación de desconocidos y rechazo de sourceId incorrecto. Workflow específico captura la app en Chromium/WebKit, 390/320, tres roles. No cambios al diseño aprobado ni a referencias personales.

Pendientes: revisar fuentes locales y preparaciones para las 399 identidades restantes; priorizar carnes locales, merluza y jamón, luego recetas con rendimiento medido y productos con etiqueta. B12 de SARA y ALA requieren validación específica. No presentar los pendientes como cero ni afirmar cobertura total.
