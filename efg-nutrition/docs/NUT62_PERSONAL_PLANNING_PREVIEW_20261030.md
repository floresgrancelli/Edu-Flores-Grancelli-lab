# NUT-62 · Ficha Personal → estimación → distribución educativa de cinco comidas

**Fecha:** 30/10/2026  
**Proyecto:** EFG Nutrition Pro · PR #37 DRAFT · **OFF / NO GO**  
**Entorno:** únicamente código candidato, pruebas sintéticas; sin PWA publicada ni DDL/DML sobre Supabase hosted.

## Implementación técnica real

Se creó `pilot/personal-planning-preview.js` que enlaza de forma explícita el contrato de `personal-intake-draft.js` con la función **existente** `estimateMacros()` de `macro-engine.js`. El método aplicado a la vista previa es Mifflin–St Jeor con factores de actividad ya incluidos en el motor (1,20 / 1,35 / 1,50), proteína/grasas por kg según el motor vigente y una estrategia de recomposición del 5% por defecto. No se ajustó silenciosamente el cálculo científico ni se alteró el motor del Coach.

La función `createPersonalPlanningPreview(rawIntake,{explicitPreviewRequest:true})` **no se invoca automáticamente al abrir la ficha**. Antes de calcular:

1. Valida la ficha, con sus códigos permitidos y tipos.
2. Rechaza cualquier condición médica autodeclarada y cualquier objetivo de hábitos general; las situaciones clínicas necesitan evaluación individual. No intenta clasificar alimentos verdes/amarillos/rojos.
3. Exige una edad entre 18 y 90 años, altura 120–220 cm, peso 35–300 kg, variable de sexo de ecuación elegida explícitamente, actividad admitida y objetivo compatible. El formulario permite campos más amplios, pero el estimador NO debe asumir que son admisibles.
4. Rechaza falta de datos o imposibilidad energética reportada por el propio motor.
5. Produce una **estimación transitoria** de energía/metas, y un reparto aritmético en cinco comidas **sin seleccionar alimentos**.

Distribución ilustrativa inicial: desayuno 22%, media mañana 13%, almuerzo 29%, media tarde 14%, cena 22%. Es una repartición matemática de ejemplo, **no** la regla «merienda 1/3 y cena 2/3» del motor independiente de *Resolver lo que me falta*. El algoritmo de restos mayores conserva exactamente los enteros diarios de energía, proteína, hidratos, grasa y fibra, evitando perder gramos por redondeos sucesivos. No se definen horarios de ayuno ni restricciones por diagnóstico.

`renderPersonalPlanningPreview()` genera tabla legible para un futuro panel, muestra ecuación/actividad aproximada y advierte explícitamente que **no se guarda, no se envía a un coach y no crea ni aprueba una guía**. No hay controles de guardar/publicar ni se devuelve historial médico o identificación en el resultado. `PERSONAL_PLANNING_PREVIEW_ENABLED=false` mantiene la UI funcional **apagada**.

## Pruebas agregadas

`tests/personal-planning-preview.mjs` se añadió como gate a `.github/workflows/efg-nutrition-premium-qa.yml`. Verifica solicitud positiva, privacidad, bandera OFF, límites de población, condiciones médicas, falta de entradas, identidad neutral del resultado, cálculo reproducible y conservación exacta de kcal y gramos en las cinco comidas; también detecta sumas manipuladas y contenido HTML no confiable.

En paralelo se corrigió `pilot/personal-workspace.js`: fecha inválida ya no dispara una excepción técnica de `toISOString()` y se bloquea renderizar guías o habituales de otro titular; hay pruebas negativas específicas en `tests/personal-workspace-readonly.mjs`.

## Próximos requisitos (NO GO)

- Validación de la estrategia por profesional matriculado, especialmente el uso apropiado de ecuaciones y asignación de macronutrientes.
- Consentimiento para datos sensibles y textos legales aprobados, esquema privado/RLS/JWT + revisión/retención antes de habilitar ficha clínica.
- Integración de la interacción real del formulario en el panel Personal, no únicamente exportar funciones puras, y selección de catálogo/construcción de dieta guía con comprobación de restricciones.
- Pruebas en staging con roles, cancelaciones, restauración/PITR, SEC-08 completo, sistemas móviles/PWA antiguos y visuales, antes de solicitar GO.
- Los valores de la vista previa **NO** se usan como meta persistente, no afectan planes de Coach/Alumno y no sirven para reemplazar atención nutricional.

**Publicación bloqueada.** No tocar el branch `efg-nutrition-app`, el servicio Render, bases reales, roles/usuarios ni consentimientos alojados.
