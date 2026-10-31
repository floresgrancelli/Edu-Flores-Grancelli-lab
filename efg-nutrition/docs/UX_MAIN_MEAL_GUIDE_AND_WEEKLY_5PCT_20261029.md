# UX-MEALS-01 + WEEKLY-05 · Registro guiado y margen semanal ±5%

29/10/2026 · PR #37 DRAFT · **cambios candidatos, NO publicados**. No se migraron datos ni se tocó Supabase/Render productivos. `COACH_ATOMIC_PLAN_UI_ENABLED=false`.

## Requerimiento aprobado por el propietario

Guiar la carga de **desayuno, almuerzo y cena**, sin modificar media mañana, media tarde ni merienda; permitir «Omitir» proteína e hidratos separadamente; incorporar una sección «Plato preparado» para comidas mixtas, y calcular siempre las grasas según la cantidad de todos los alimentos ingresados. Quitar la **barra semanal ±10 %**, conservar únicamente ±5 % y aplicar ese criterio a los días cumplidos / premio.

## Implementación propuesta en PR #37

- `pilot/guided-meal-picker.js`: clasificador **visual, no dietético** por grupo. Secciones `protein`, `carb`, `prepared`, `other`. Los alimentos de recetas/platos preparados y los que nombran tarta, empanada, pizza, sushi, sándwich, wraps, milanesa, etc. se muestran en *Plato preparado*. Las tartas de atún son un **único alimento** con `k,p,c,f,fi` completos. Para panes/arroz, hidratos; fuentes proteicas, proteínas; verduras, grasas, infusiones y extras conservan acceso en *Verduras y otros*. Un alimento puede aportar varios macronutrientes aunque aparezca en una sola sección.
- `pilot/pilot.js`: el popup de esos **tres horarios exclusivamente** muestra categorías con botones accesibles; filtro de alimentos por sección, botón «Omitir» solo para proteína e hidratos, resumen de grasas calculado desde la comida, «Agregar y seguir eligiendo» y «Registrar y cerrar». Las opciones de comida continúan utilizando el catálogo, gramos, unidades, estado crudo/cocido, cantidades reales y recálculo existentes. Los flujos de las otras ingestas siguen con el selector clásico.
- Los omitidos se guardan como metadatos de presentación en la propiedad JSONB existente `skipped._guidedComponents[slot].protein/carb`; **no agregan alimentos falsos, no alteran metas, no suman calorías y no declaran una restricción clínica**. Añadir un alimento de la misma sección desmarca esa omisión. Un plato preparado puede tener ambos macros aunque no se agregue una fuente separada.
- `pilot/guided-meal-picker.css`: diseño premium compacto y táctil para móvil; caché versionada mediante `pilot/index.html` y nueva importación de `pilot.js`.
- `pilot/weekly-consistency.js`: se elimina la segunda barra ±10 %. Un día cumple si calorías y proteína están dentro del criterio de la **única barra ±5 %** (proteína al menos 90 % de su meta como criterio anterior). El alias interno `acceptable` permanece por compatibilidad de coach/recompensas, pero ahora equivale **exactamente a** `ideal`. El premio 6/6 exige seis días de ±5 %, no seis días de ±10 %. Se conservan domingo no evaluable, día actual provisional y metas históricas. El texto científico aclara que ±5 % es **un criterio práctico del producto**, no un límite clínico universal.
- El `déficit −10 %` de la **calculadora de recomposición** no es una barra de tolerancia al exceso; sigue siendo una estrategia energética distinta y no se modificó por este requerimiento.

## Pruebas

- `tests/guided-meal-picker.mjs`: solo los tres horarios, preparado mixto no se duplica, nutrientes de tarta + arroz suman una vez y grasas automáticamente, marcas «Omitir», acceso a «Verduras y otros», inalteradas media mañana, media tarde y merienda, una sola barra ±5 %.
- `tests/weekly-consistency.mjs`: 2100 kcal / meta 2000 y 1900 kcal / meta 2000 cumplen; 2200 y 1800 kcal ya **no**; proteína mínima, días de lunes a sábado, cumpleaños de recompensa solo 6/6. CI Premium debe aprobar.
- `tests/premium-visual-smoke.mjs`: en Chromium móvil simulado, abrir desayuno, comprobar cuatro secciones y dos acciones «Omitir», acceder a platos preparados y a hidratos, cerrar, abrir media tarde y verificar selector clásico. UI renderizada solo con datos ficticios.
- CI Security, Premium, PostgreSQL 17 sintético, Supabase Auth local y Visual Chromium/WebKit deben pasar en un **mismo commit**; toda falla bloquea el release. El alcance visual no sustituye pruebas físicas iPhone/Android.

## Pendiente / NO GO

1. Comprobar en teléfono Android real y iPhone: apertura, desplazamiento del popup, seleccionar varios alimentos, omitir y desomitir, guardar, recuperar al día siguiente, comidas habituales, tamaños de pantalla y sin scroll bloqueado; el caso UX-ANDROID-01 del anillo queda pendiente de retest físico.
2. Revisión dietética/clinico-legal: los colores verde/amarillo/rojo de restricciones **son independientes** de estos grupos. La clasificación de alimento como «Proteína» o «Hidrato» nunca es promesa de seguridad dietética, alergias ni ausencia del otro macronutriente.
3. No publicar sin GO explícito y sin gates de NUT-57 de migración atómica con Supabase real, preservación de datos y compatibilidad de clientes antiguos.

**Proyecto Supabase Pro USD 25/mes; no hay ramas alojadas ni gastos adicionales. Render continúa en commit `9000e4d8`.**
