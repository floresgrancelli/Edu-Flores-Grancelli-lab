# Nutrición Con-Ciencia — expediente P26M para revisión humana
Fecha: 2026-11-03 (ART). Base: PR43, f4a675f375f3b84150305d162063ce193370139b.

**No aprobado · NO PUBLICABLE · no activar flags.** Las cuatro fases RLS con JWT reales solo acreditan lectura/aislamiento en su alcance. No acreditan publicación de objetivos, escritura del diario ni valores nutricionales autorizados. El borrador P26 de RLS con `qa_fixture` y `guide_proposal=null` queda fuera de este expediente: NUNCA transformarlo en dieta.

## Instrumento reproducible
El generador `tools/ncc-p26m-real-guide-review.mjs` utiliza el motor `generateFlexibleGuidedDay` y las tasas nutricionales del **catálogo efectivo de la PWA**. Genera seis momentos (desayuno, media mañana, almuerzo, media tarde, merienda, cena), cantidades, macros y señal de restricciones **desconocidas**. Sus metas por defecto son **sintéticas** (2250 kcal, P155 g, HC250 g, G70 g); no corresponden a ningún alumno ni implican consejo personalizado. El coach puede editar alimentos, cantidades, horarios y metas desde su flujo autorizado. No se filtra ni oculta el catálogo del alumno.

Para producir el expediente del ejemplo sin red y sin escrituras: `node efg-nutrition/tools/ncc-p26m-real-guide-review.mjs --output-dir /tmp/ncc-p26m-review`. Para el plan realmente elegido por el coach, usar `--goal-json PATH --guide-json PATH` con sus dos documentos exactos y finales, luego el mismo `--output-dir`. Si cambia algún alimento, cantidad, unidad o receta, regenerar; no heredar una aprobación previa. **No copiar datos personales, consentimientos, JWT o comprobantes al expediente.**

Archivos que produce:
- `coach-guide-unapproved.json`: propuesta real del motor, metas, totales y digest de sus seis horarios; estado PENDING
- `selected-food-review.json` y `selected-food-review.csv`: únicamente los IDs realmente seleccionados y sus valores PWA
- `operator-review-worklist.csv`: fuente oficial, unidades, discrepancias nutricionales, datos primarios y columnas vacías de decisión humana
- `recipe-component-review-worklist.csv`: ingredientes de recetas compuestas; proxies externos nunca se certifican como alimentos del catálogo

## Pasos obligatorios de la persona revisora
1. Confirmar con la identidad del coach y la ficha **actual** compartida: versión, organización, revocación de seguimiento, restricciones consentidas; lo desconocido no equivale a sano
2. Revisar los objetivos calculados, cantidades, reparto de proteínas/hidratos/grasas, preferencias, horarios y compatibilidades; justificar sustituciones y patologías que requieran profesional
3. Por cada ingrediente realmente elegido, verificar identidad exacta, unidad por 100 g o 100 ml, preparación, fuente primara vigente, energía, P, HC, G, fibra, redondeos y discrepancias; no confundir equivalentes (pollo genérico vs pechuga asada, yogur o leche g vs ml)
4. Descomponer recetas; revisar ingredientes, rendimiento, mermas, alérgenos y posibles sustitutos/proxies. El semáforo no debe afirmar inocuidad clínica sin revisión
5. Registrar decisión humana expresa con responsable y fecha sobre el **mismo fingerprint** del plan final. Un archivo CSV con columnas de firma vacías o una captura USDA no aprueba la publicación
6. Ejecutar, por separado, las verificaciones alojadas de escritura/publicación atómica y UAT física iPhone/Android/escritorio antes del GO. Mantener producción y diarios históricos intactos

## Evidencia que permanece pendiente
**No hay un plan final firmado para un alumno real en P26M**. Este paquete prepara el circuito verificable y su plantilla real del motor, sin declararlo aprobado. No se creó ninguna fila de fuente, certificado nutricional, consentimientos, dieta publicada ni permiso server-side. El GO requiere **expediente final revisado + pruebas de escritura/publicación + UAT física + aprobación explícita del propietario**.
