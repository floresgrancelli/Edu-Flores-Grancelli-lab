# NUT-63 · Balance diario Personal y distribución educativa de faltantes

**30 de octubre de 2026 · EFG Nutrition Pro · PR #37 DRAFT · NO GO**

## Qué se implementó en la candidata

Se creó `pilot/personal-day-balance.js`, un módulo puro e independiente del Coach que compara objetivos de **vista previa** NUT-62 con hasta cinco borradores de comidas NUT-60. Consume las cantidades y el catálogo a través de `previewPersonalMeal()` en cada cómputo, sin asumir que un total escrito por el navegador es autoritativo y sin cambiar registros previos.

El reporte diferencia por separado la energía, proteínas, hidratos, grasas y fibra **estimadas**, el consumo informado, lo que falta y lo que excede. No admite objetivos ficticiamente aprobados, mezcla de días, comidas duplicadas ni distribución en comidas ya registradas. Un exceso produce faltante **cero**, no cantidades negativas para consumir.

Cuando faltan **media tarde y cena**, divide cada faltante en **1/3 para media tarde y 2/3 para la cena**. Si solo resta la cena, asigna allí el 100%; si no hay comidas restantes, no inventa nuevas. Distribuye en décimas exactas mediante redondeo y resto para que ninguna pequeña diferencia se pierda. La distribución es **meramente aritmética**: no elige alimentos ni implica que la persona deba comer lo sugerido. Esto es distinto del plan de cinco comidas 22/13/29/14/22 de NUT-62, que solo ilustra objetivos globales al comenzar el día.

El resumen `renderPersonalDayBalance()` ofrece una tabla accesible para la futura UI Personal. Su diseño es informativo; no contiene botones de guardar, comidas automáticas ni comandos de escritura, y no expone identificadores de coach, organización o información médica. `PERSONAL_DAY_BALANCE_ENABLED=false` mantiene el producto **apagado**, como también lo están NUT-61 y NUT-62.

## Cobertura / límites

`tests/personal-day-balance.mjs` valida agregados con plato preparado que cuenta una sola vez, exactitud de faltantes en kcal/macros/fibra, reparto 1/3–2/3 y solo cena, fechas, grupos ya registrados, catálogos incompletos, valores negativos y ausencia de escrituras. Se enlazó a la suite NUT-62 ya incluida en **Premium QA** sin modificar la rama productiva.

**No hay backend de diario Personal operativo:** sus tablas y RPC continúan como SQL exclusivamente de staging local, sin aplicación alojada. No existe aún ingreso de alimentos real desde la interfaz, persistencia segura de borradores, autorización clínica/consentimiento real ni informes al usuario. No usar este módulo como prescripción.

## Próximas puertas

1. Confirmar Premium QA para el SHA que incorpora NUT-63 y luego los cinco controles del último HEAD. Resolver todo rojo en la rama candidata.
2. Construir contrato server-side para agregar/editar un día con control de concurrencia, sin permitir escrituras directas que eludan la revisión, y con persistencia solo por `auth.uid()` y RLS en staging fiel.
3. Integrar UI accesible y catálogo confiable, con criterios clínicos y restricciones revisadas por profesional, validación legal de datos sensibles y pruebas de consentimientos.
4. Pasar SEC-08, restauración/PITR, pruebas de dispositivo real y clientes PWA antiguos antes de pedir GO.

**Nada se fusionó ni desplegó y no se tocó la base de datos alojada.**
