# Ampliación de datos faltantes — 14/11/2026

Sobre la candidata de 617 alimentos se completan 414 celdas antes nulas y se actualizan 187 aportes parciales de recetas: 601 valores enriquecidos. Los valores que ya eran completos se conservan, igual que todos los macros y las cantidades/rendimientos de recetas.

Cobertura de ocho componentes: **420 completos (antes 85), 197 parciales (antes 532)**. Todos los 617 alimentos tienen magnesio, calcio, hierro y zinc; faltan valores de B12 en 19, ALA en 99, EPA en 17 y DHA en 17. Algunas recetas tienen además un aporte numérico parcial si falta información de un ingrediente.

Se revisaron 199 filas SARA 2, 26 registros completos USDA y 243 correspondencias explícitas. ALA se toma de la columna que SARA identifica expresamente como alfa linolénico, nunca de 18:3 indiferenciado. Semilla de lino: 22,813 g/100 g; nuez: 9,080 g/100 g. La página 102 se verificó visualmente. EPA/DHA se convierten de g a mg y las bebidas respetan densidad declarada.

B12: se usan referencias USDA independientes para carnes, pescados y lácteos comparables, con diferencias de preparación y familia documentadas. La columna positiva de B12 de SARA sigue sin reinterpretarse: el encabezado impreso ambiguo no autoriza convertirlo a µg. Los ceros expresamente publicados se conservan como cero informado (invariante de unidad), con procedencia y sin sustituir celdas vacías. La precisión es la de la tabla, no un límite analítico.

`nutrientProvenance` permite auditar cada valor nuevo y se muestra en el detalle del aporte correspondiente. Las recetas se recalculan en orden de dependencias: únicamente sus valores ausentes o parciales, nunca los ya completos. Si falta nori seco o una cantidad de condimento, sigue indicada la contribución parcial y no se calcula déficit diario.

Validación: 34 pruebas locales aprobadas, comparación de los 617 perfiles previos, lectura independiente de todas las columnas incorporadas, hashes de fuentes, unidades, cifras de lino/nueces y no modificación del catálogo de macros. QA de navegador se ejecuta en la candidata con casos adicionales de ALA de lino y B12 de carne. Los resultados y la publicación se documentan en PR128.
