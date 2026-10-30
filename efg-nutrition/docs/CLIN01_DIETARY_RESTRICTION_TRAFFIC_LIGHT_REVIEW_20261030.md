# CLIN-01 · Semáforo dietético conservador: implementación base en candidata

**30/10/2026 · PR #37 DRAFT · NO aprobado para uso clínico · RELEASE NO GO**

Se añadió `pilot/dietary-traffic-light.js`, una función pura **de presentación** que evalúa la compatibilidad de un alimento respecto de las restricciones declaradas usando **únicamente filas de revisión individual con origen explícito y caducidad**. **Ninguna clasificación de alimento real está incluida**. Tampoco se conecta aún con la UI pública, ni se usa para autorizar la publicación de dietas/guías.

## Reglas de comportamiento verificables

- Si una persona **no declaró restricciones médicas ni patrón alimentario**: `neutral`, sin colores; la energía, calorías, grasa o cantidad de carbohidratos **NO** intervienen en la clasificación.
- Para restricciones declaradas: `green` solo si **cada** condición cuenta con exactamente una fila de revisión vigente y válida para ese alimento y el dictamen explícito `allowed`; nunca deducir compatibilidad de nombre, macros ni categoría.
- `yellow` si falta origen, vence la revisión, no hay responsable, hay dictámenes duplicados o contradictorios, existe incertidumbre o dictamen `verify`. Nunca convertir desconocido en verde.
- `red` solo si existe una revisión explícita y vigente con `avoid` respecto de alguna restricción declarada; otra condición incompleta no debe borrar esa señal. La etiqueta es informativa («Incompatible ... según revisión»), no un acto médico, prescripción ni prohibición legal.
- Validar `food_id`, `restriction`, `reviewed_by`, `evidence_id`, `source_url` HTTPS, `reviewed_at`, `expires_at`, `status=reviewed` y `verdict` admitido. **Los campos en cliente no son prueba de autenticidad**: la fuente futura debe ser tabla administrada por profesional con RLS/permiso de solo lectura y auditoría inmutable. Aun así no basta con una cadena que diga `reviewed`.

## Cobertura de prueba

`tests/dietary-traffic-light-contract.mjs` comprueba 20 casos enteramente **ficticios** (restricciones `dummy_a`/`dummy_b`, alimento `test_food`, URL `example.invalid`) y 3 casos de entradas inválidas. Se invoca desde `.github/workflows/efg-nutrition-premium-qa.yml`.

No contiene consejos sobre diabetes, celiaquía, embarazo, alergias o hipertensión y **no respalda ninguna afirmación de que un alimento real sea seguro**. Los colores deben mantenerse fuera de la interfaz de todas las modalidades hasta completar revisión de datos por profesional, fuentes y etiquetas de alérgenos, derechos de la persona y consentimiento legal.

## Para integrar después del gate clínico

1. Acordar con profesionales de nutrición/seguridad alimentaria una **tabla de revisión por alimento×restricción**, procedencia, lote/fabricante cuando corresponda, caducidad, responsable, evidencia y notas de contaminación cruzada. Celiaquía requiere cautela especial; una receta genérica o lista de ingredientes no garantiza ausencia de gluten.
2. En backend autenticado, exponer únicamente revisiones publicadas firmadas/verificadas; impedir que alumnos/coaches cambien `reviewed` o la procedencia mediante REST.
3. Calcular por persona sus restricciones declaradas sin autodiagnóstico, separar claramente «veganismo» de condiciones médicas y registrar cambios de preferencia sin revelarlos a terceros.
4. Añadir UX verde/amarillo/rojo para Alumno de coach, Coach al crear guía y Personal/Autogestión, sin colorear opciones si no hay restricciones; permitir elegir alimento bajo su responsabilidad, evitando textos como «prohibido» absoluto.
5. Ejecutar RLS/JWT BOLA, QA de etiquetas, fuentes, fecha y caducidad, pruebas manuales físicas, revisión legal y médica, antes de habilitar.

**Advertencia:** la suite sintética valida la **lógica de presentación en memoria**, no la revisión de alérgenos, la seguridad clínica ni un sistema de nutrición ya apto para publicación.
