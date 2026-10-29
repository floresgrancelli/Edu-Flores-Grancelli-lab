# EFG Nutrition Pro · patrones keto, ayuno y calculadora Autogestión
**29/10/2026 | Documento técnico/científico + motor PURE DRAFT | NO PUBLICADO**

## Solicitud del propietario
- Añadir keto como opción seleccionable dentro de las bases alimentarias de
  **Nutrition Coach** y futura **Nutrition Personal/autogestión**, con
  revisión profesional cuando sea relevante y sin venderla como mejor opción.
- Ofrecer otras líneas con respaldo: mediterránea, DASH, Portfolio vegetal,
  flexitariana, vegana, vegetariana, pescetariana, moderada en hidratos y equilibrada.
- Añadir **ayuno intermitente como estrategia horaria separada** del patrón,
  sin pérdida automática de calorías/proteína ni obligación de cinco ingestas.
- **Calculadora de calorías/macros**: disponible para Coach y Personal, **NO
  disponible para el alumno vinculado al coach**. La aprobación de objetivos
  del alumno corresponde a su coach, respetando incumbencias.

## Esquema de las dos elecciones independientes
1. `diet_pattern`: balanced, mediterranean, dash, vegetarian, vegan,
   pescatarian, flexitarian, portfolio, low_carb, keto.
2. `eating_schedule`: regular (sin ayuno), 12_12, 14_10, 16_8.
3. `activity_goal`: sostener, bajar grasa, recomponer, aumentar músculo;
   determina la energía diaria desde la calculadora/objetivo aprobado. La
   ventana no añade recortes.
4. `health_screening`: diferente de preferencias: acceso/consentimiento y
   guardas específicas por fármacos, patologías y estado fisiológico. No
   almacenar una casilla de diabetes en un registro de “gustos personales”.

Estas opciones son ORTOGONALES: ejemplo
`{diet_pattern:"mediterranean",eating_schedule:"16_8"}`, o
`{diet_pattern:"vegetarian",eating_schedule:"regular"}`.
Keto y ayuno juntos no se habilitan automáticamente: requieren
revisión clínica contextual.

## Modelo científico de carbohidratos
- Keto no significa una proporción universal de grasa para toda persona.
  Una descripción frecuente en ensayos es **20–50 g/día de hidratos totales**,
  proteína adecuada y energía restante de grasas, **pero no convertir esa
  cifra en un objetivo generado automáticamente**. Confirmar carbohidratos
  TOTALES vs netos, fibra, fuentes de grasa, perfil lipídico, función renal,
  medicación y adherencia. La base de datos actual no certifica alérgenos ni
  grasos saturados de todos los alimentos.
- La AHA/ACC 2026 advierte que algunas personas aumentan LDL-C marcadamente
  con keto, especialmente dietas ricas en grasas saturadas.
- ADA 2026 desaconseja keto en personas con diabetes y tratamiento SGLT2 por
  riesgo de cetoacidosis; en otras situaciones clínicas se individualiza.
  Embarazo, lactancia, menores, alteraciones de la conducta alimentaria,
  enfermedad renal y diabetes tipo 1 exigen evaluación profesional.
- Una alternativa menos restrictiva para ofrecer es **moderada en hidratos**
  con decisión conjunta; no imponer porcentajes universales.

## Ayuno: regla del motor
La calculadora genera **K kcal, P g, HC g, G g/día** independientemente de la
ventana. Solo luego `distributeDailyTargets` distribuye esas metas entre 2, 3
o 4 comidas, conservando la suma EXACTA (a décimas).

Ejemplo conceptual de 16:8 12:00–20:00, con 3 momentos:
- 12:00 almuerzo: 35 % de K/P/HC/G.
- 16:00 merienda: 25 %.
- 19:30 cena: 40 %.
- Los porcentajes son UNA EXPLICACIÓN matemática, NO una recomendación
  universal de proteína por comida; el profesional puede ajustar las
  proporciones por edad, actividad, tolerancia y medicación.
- Ventanas propuestas: normal, 12:12, 14:10 y 16:8. 5:2, ayuno en días
  alternados o ventanas cruzando medianoche requieren diseño separado del
  diario y NO deben generar días de kcal cero.
- Cuando el usuario elige no desayunar por modalidad, ocultar o etiquetar
  esos horarios como “fuera de la ventana” SIN contarlos como incumplimiento,
  sin guardar comidas fantasma y sin alterar diarios anteriores.
- El motor actual de 5 comidas en `guided-day.js` y la sugerencia restante
  merienda/cena 1/3–2/3 en `planner.js` **NO SON COMPATIBLES POR DEFECTO**
  con ventanas y comidas variables: no activar la elección en producción
  hasta versionar el plan por modalidad, mapear slots y ensayar regresiones.
- Ante salud sensible o medicación de riesgo, no recomendar ayuno automático:
  buscar revisión del profesional, especialmente insulina, sulfonilureas,
  inhibidores SGLT2 y antecedentes de TCA. El ayuno no ofrece ventajas
  consistentes superiores a una restricción calórica equivalente.

