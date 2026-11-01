# CLIN-GUT-01/02 · Intolerancia a lactosa + SIBO · Nutrition Coach · Propuesta científica de relanzamiento
**30/10/2026 · PR #37 DRAFT · FEATURE OFF · RELEASE NO GO**

## Estado técnico real
- Se agregaron dos opciones a la **ficha de relanzamiento Nutrition Coach**, en una sección visual propia «Condiciones digestivas y restricciones alimentarias»: `lactose_intolerance` y `sibo`. Ambas opciones, estados diagnósticos, fase FODMAP y autorización separada **se muestran deshabilitadas** mientras falten texto jurídico, alcance clínico, backend independiente y consentimientos verificables. Los datos **no se recogen, no se guardan y no se comparten** a través de la ficha general.
- La nueva función pura `pilot/gut-clinical-workbench.js` prepara para el coach borradores de cinco comidas por condición (desayuno, media mañana, almuerzo, media tarde, cena). Son ideas para revisar, **no planes aprobados ni prescripciones**: no asignan gramos, kcal ni macros sin metas personalizadas y no pueden enviarse automáticamente al alumno.
- La función `buildGutGuideForCoach` puede evaluar un alimento con `assessDietarySignal` pero **solo mediante evidencia revisada y vigente suministrada por un catálogo autorizado**. Nunca pinta verde por nombre, calorías o simple presencia de arroz, leche sin lactosa u otro alimento. Con evidencia inexistente en varias restricciones: amarillo; un evitar revisado tiene prioridad roja; sin restricciones: neutral.
- Se preservan todos los flags generales de release OFF y Autogestión sigue pausada. La opción SIBO también quedó en `PERSONAL_HEALTH_FLAGS` de la **ficha Personal futura, OFF**, sin abrir esa modalidad.

## Separación clínica
**Intolerancia a la lactosa**
- Autorreporte diferenciado de **alergia a proteínas de leche**; no crear etiquetas «sin leche» o «libre de alérgenos» por «sin lactosa».
- Orientación individual: alimentos cuya etiqueta confirma contenido de lactosa, sustitutos lácteos o deslactosados, quesos y yogur según tolerancia/porción, consideración de lactasa con profesional, calcio y vitamina D. No restringir todos los lácteos automáticamente.
- Sin etiqueta por producto/porción revisada: **amarillo**, incluso para «whey» y procesados con ingredientes lácteos.

**SIBO**
- Separar `suspected` (en estudio) de `confirmed`; solo una persona profesional evalúa diagnóstico y tratamiento.
- **La dieta no cura SIBO**. La opción baja en FODMAP es una herramienta posible para síntomas, con evidencia mayormente de síndrome de intestino irritable, **no una terapia SIBO probada**. Ningún plan de exclusión se activa por marcar SIBO.
- Si el profesional indica prueba breve baja en FODMAP, documentar inicio, fase, revisión y reintroducción; no prolongar exclusión indefinidamente.
- SIBO no equivale a dieta sin gluten, dieta sin lácteos, ni prohibición general de carbohidratos. Las porciones y la composición real de platos, salsas y ultraprocesados importan; revisar peso, ingesta energética, deficiencias y otras condiciones.

## Dietas base de cinco ingestas
Borradores deterministas, sin gramos ni metas arbitrarias:
- **Lactosa:** desayuno con huevos/cereal y leche deslactosada **si etiqueta y tolerancia lo permiten**; media mañana lácteo sin lactosa verificado o alternativa; almuerzo proteína + arroz/papa + verdura; media tarde fruta/colación individualizada; cena proteína + carbohidrato + vegetal.
- **SIBO:** desayuno con huevo o proteína elegida, cereal en porción revisada; media mañana individual; almuerzo pescado/pollo/tofu firme + cereal/tubérculo + verduras ajustadas; media tarde elegida; cena individual. Si se adopta estrategia baja en FODMAP, una base inicial deberá ajustarse por **tipo de FODMAP y tamaño de porción** y no etiquetarse «segura para SIBO».

## Requisitos para activar antes de la Gran Actualización
1. Revisar textos de consentimiento **específico para datos de salud** (separado de Términos/Privacidad y del permiso general para compartir la ficha); definir responsabilidad, tratamiento y criterios clínicos con profesionales matriculados y políticas aplicables.
2. Diseñar tabla/RPC **separada** con `auth.uid()`, RLS, titularidad, pertenencia a organización, permisos del coach independientes, revisión por versión, expiración/revocación, historial de auditoría y eliminación. **No** añadir `health_flags` a `efg_submit_coach_relaunch_intake`, que los rechaza explícitamente.
3. Validar evidencias de **ingredientes, alérgenos, lactosa y porciones FODMAP** vinculadas a producto exacto y versión. No inventar composición ni exportar clasificaciones Monash propietarias sin licencia.
4. Adaptar la calculadora/guía dinámica al plan autorizado, con el coach revisando cada propuesta. Nunca publicar automáticamente guía por autoselección clínica.
5. Ejecutar tests negativos/positivos con JWT de dos organizaciones, revocación de consentimiento clínico, fecha de revisión, múltiples restricciones y backend staging restaurado; QA físico iOS/Android.
6. Recibir autorización GO del propietario. **No crear recursos de costo ni alterar el proyecto Supabase alojado ni producción antes de autorización.**

## Referencias consultadas (30/10/2026)
- NIDDK / NIH · Alimentación en intolerancia a la lactosa: https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/eating-diet-nutrition
- NIDDK / NIH · Tratamiento: https://www.niddk.nih.gov/health-information/digestive-diseases/lactose-intolerance/treatment
- American Gastroenterological Association · SIBO y manejo con dieta: https://patient.gastro.org/small-intestinal-bacterial-overgrowth-sibo-managing-with-diet/
- AGA · Clinical Practice Update SIBO: https://gastro.org/clinical-guidance/diagnosis-and-management-of-small-intestinal-bacterial-overgrowth-sibo/
- Monash University · FODMAP Diet (enfoque por fases para SII): https://monashfodmap.com/ibs-central/diets/

**ESTADO:** interfaz y borradores programados con tests sintéticos, **recolección clínica real / catálogo de semáforo validado / dietas publicables PENDIENTES**. No GO.
