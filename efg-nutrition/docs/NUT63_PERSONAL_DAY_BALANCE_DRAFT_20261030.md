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


## QA visual incorporado (fixture aislado)

Se añadió `tests/personal-visual-qa.mjs` (commit `2a7586e3`) y se conectó al workflow `efg-nutrition-visual-qa.yml` para ejecutar Chromium a 320/390/430/768 px y WebKit a 390 px (commit `f1ab51dd`). Construye **únicamente datos ficticios** y compone el panel Personal, la guía educativa NUT-62 y el balance diario NUT-63 con la identidad de serotonina. Comprueba no-desborde horizontal, cinco comidas, dos tablas desplazables, presencia del logo y ausencia de navegación heredada Coach/Admin. Genera capturas y JSON dentro del artefacto de CI.

La CSS de tablas y balance está agregada en `pilot/personal-workspace.css` (commit `8b7221c9`). Hasta obtener y revisar los informes/snapshots **no se declara QA visual aprobado**. Incluso un 5/5 CI con fixtures NO sustituye iPhone/Android físicos ni un entorno autenticado con JWT para Personal, que permanece OFF.