## Diseño de roles / servidor
- **Coach**: calculadora ya existente (Mifflin–St Jeor / Ten Haaf), revisa
  metas y aprueba guías para alumnos cuando corresponda.
- **Alumno Con Coach**: puede ver su objetivo aprobado, registrar alimentos,
  revisar plan/horario; **NO presenta un botón ni ruta propia para recalcular o
  aprobar objetivos**. Nunca debe existir una RPC que permita al alumno editar
  su objetivo simplemente ocultando el botón.
- **Nutrition Personal**: futura modalidad del mismo producto. Al confirmar
  servidor `care_mode=personal` y su política de acceso, obtiene pantalla
  `Mi cálculo` con estimación de calorías, macros, actividad y objetivos;
  puede recalcular y guardar sus propios objetivos versionados, independientes
  de los de alumnos coach. **Nunca** derivar `care_mode` de URL, localStorage
  o una casilla cliente.
- **Admin**: no obtiene una calculadora que edite objetivos de un alumno solo
  por rol admin; acceso a modo de pruebas solo con permisos explícitos.
- La función pura `capabilitiesFor` del borrador es una comprobación de UI,
  **no garantiza autorización de servidor**. Falta diseñar tablas, RPC,
  políticas RLS, pruebas cross-role con JWT y backups de staging.

## Biblioteca ampliada y nivel de confianza
- Equilibrada, mediterránea y flexitariana: generales, ajustar preferencias.
- DASH: patrón general pero no confirmar que un menú es bajo en sodio sin dato.
- Portfolio: patrón vegetal con evidencia de reducción de LDL; no sustituye
  tratamiento farmacológico ni calcula automáticamente colesterol sérico.
- Keto: **requiere revisión** para la selección y jamás se habilita una
  prescripción clínica automática; especial precaución con LDL/SGLT2.
- Ayuno: preferencia horaria, no patrón alimentario ni pérdida de energía
  por sí misma.

## Implementado AHORA solo en rama DRAFT
- `pilot/diet-pattern-workbench.js`: opciones científicamente rotuladas,
  capacidad de calculadora por modo/rol, alertas de evaluación de keto
  y ayuno, distribución pura de metas diarias por ventana 12:12/14:10/16:8.
- `tests/diet-pattern-workbench.mjs`: casos de conservación de macros,
  rechazo de horarios inválidos, privacidad de roles y alertas médicas
  con fixtures ficticios.
- Ejecutado por CI a través de `tests/scientific-macros.mjs`.
- **NO se modificó index.html, pilot.js ni Supabase**. No se ofrece aún
  opción seleccionable en producción. Se conserva el orden de actualización
  PR33 UX1 → PR35 catálogo → PR34 Coach con staging → Personal.

## PENDIENTE DE IMPLEMENTACIÓN
1. Revisión clínica y legal, perfiles de salud opcionales con consentimientos
   y medicamentos bajo controles estrictos de privacidad.
2. Reglas de aptitud alimentaria por ingredientes verificados; fibra/sodio/
   grasas saturadas cuando la composición está documentada.
3. Entitlement Personal verificado por servidor y tabla objetivos propia
   + RLS. Hacer que **alumno coach jamás pueda modificar objetivos propios**.
4. UI Premium responsive para elegir patrón y horario; horario visible
   tanto en Coach como en Personal; historial de metas y revisiones.
5. Adaptar guiado y registro flexible: 2–4 momentos, horarios y día
   local; manejo de media mañana/merienda omitidas sin “fallos”.
6. QA iPhone, integración, historia, sincronización multicuenta, guías
   sin macros incoherentes, no publicación hasta aprobación del propietario.

## Fuentes científicas originales (verificación 29/10/2026)
- ADA 2026, Standards of Care 5:
  https://doi.org/10.2337/dc26-S005
  Alimentación individualizada; keto y SGLT2; ayuno y supervisión farmacológica.
- ACC/AHA 2026 Dyslipidemia Guidelines:
  https://doi.org/10.1016/j.jacc.2025.11.016
  Keto puede aumentar LDL en ciertas personas; evidencia Portfolio.
- BMJ 2025 network meta-analysis 99 RCT:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12175170/
  Beneficios de ayuno mayormente similares a restricción calórica continua.
- Nutr Metab Cardiovasc Dis 2025 meta-análisis isocalórico:
  https://pubmed.ncbi.nlm.nih.gov/39732588/
  Ayuno isocalórico no superior.
- BMJ Medicine 2026 network meta-analysis sobre ventanas:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12829361/
  Hay heterogeneidad en duración y hora de comida.
- AHA/ACC dislipidemia 2026 Portfolio:
  https://doi.org/10.1016/j.jacc.2025.11.016
- USDA FDC (para futura trazabilidad): https://fdc.nal.usda.gov/

**ESTADO:** desarrollo experimental no clínico y documentación. NO indicar
que keto, ayuno o calculadora Personal estén implementados en producción.
