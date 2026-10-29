# EFG Nutrition Pro — biblioteca de patrones base para guías Coach y Personal
**Investigación / especificación DRAFT · 29/10/2026 · NO aplicada a generador / NO publicada**

## Principio científico
Una **base alimentaria** es una estructura flexible de alimentos y grupos que sirve
al profesional para adaptar una guía a la energía, proteína, preferencias, presupuesto,
cultura, actividad, historia alimentaria y objetivo del alumno; NO es una dieta médica
automática, prescripción, diagnóstico ni garantía de que un alimento es seguro.

Un único catálogo y motor de porciones debe servir a **Con Coach** y **Personal**,
pero las ramas de atención clínica pueden requerir un nutricionista matriculado
y no pueden inferirse de un checkbox ni de macros generales. Toda medida clínica
requiere fuente y contexto real; no presentar la glucemia o colesterol calculados
a partir de un diario alimentario.

## Patrones base y ejemplos de cinco momentos (flexibles, no menús terapéuticos)

| Patrón | Base didáctica orientativa, cinco momentos | Adaptación obligatoria |
|---|---|---|
| Omnívoro equilibrado | Desayuno lácteo o huevos + cereal/fruta; media mañana fruta; almuerzo proteína + legumbres/grano + vegetales; merienda yogur/fruta; cena pescado/carne/legumbre + verduras y cereal | Porciones por objetivo real y contexto, no distribución porcentual universal |
| Vegetariano ovo-lacto | Desayuno yogur + avena; media mañana fruta; almuerzo lentejas con arroz y vegetales; merienda queso/semillas; cena tortilla de garbanzo + verduras | Clarificar si consume huevos/lácteos; revisar proteína, hierro, B12 y calcio si pertinente |
| Vegano | Desayuno bebida de soja + cereal; media mañana fruta + nueces; almuerzo tofu/tempeh + arroz y verduras; merienda yogur de soja; cena soja texturizada o porotos con vegetales | Corroborar B12 adecuada y hierro/calcio/yodo/vitamina D según valoración; ingredientes comerciales pueden variar |
| Pescetariano | Desayuno cereal + lácteo o bebida vegetal; media mañana fruta; almuerzo pescado y legumbres; merienda frutos secos; cena pescado/verduras/quinoa | Confirmar si acepta huevos, lácteos o mariscos y alergias |
| Estilo mediterráneo/cardiometabólico | Desayuno cereal integral + fruta; media mañana fruta; almuerzo verduras + legumbre + aceite de oliva; merienda frutos secos; cena proteína a elección + vegetales + cereal integral | Orientación de calidad general, no tratamiento automático de dislipidemia o enfermedad hepática |
| Estilo DASH | Desayuno avena y lácteo/bebida a elección; media mañana fruta; almuerzo vegetal + legumbres + cereal; merienda yogur o alternativa; cena proteína + verduras | Revisión real de sodio y fármacos, función renal, potasio; si sodio del producto falta, **no declararlo bajo sodio** |
| Adaptación con control de carbohidratos | Cinco opciones con legumbres, verduras, cereales integrales y proteínas ajustadas a horarios | Diabetes: ADA 2026 no respalda porcentajes universales de macros; medicación, monitoreo y distribución de hidratos requieren individualización clínica |
| Evitar gluten por celiaquía confirmada | Solo proponer alimentos/ingredientes con estado verificable y manejo de contaminación cruzada, no un menú de sustitución genérico | **No** usar catálogo genérico como prueba de “sin gluten”. Producto industrializado: consultar ANMAT vigente y rótulo, preparación/cocina segura; si desconocido, detener recomendación automática |
| Restricciones por alergia alimentaria | Excluir el alérgeno explícitamente registrado SOLO tras estructurar ingrediente, trazas y contaminación cruzada verificables | Ante ingredientes/fabricante desconocidos, NO sugerir el alimento como seguro. No equiparar gusto/disgusto con alergia |

**Importante:** Las cinco comidas existentes en la aplicación son momentos para
organizar el diario y la guía, NO una obligación universal de comer cinco veces
al día. Las situaciones clínicas, ayuno/medicaciones y costumbres pueden requerir
otro horario definido por profesional. El generador no debe proponer déficits
intensos ni restricciones arbitrarias por una etiqueta diagnóstica.

## Filtro seguro por capas — no habilitado en producción

1. **Preferencias no médicas** (vegano, vegetariano, pescetariano) seleccionadas
   voluntariamente: filtrar por ingredientes/composición **verificados**; si un
   producto genérico no trae etiqueta de ingredientes, mostrar “composición a
   confirmar” y evitar prometer aptitud. Evitar eliminar registros históricos.
