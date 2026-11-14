# Nori seco y ampliación puntual de perfiles

Sobre 8ba19873cdd42ccc10ec602e138f8c8f6dff1d34 se mejoran 249 valores antes ausentes/parciales en 48 alimentos. Cuarenta perfiles de sushi, piezas, platos y combos reciben seis componentes del nori seco. Además se añaden referencias para ALA de whey seco, pulpo cocido, centolla (equivalente de cangrejo cocido) y base de té negro personalizable; EPA/DHA de galletitas con chocolate y B12 de budín marmolado (equivalente comercial tipo loaf).

## Resultado

- Perfiles completos: 662 → **669** de 853; parciales: 191 → **184**.
- Magnesio, calcio, hierro y zinc: aporte completo dentro del modelo en **852 de 853** perfiles; únicamente `cake` conserva cantidades de ingredientes desconocidas. Esto no significa análisis exacto del alimento real.
- Los 40 perfiles con nori dejan de tener minerales parciales. B12 y DHA del nori permanecen desconocidos; el total EPA+DHA sigue parcial aunque se incorpora el aporte conocido de EPA.
- No se cambian macros, rendimientos, ingredientes/cantidades, unidades ni valores que ya eran completos.

## Fuente MEXT y unidades

MEXT, Standard Tables of Food Composition in Japan, octava revisión, suplemento 2023. Registro 09003: `ALGAE/purple laver, dried`, Porphyra spp. No se usa alga fresca, condimentada o rehidratada. Se capturaron los modos 0 (minerales) y 4 (ácidos grasos por 100 g comestibles), comprobando el peso de consulta 100 g. `source.json` conserva filas originales, URL, hash de HTML, valores utilizados y exclusiones; `manifest.json` fija su hash.

Por 100 g: Mg 340 mg, Ca 140 mg, Fe 11 mg, Zn 3,7 mg, ALA 4 mg, EPA 1200 mg. ALA se convierte de mg a g; EPA conserva mg. Ejemplo: 3 g de nori añaden 10,2 mg Mg, 4,2 mg Ca, 0,33 mg Fe, 0,111 mg Zn, 0,00012 g ALA y 36 mg EPA al rendimiento completo de la receta; luego se divide por su rendimiento, sin cambiarlo.

No se usa B12 en este lote por diferencias entre las referencias revisadas para nori seco (MEXT 39,6 µg/100 g, CoFID 27,5 y AFCD 0), pendientes de revisar muestra/método. No se promedian ni se presume absorción. DHA se informa como guion en MEXT; no se convierte a cero. Otros ingredientes aún sin dato mantienen su bandera parcial para el nutriente correspondiente (por ejemplo ALA del vinagre).

Las referencias puntuales adicionales conservan atribución y licencia en los expedientes acumulativos AFCD/CoFID; corresponden a modelos genéricos y no a tablas oficiales de marcas. La leche/azúcar del té personalizable se registran aparte, como ya definía el catálogo.

## Verificación

La prueba `micronutrient-nori.test.mjs` compara los 853 perfiles contra el commit base y calcula de forma independiente la cantidad de nori por unidad, atravesando las recetas y los combos. Verifica cada incremento por nutriente, mg/g, conservación de B12/DHA, proporcionalidad de medias porciones y estado completo/parcial de las barras. Las pruebas históricas siguen cubriendo la torta de ingredientes no cuantificados.

Se mantienen los contratos anteriores de AFCD, CoFID, restaurantes y motor; 35 pruebas de motor/cobertura aprobadas localmente, más los contratos de ampliaciones, fuentes y assets. La QA visual agrega maki de salmón y whey para alumno/coach/admin en Chromium/WebKit. Candidata sin publicar: verificar el CI final antes de actualizar la app. Sin escrituras en diarios reales.
