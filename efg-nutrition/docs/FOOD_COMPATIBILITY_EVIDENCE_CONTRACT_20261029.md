# EFG Nutrition Pro · contrato de evidencia y revisión del semáforo (PR37 DRAFT)

**29/10/2026 · No habilitar el semáforo en producción.** Este documento describe exclusivamente patrones excluyentes (vegano, vegetariano, pescetariano) y cautelas clínicas. No afirma que los alimentos del catálogo estén validados.

## Estado verificable
La función `classifyFood(food, profile, {catalogEvidence, now})` de `pilot/food-compatibility.js` sigue **OFF**. Rechaza de hecho la evidencia incrustada dentro de `food.compatibilityEvidence` (un objeto editable por cliente), obliga a proporcionar evidencia separada de un adaptador de catálogo controlado y exige identidad de alimento, regla, estado `reviewed`, ID de revisión, versión de catálogo, tipo de fuente, URL HTTPS y fechas vigentes. Sin evidencia separada, si hay restricciones, retorna amarillo (incluidas coincidencias del nombre comercial). La categoría y los macros no prueban compatibilidad.

**Límite fundamental:** una función pura en navegador **no puede autenticar un certificado o verificar RLS por sí sola**. Las verificaciones de metadatos sirven de barrera a errores accidentales, no sustituyen firma/consulta del servidor ni auditoría profesional. Un atacante puede fabricar cualquier objeto de JavaScript en su navegador; la seguridad jurídica/clínica y de otros usuarios depende del backend.

## Contrato mínimo del adaptador/backend
- Catalogar alimentos con un ID estable, marca/fabricante, presentación, país y vigencia cuando proceda. Los alimentos genéricos con macros estimados **no se convierten automáticamente en etiquetas de ingredientes verificadas**.
- Una revisión por alimento/regla debe incluir ID, versión de la ficha y catálogo, fuente específica (etiqueta del fabricante o producto oficial), URL HTTPS, fecha de captura/revisión, fecha de caducidad, clases de ingredientes, indicador de lista completa, revisor responsable y método/documento de verificación.
- El servidor valida identidad/rol, finalidad y permisos de salud, fuente confiable, vigencia y persistencia; no aceptar `status=reviewed`, `sourceKind` ni `catalogReviewId` de registros de usuario para habilitar verde.
- Reglas e incompatibilidades por patrón no son diagnósticos. Se conserva registro de lo consumido incluso cuando aparece rojo. Mostrar motivo y links a fuentes reales revisadas; la función de render escapa URLs y no muestra `javascript:`.
- Combinaciones de restricciones: roja si hay incompatibilidad demostrada; amarilla si hay incertidumbre y ninguna incompatibilidad documentada; verde solo si **todas** las reglas habilitadas están suficientemente cubiertas. **Sin restricciones excluyentes: neutro**, no verde. «Incluido en mi plan» es otro distintivo.
- CELIAQUÍA, alergias, fármacos, condiciones y declaraciones médicas **no se derivan de ingredientes genéricos**. Requieren revisión profesional de riesgos, etiquetado/certificación/contaminación cruzada, consentimiento y normas aplicables. Hasta entonces el motor muestra amarillo para esas reglas, nunca verde.
- Al vencer la evidencia o cambiar la formulación, invalidar las evaluaciones precalculadas y volver a amarillo hasta revisión. Registrar revisiones y rollback/rectificaciones.

## Evidencia para cerrar el gate
1. Revisión por un responsable competente de un conjunto representativo de alimentos (mínimo vegetarianos/veganos, productos multicomponente, cambios de marca/receta; celiaquía y alergias sólo tras módulo clínico separado).
2. Catálogo server-owned y pruebas HTTP con JWT de dos organizaciones; que el cliente no pueda inyectar revisiones falsas ni leer datos médicos de terceros.
3. Conectar el motor seguro a buscadores, planificador, guía del coach y selección del alumno/Personal; mantener la posibilidad de elegir y registrar cualquier alimento.
4. Pruebas por regresión: comida genérica sin etiqueta -> amarillo; usuario sin restricciones -> neutro; falso reviewed incrustado -> amarillo; fuente vencida -> amarillo; patrón incompatible con fuente probada -> rojo; múltiples restricciones ambiguas -> amarillo. Evitar claims verdes por formulaciones no verificadas.
5. Validación jurídica/científica, QA iPhone/Android y aprobación de propietario; bandera `FOOD_COMPATIBILITY_ENABLED=false` hasta entonces.

**Cambios de código PR37:** `food-compatibility.js` (separación de evidencia y fuentes legibles), `tests/food-compatibility.mjs` (contratos negativos y anti-inyección). No se ejecutaron migraciones ni se publicaron fuentes clínicas.
