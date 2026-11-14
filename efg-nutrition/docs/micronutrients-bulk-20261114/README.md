# Lote único: 169 perfiles pendientes

Baseline: `0d0e88df8734996683b4c3f11bb6344feb1b0f6c`. Resultado: 853 perfiles con los ocho componentes cubiertos por referencias o estimaciones; cero perfiles parciales dentro del modelo. **Completo no significa medido ni exacto.**

`audit-169.json` enumera cada perfil, nutrientes completados y procedencia. Los valores anteriores completos, IDs, unidades, cantidades, rendimientos, macros, registros y referencias diarias se conservan. La torta genérica es la única sustitución de una suma parcial por un equivalente de alimento completo: torta de manteca comercial sin cobertura AFCD F002169. La receta original no cuantificaba todos los ingredientes; ese supuesto queda explícito y no altera los ingredientes guardados.

## Clases de evidencia y límites

- AFCD: extractos y licencia conservados en `../micronutrients-afcd-20261114/`. `mappings.json` declara identidad y equivalencia para ingredientes y alimentos. Algunas equivalencias son del mismo alimento/estado, otras de especie, preparación o producto similar y de baja confianza. Los ceros son valores publicados del **equivalente**, no mediciones del producto del usuario ni ausencia absoluta.
- Recetas orientativas: `recipes.json` contiene cantidades por 100 g finales. Solo estiman nutrientes ausentes. Ñoquis, ensalada de papa, lemon pie, mousse, minestrone, rabas, lupines y licor de crema son modelos genéricos; cambian con receta, aceite, hidratación y proporciones. No son recetas declaradas por una marca.
- MEXT: `mext.json` captura filas y hashes de páginas por 100 g. Tempeh: ALA 720 mg/100 g, EPA/DHA 0; mung hervido: ALA (67) mg/100 g, donde los paréntesis se conservan como estimación de la fuente. Chinchulines: B12 del mismo órgano bovino crudo, 21 µg/100 g, usado como **equivalente de baja confianza**, sin ajustar cocción/limpieza; no representa análisis a la parrilla.
- Nori: B12 39,6 µg/100 g del nori seco MEXT 09003, no promedio de tablas incompatibles. La revisión de productos y el ensayo humano de `nori-review.json` respaldan la presencia de B12 en determinados productos. Concentración/biodisponibilidad variable: no garantía ni sustitución de indicación de suplementación. DHA procede del cero publicado por AFCD F008204, no del guion MEXT. Esta revisión sustituye el estado pendiente documentado en el lote anterior.
- Infusiones y bebidas: se identifican equivalentes acuosos o alcohólicos; leche, azúcar y calorías originales no se recalculan. No se afirma composición oficial de mate, hierbas, cócteles o marcas.

Las notas de estimación se muestran en el detalle de micronutrientes; los componentes derivados mantienen `bulkReferences`, enlaces, unidades y licencias. Las estimaciones de menor confianza deben refinarse si se dispone de rótulo, receta o análisis específico.

## Validación

`micronutrient-bulk.test.mjs` compara los 853 perfiles con la candidata anterior, exige exactamente 169 perfiles resueltos, verifica correspondencias con columnas AFCD, fórmulas por ingredientes y medias porciones para los 169. Mantiene casos sintéticos de composición desconocida/parcial para impedir que completar el catálogo convierta datos futuros ausentes en cero. El test de nori comprueba independientemente el incremento B12 por gramos de alga. Las pruebas históricas se actualizaron únicamente donde los faltantes documentados ahora tienen estimación; se conserva la comprobación de los valores anteriores completos.

Candidata sin publicar. Las pruebas en navegadores se ejecutan en la PR138.
