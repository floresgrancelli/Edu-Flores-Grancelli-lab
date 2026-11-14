Última ampliación: [ENRICHMENT.md](ENRICHMENT.md), 420 perfiles con ocho componentes y 197 parciales.

Estado actual: ver [COMPLETION-617.md](COMPLETION-617.md), 617 identidades con estimaciones. Los lotes anteriores quedan como historial.

# Ampliación de micronutrientes — candidata

Base de esta tanda: producción PR127, 2b08fca6d20c4c6906d0471a930306e98f7cdc74. Las primeras dos tandas y las barras generales ya están publicadas; la tercera tanda aún no.

El catálogo mantiene los 617 alimentos, sus identidades, macros, cantidades y diarios. La composición de micronutrientes pasa de 63 a 319 identidades: 60 tienen los ocho componentes (EPA y DHA separados); 259 tienen datos parciales. Quedan 298 sin una referencia incorporada. No equivale a 319 alimentos con siete indicadores completos. Coverage.json enumera los 617, nutriente por nutriente; las recetas y marcas pendientes no reciben composiciones supuestas.

Fuentes: descarga oficial USDA SR Legacy (abril 2018), captura y SHA256 en source-manifest.json, registros completos seleccionados en usda-sr-selected.json.gz. Las fuentes anteriores tienen prioridad: se conserva cada valor no nulo y se completan solo nutrientes ausentes del mismo FDC ID. nutrientSupplementalCaptures identifica el origen del complemento. reviewed-mappings.json es una lista explícita revisada de alimento/preparación, no un emparejamiento automático por nombres. Los promedios genéricos no se presentan como análisis del alimento argentino ni como etiqueta de fabricante. No se modifican los macros para hacerlos coincidir con otra fuente.

Lomo vacuno cocido: referencia USDA FDC 170641, tenderloin magro, cocido a la parrilla. Por 100 g: hierro, zinc y B12 se proyectan desde los nutrientes originales y se multiplican por los gramos realmente registrados. No se mezclan pesos crudos con cocidos.

Achuras: SARA 2 (Ministerio de Salud, 2022), tabla 7.B, páginas 83, 87 y 89, revisadas visualmente. Calcio, hierro, magnesio y zinc se transcriben por 100 g. El encabezado impreso de B12 indica mg; se retiene como desconocido hasta corroborar la unidad, sin reinterpretar silenciosamente como µg. No se infiere ALA a partir de 18:3 indiferenciado ni EPA/DHA desde grasa total. La morcilla vasca usa exclusivamente el modelo 85/10/5 ya declarado en el catálogo: si falta un nutriente en cualquier ingrediente, el resultado de ese nutriente queda nulo. La ensalada de frutas usa el modelo existente de cuatro partes iguales.

catalogSourceId conserva el vínculo con la identidad nutricional histórica del diario; sourceId describe la evidencia de micronutrientes. Así, la referencia SARA no invalida una achura guardada con su identificador anterior. Una identidad incompatible continúa rechazada. La estimación es de lectura: no reescribe comidas, metas, fichas ni roles.

Validación: 25 contratos locales aprobados, incluidos conservación de cada valor anterior, trazabilidad del archivo, escalado del lomo, seis achuras, propagación de desconocidos y rechazo de sourceId incorrecto. Workflow específico captura la app en Chromium/WebKit, 390/320, tres roles. No cambios al diseño aprobado ni a referencias personales.

Pendientes: revisar fuentes locales y preparaciones para las 298 identidades restantes; priorizar otras carnes locales, luego recetas con rendimiento medido y productos con etiqueta. B12 de SARA y ALA requieren validación específica. No presentar los pendientes como cero ni afirmar cobertura total.

Segunda tanda: 25 referencias explícitas en batch-two.json. Incluye carnes y pescados con su preparación, ricota entera y parcialmente descremada, semillas sin cáscara, verduras y legumbres cocidas. Se verifica por nutriente contra el registro congelado, escalado a 75 g y conservación de las 218 composiciones anteriores. Anchoas: referencia en aceite escurrido, no salmuera; ricota magra: referencia parcialmente descremada, no etiqueta de marca.


Tercera tanda (batch-three.json): 12 referencias SARA 2 locales (merluza, pejerrey, jamón, tres alfajores y seis panes) y 9 referencias USDA (integrales, tostadas, pan árabe, aderezos, Port Salut, chocolate y galletas de arroz). No representa 264 alimentos completos. Las correspondencias de panes y chocolate son promedios genéricos explícitos; fortificación, marca y formulación pueden variar.

ALA/EPA/DHA se completan para chinchulines, chorizo cocido, molleja, morcilla, riñón, merluza y pejerrey desde las columnas identificadas de SARA 2, páginas 82, 86, 88 y 97. La fuente declara g/100 g: ALA conserva gramos y EPA/DHA se convierten a mg. Los ceros son valores explícitos de la tabla, nunca celdas vacías. fattyAcidEvidence retiene página, cantidades originales y conversión. La morcilla vasca solo se completa si todos sus ingredientes aportan ese nutriente. B12 sigue pendiente de unidad verificada. Para merluza y pejerrey se usa la fila preparada, no la fila cruda, cotejada con la tabla 9.A de página 97.