2. **Sensibles**: diabetes, hipertensión, celiaquía, dislipidemia, hígado graso,
   alergias, embarazo, enfermedad renal, medicación relevante: pedir permiso
   de uso/compartición específico, indicar fuente autodeclarada, priorizar
   derivación/revisión profesional. **No inferir enfermedades ni imposiciones**.
3. **Seguridad crítica**: en alergias/celiaquía, alimento desconocido no puede
   etiquetarse seguro. Solo permitir sugerencia cuando ingredientes y trazabilidad
   son verificables y la elaboración no implica exposición relevante.
4. **Guía de cinco comidas**: el motor actual debe usar el patrón autorizado como
   punto de partida, pero la versión clínica requiere revisión formal,
   restricciones por ingrediente verificadas y aprobación explícita del coach
   con incumbencia profesional. Personal, al principio, recibe guías generales
   no terapéuticas y derivaciones.
5. **Datos**: sodio, azúcares, grasa saturada, micronutrientes, alérgenos:
   `unknown`/sin fuente NO equivale a cero ni a ausencia. Las macros
   genéricas actuales no permiten certificar reducción de sodio, alergias,
   azúcar añadida ni aptitud celíaca.
6. **Decisión final**: registrar versión de guías y fuente de alimentos, no usar
   como recomendación médica hasta revisión clínica, legal y de RLS.

## Revisión obligatoria ANTES del primer lanzamiento
- Registrar patrón alimentario, condición de salud/autorización y posibles
  alergias en tablas **distintas**, con finalidades y revocación separadas.
- Inventariar datos reales de **ingredientes, alérgenos, sodio, grasas saturadas,
  fibra, azúcares** y origen antes de aplicar filtros o etiquetas de seguridad.
- Validación de condiciones contradictorias: vegano+suplemento whey;
  celiaquía+producto no identificado; hipertensión con sodio desconocido;
  diabetes insulinotratada con plan fijo sin profesional.
- Controles de seguridad con pacientes ficticios y datos sintéticos, tests de
  denegación cruzada por organización, publicación de 5 momentos,
  preservación de diarios y revocación del permiso de salud.
- Conservar opciones culturales/comunes argentinas (pan miñón, lentejas,
  garbanzos, soja texturizada, tofu, gomitas) sin culpabilización por alimentos
  de disfrute. El indicador de calidad nutricional informa cobertura real;
  no inventa valores clínicos ni moraliza elecciones.

## Evidencia primaria (consultada 29/10/2026)
- Academy of Nutrition and Dietetics, **Vegetarian Dietary Patterns for Adults**,
  posición 2025 (edición corregida 2026):
  https://www.sciencedirect.com/science/article/pii/S2212267225008305
  Planes veganos/vegetarianos bien planificados pueden ser adecuados; requieren
  asesoramiento profesional y atención a nutrientes críticos.
- ADA, **Standards of Care in Diabetes 2026**, sección 5:
  https://doi.org/10.2337/dc26-S005
  Planificación individual, no proporción universal de carbohidratos/proteínas/grasas.
- AHA/ACC 2025 Hypertension Guideline:
  https://www.jacc.org/doi/10.1016/j.jacc.2025.05.007
  DASH, sodio e individualización; no presentar productos sin dato de sodio
  como “bajos en sodio”.
- AHA **2026 Dietary Guidance to Improve Cardiovascular Health**:
  https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health
  Frutas, verduras, granos integrales, proteínas de calidad, grasas insaturadas,
  menos sodio y azúcar añadida.
- EASL-EASD-EASO 2024 MASLD Guidelines:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11299976/
  Calidad de dieta tipo mediterránea y seguimiento; no todo hígado graso
  exige la misma prescripción.
- ANMAT, **Listado Integrado de ALG**, consulta oficial:
  https://listadoalg.anmat.gob.ar/Home/Home
  Confirmar rótulo, registro vigente y contaminación cruzada; no asumir.
- USDA FoodData Central: https://fdc.nal.usda.gov/
  **Los macros genéricos de este PR no son entradas de FDC identificadas.**

## Dependencia con la hoja de ruta
A. Cerrar UX1 y catálogo (revisión visual y coherencia de porciones).
B. Staging y permisos de la ficha Nutrition Coach.
C. Consentimiento, Términos/Privacidad versionados y revisión jurídica.
D. Revisión de nutricionista/experto clínico, ampliación de fuente alimentaria.
E. Módulo voluntario clínico separado (sin diagnósticos automáticos).
F. Motor de perfiles y filtros **por ingredientes verificables**; QA de conflictos.
G. Nutrition Personal/autogestión y “Calidad nutricional de mi alimentación”,
   mostrando nutrientes con fuente, cobertura e incertidumbre.

**ESTADO: investigación y diseño; nada de esto se ejecuta automáticamente en
el generador actual, ni es un plan médico personalizado.**
