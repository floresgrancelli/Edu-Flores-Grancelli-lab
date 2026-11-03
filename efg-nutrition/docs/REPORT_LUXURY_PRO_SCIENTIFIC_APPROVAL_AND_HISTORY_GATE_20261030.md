# REPORT-LUX · Informe semanal Nutrition Coach · Diseño y evidencia

**30 de octubre de 2026 · PR #37 DRAFT · Sin desplegar**

## Decisiones del propietario aprobadas

- Estética **Luxury Pro**: azul noche, champagne/dorado satinado, marfil; estructura editorial de tarjetas, gráficos, top de alimentos y síntesis personalizada.
- **La serotonina de marca es el recurso REAL** `pilot/assets/serotonina-acuarela.avif`: no redibujar cadenas químicas genéricas.
- Vista previa exacta en la app, exportable por `window.print()` / «Guardar como PDF» del navegador; **no** se genera un PDF persistente en servidor.
- Conclusión y texto de flexibilidad automáticos pero **editables por el coach antes de aprobar**; no enviar ni publicar automáticamente. Comida flexible sin «ganársela» ni recomendaciones clínicas.
- En la página del alumno: **«Responder informe al coach»**, que abre la conversación RLS existente, propone un *borrador de respuesta* y no lo envía; el alumno debe pulsar «Enviar».
- Historial para coach por alumno y fecha; mantiene los informes preexistentes en texto plano. Un informe ya compartido para una semana NO se sobreescribe por la ruta normal de publicación.
- Nutrition Autogestión sin cambios y desactivada.

## Implementación candidata

`pilot/weekly-luxury-report.js` calcula un modelo y renderiza HTML accesible; `pilot/weekly-luxury-report.css` aporta estilos responsive e impresión A4; `pilot/pilot.js` integra editor, previsualización, aprobación explícita, lectura y descarga, sin alterar la tabla histórica `efg_weekly_reports`; `pilot/messages-ui.js` abre el chat con borrador contextual y autorización existente. Carga de historia limitada a 52 informes del coach y 12 del alumno por consulta. La base sigue usando sus RLS existentes; **no se hicieron DDL/DML en Supabase alojado**.

La versión nueva se serializa con `kind=efg_luxury_weekly_v1` en `report_text` (máx. 8.000 caracteres). Las anteriores se identifican como texto plano y se conservan. Hay una restricción única `student_id,week_ending` vigente: se rechaza una nueva publicación de esa semana en vez de sobrescribir la anterior. **Versiones de correcciones posteriores a publicar no están implementadas**; requerirían un esquema de revisiones auditable, con RLS propio y ensayos de migración. El borrador del coach **no se guarda aún como borrador persistente en servidor**; se edita antes de compartir.

## Reglas científicas implementadas (sin confundirlas con normas clínicas)

1. Solo registros de **la semana exacta de 7 días** seleccionada; días ausentes nunca valen cero. Los promedios son de días declarados, nunca estimaciones de consumo real.
2. Cada promedio diario se contrasta con la meta **aprobada para esa fecha**. Si faltan metas para algún día registrado, esa comparación queda no disponible.
3. Control interno conservador de calidad del dato: **4 días con registro, 3 cerrados por fecha**, y, si hay información de comidas, por lo menos **3 días con dos o más comidas cargadas** para una conclusión orientativa. Cerrar por fecha NO demuestra registro completo. Con baja cobertura, no recomienda aumentar ni disminuir macros.
4. Los límites `90% proteína`, `95% energía/HC`, `85% grasas` son **umbrales operativos internos EFG para invitar a revisar**, no están validados como puntos de corte clínicos ni justifican indicaciones automáticas.
5. Si proteína figura por debajo del objetivo, prioriza revisión de proteína con el coach. Si proteína está cercana a la meta pero la energía y los hidratos figuran por debajo, invita a revisar carbohidratos según el entrenamiento. Si grasas figuran muy bajas, invita a revisar energía y grasas. Nunca prescribe dosis sin el objetivo y contexto profesional.
6. El alumno puede tener restricciones clínicas, alergias o contraindicaciones no recogidas en el informe. **No se generan indicaciones clínicas ni se afirma que un alimento sea seguro**; toda conclusión y flexible food pasa por revisión del coach y, cuando proceda, de profesional de nutrición matriculado.
7. Toda conclusión incluye en «¿Cómo llegamos a esta conclusión?» una descripción de la cobertura, metas históricas, umbrales internos y bibliografía. Se distingue claramente **dato observado**, **comparación con un objetivo individual** y **sugerencia revisable**.