Validación de la tercera tanda: todos los valores previamente conocidos de PR127 se conservan; se verifica cada correspondencia USDA, escala SARA a 150 g y la conversión g→mg de EPA/DHA. La vista aprobada con referencias generales se conserva. Prueba de navegador específica añade merluza y jamón al diario sintético y comprueba contribución de merluza al hierro sin escrituras reales.


Cuarta tanda (batch-four.json): 35 identidades adicionales y complemento de una identidad ya conocida. Se incorporan 25 promedios locales SARA 2, cuatro referencias genéricas USDA, tres modelos de mezcla declarados en el catálogo y registros exactos completos recuperados de la API oficial para huevo, pechuga, arroz y yogur descremado. El yogur ya tenía algunos datos; se completan solo los ausentes del mismo FDC ID. La clara 747997 se conserva en la captura completa pero no se cuenta como cubierta: ese registro no declara ninguno de los ocho componentes buscados.

usda-full-five.json.gz conserva las cinco respuestas oficiales completas, con SHA256 y URL/ID en usda-full-five-manifest.json. La prioridad sigue siendo cada valor anteriormente congelado; los registros completos solo complementan valores ausentes. nutrientSupplementalCaptures identifica la captura adicional. La composición de mezclas usa exclusivamente proporciones ya declaradas: maní/nueces/almendras/cajú 25 % cada uno; nueces/almendras/avellanas/cajú 25 % cada uno; pasta de maní 100 % maní, con la referencia de maní tostado ya utilizada. Son estimaciones genéricas y varían con la proporción o el proceso real. Si falta un nutriente en un ingrediente se mantiene nulo.

SARA: quesos p77/79; zapallitos y zapallo hervido p27; dulces p105; merluza cruda/preparada p97/98; cortes vacunos p91. Los cortes grasos (asado, vacío, matambre y picada común) y magros (carne magra y nalga) se vinculan con los promedios de grupos expresamente ejemplificados por SARA, no con análisis individuales de cada corte. El puré simple usa pulpa hervida sin agregados como aproximación. Quesos y dulces corresponden a genéricos, nunca se trasladan a marcas. Los pesos crudos y cocidos de merluza tienen filas independientes.

Esta cuarta tanda conserva los 264 perfiles anteriores conocidos, sus macros y las barras aprobadas; 25 contratos prueban conservación, origen, gramos y mezclas. La comprobación de navegador añade huevo, pechuga, arroz y mix al diario sintético. Las tandas 3 y 4 siguen en PR128; producción conserva PR127 hasta una publicación autorizada.


Quinta tanda (batch-five.json): ocho referencias genéricas USDA añadidas, 307/617 identidades con algún dato. Conserva íntegros los 299 perfiles de la cuarta tanda. Incluye clara cruda, harina de avena, arroz integral medio como aproximación al yamaní, pan blanco, bife magro de ternera cocido, gelatina preparada azucarada y reducida en calorías, y granola. Las notas específicas de correspondencia están en reviewed-mappings.json; no son etiquetas argentinas ni análisis individuales. Harina de avena: fuente parcialmente desprovista de salvado; granola: receta genérica variable.

Clara: la captura Foundation 747997 sigue sin nutrientes objetivo. La referencia alternativa SR Legacy 172183 se identifica explícitamente como reviewed_generic_reference y conserva catalogSourceId=747997 para el diario. No se atribuyen los datos al registro Foundation ni se modifican macros. Se verifican los ocho componentes contra el extracto oficial y el escalado a 175 g. Los faltantes siguen siendo null. Fuente descargable oficial: https://fdc.nal.usda.gov/download-datasets/ ; SHA256 del archivo original cotejado con el manifiesto existente.

Estado: tandas 3–5 preparadas, sin merge ni despliegue. 25 pruebas de contrato locales aprobadas; validación de navegador de esta revisión pendiente en CI (Chromium no disponible localmente).


Sexta tanda (batch-six.json): 12 identidades nuevas, con ocho referencias USDA distintas; cuatro pares son alias del mismo alimento. Cobertura total: 319 de 617 (60 completos para los ocho componentes, 259 parciales, 298 pendientes). Añade sashimi de salmón atlántico de cultivo y atún aleta amarilla, ambos crudos; medialunas de manteca mediante aproximación a croissant; galletitas de agua e integrales; pochoclo acaramelado sin maní; arroz con leche preparado y tortilla de trigo refrigerada. No son análisis de productos argentinos ni etiquetas de marca. Se documentan variaciones de especie, receta y fortificación en cada correspondencia.

Validación local: 26 pruebas aprobadas, conservación exacta de los 307 perfiles anteriores y de los macros, revisión de los ocho componentes por registro, conversión de ácidos grasos, escalado y equivalencia entre alias. El ZIP oficial fue recuperado y su SHA256 coincide con el manifiesto.

Corrección del test de navegador: la tanda previa saturaba la barra de magnesio al 100%; esperar que aumentara su ancho era incorrecto. Ahora se comprueba que la cantidad mostrada cambie aun con la barra llena, y que el ancho aumente con un diario reducido por debajo de la referencia. Se conserva la comprobación de tres roles, dos anchos y ambos motores en CI. La ejecución local está bloqueada por permisos del navegador. También existe un fallo separado en notice-review-browser (confirmación superpuesta con navegación); queda pendiente, no se afirma que toda la candidata esté aprobada. No merge ni despliegue.
