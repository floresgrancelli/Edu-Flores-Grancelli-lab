# Catálogo completo: 617 identidades con aportes estimados

Candidata de PR128. No publicada ni fusionada. Se agregan 298 perfiles a los 319 existentes, conservando estos últimos íntegramente y sin modificar el catálogo de calorías/macros.

La autorización del usuario permite recetas estándar aproximadas. Los modelos congelados incluyen ingredientes, cantidades en unidades nativas (g/ml), rendimiento final en gramos, conversiones de densidad y diferencias respecto del alimento de referencia. Las marcas reciben un proxy de familia identificado como **no rótulo del fabricante**. Las bebidas fortificadas identifican la referencia concreta; no se presume que toda marca tenga esa fortificación.

## Alcance y límites

- 617/617 con al menos un aporte estimado; ninguno pendiente de perfil.
- 85 con los ocho componentes numéricos sin ingredientes desconocidos; 532 con algún componente ausente o parcial. “Completo” describe cobertura de datos, no exactitud analítica.
- Magnesio, calcio y hierro: 617 perfiles con dato o aporte parcial; zinc: 616; B12: 528; ALA: 273; EPA y DHA: 551 cada uno.
- Se mantienen `null` para datos ausentes. No se deducen ácidos grasos individuales de grasa total ni ALA de 18:3 no diferenciado.
- B12 de SARA permanece sin utilizar por la unidad impresa ambigua (mg); no se reinterpreta como µg.
- Nori deshidratado sin fuente validada y condimentos sin cantidad del budín de Edu producen aportes parciales, no ceros. El detalle de la app explica la estimación y no calcula un faltante diario cuando faltan ingredientes.
- Recetas orientativas sin factores de retención: los pesos finales/cocidos se especifican; rendimiento y formulación reales pueden variar. La receta personal del budín usa pesos y rendimiento supuestos explicitados.
- Mate: TBCA 113H, extracción de 70 g secos/litro, con proxy declarado para mate cocido. No son gramos de yerba ingerida ni una medición de cada cebada. Leche y azúcar de infusiones personalizables se registran aparte.

## Procedencia reproducible

`completion-manifest.json` fija hashes de 53 registros completos USDA SR Legacy, 33 filas SARA 2 (con páginas/celdas), tablas revisadas TBCA y los 298 modelos. El generador no usa red y valida identidad, unidad, cantidades, ciclos y preservación de perfiles anteriores. La nueva rama de cálculo cuenta cada alimento una sola vez aunque tenga ingredientes parcialmente conocidos.

31 pruebas locales pasan: fuentes congeladas, preservación de 319 perfiles, macros sin cambios, unidades, escalado, contribuciones parciales y aviso de marcas. QA de navegador de la candidata se ejecuta en Chromium y WebKit a 390/320 px, para alumno, coach y administrador, con casos nuevos de leche, chía, chocolate de marca y budín. El resultado definitivo se registra en PR128.

Existe un fallo previo independiente de navegación/aviso en el workflow general `NCC day tools visual preview`. Esta validación específica no declara resuelto ese bloqueo de publicación.