**Fuentes utilizadas como marco general, no como validación de los porcentajes de EFG:**

- Academy of Nutrition and Dietetics / Dietitians of Canada / American College of Sports Medicine. *Nutrition and Athletic Performance* (2016). DOI: [10.1249/MSS.0000000000000852](https://doi.org/10.1249/MSS.0000000000000852)
- International Society of Sports Nutrition. *Position Stand: Protein and Exercise* (2017). DOI: [10.1186/s12970-017-0177-8](https://doi.org/10.1186/s12970-017-0177-8)

## REPORT-LUX-76 · Continuidad de edición y revisión exacta (candidato del 30/10)

Se agregó `pilot/weekly-luxury-editor.js`, memoria volátil por `coachId + studentId + weekEnding`:

- Al editar conclusión o flexibilidad **se deshabilita** el botón «Aprobar y compartir» hasta actualizar la vista previa. El `INSERT` exige además `requirePreview` del mismo modelo nutricional y mismo texto final; un botón deshabilitado por sí solo no es el control de seguridad.
- Al redibujar la pantalla en la misma sesión conserva el texto editado; no usa `localStorage`, `sessionStorage`, tabla, cookies ni transferencia a servidor mientras se edita. **No conserva borradores al cerrar sesión o recargar el navegador** (queda pendiente un borrador persistente autorizado y versionado, si se decide en otra fase).
- Si cambian registros, objetivos o el modelo base, invalida la aprobación de vista previa y exige revisarlo otra vez; no descarta silenciosamente el texto del coach. Si cambia coach/alumno/semana, elimina el borrador anterior para evitar mezclar información entre personas.
- La impresión de una vista previa nueva exige el mismo control de revisión. En un informe **ya publicado**, el PDF muestra la versión histórica guardada y nunca recalcula contenidos a partir de nuevas comidas.
- Se añadieron `tests/weekly-luxury-editor.mjs` con casos ficticios: primera vista no publicada, edición y render, cambios posteriores, variaciones de calorías, aislamiento por identidad, rechazo de texto vacío/largo, ausencia de almacenamiento persistente. Se ejecuta junto con el contrato Luxury Pro en Premium CI.
- Las medidas cliente **no reemplazan** RLS/PostgreSQL, pruebas de consentimiento revocado, autorización con JWT, revisión legal/clínica, validación en teléfonos físicos ni aprobación de despliegue.

## Pruebas y limitaciones

- `tests/weekly-luxury-report.mjs`: promedios matemáticos, objetivos que cambiaron en la semana, top de alimentos por días, no considerar días faltantes como cero, entradas sin suficientes comidas, revisión del coach, datos ficticios, escape de HTML e informes anteriores.
- `tests/weekly-luxury-integration-contract.mjs`: comprueba el CTA hacia mensajería, ausencia de envío automático, historia y no sobrescritura, estilo, logo de serotonina aprobado y referencias científicas.
- `.github/workflows/efg-nutrition-premium-qa.yml`: ejecuta ambos tests; los cinco checks deben estar en SUCCESS **en el mismo SHA** antes de siquiera considerar GO.

**NO GO hasta verificar**: render visual real en iPhone/Android/PC, impresión/exportación PDF físico, E2E con coach y alumno de dos organizaciones, permisos y consentimiento revocado, contenido legal y revisión científica/ética profesional, restauración de datos y autorización de publicación del propietario. El informe ejemplo de «Sofía» tiene DATOS FICTICIOS.
