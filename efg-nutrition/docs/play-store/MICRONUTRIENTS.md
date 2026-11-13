# Micronutrientes: candidata para revisión visual

Diseño elegido por Edu el 13/11/2026: opción 2, tarjeta original reducida, con tres columnas y barras de colores. La elección aprueba la visual, sin activar la función ni autorizar publicación global. Se promueve exactamente el CSS mostrado en esa alternativa al estilo de la candidata.

Se incorpora un bloque compacto «Micronutrientes» inmediatamente después del resumen de macros de Mi Día. Magnesio, calcio y omega-3 ALA quedan visibles; el detalle agrega hierro, zinc, B12 y EPA+DHA, aportes de alimentos/suplementos y referencias NIH/ODS. El historial conserva fechas y separa días completos, parciales y sin registros.

## Procedencia y límites

El sidecar se genera sin red a partir de capturas originales USDA ya presentes en el repositorio. Primera cobertura: 63 alimentos con identidad de fuente y unidad exactas. No equivale a completar todo el catálogo. Cada entrada conserva sourceId, URL, ruta de captura, hash del registro y códigos de derivación. Ausente no significa cero; recetas, marcas y cantidades incompatibles se muestran sin estimación. La incertidumbre de composición no queda resuelta por conocer calorías o macros.

ALA y EPA+DHA son grasas esenciales, separadas en la interfaz. No se inventa una RDA/AI para EPA+DHA. Las referencias requieren edad, variable de referencia y etapa vital explícitas; nunca se deducen del nombre, del coach seleccionado o de la ausencia de una respuesta. El contexto de ficha propia está cercado por usuario y época de autenticación. En la candidata de autogestión la referencia usa exclusivamente los campos explícitos de la ficha propia que originó la guía vigente.

El magnesio de suplementos requiere cantidad elemental explícita. Un gramo de aceite de pescado no se convierte en un gramo de EPA+DHA. Una etiqueta parcial no completa nutrientes no declarados. El límite superior de magnesio se aplica exclusivamente al aporte suplementario. Las barras no generan diagnósticos ni dosis/compras de suplementos.

## Activación y validación

`MICRONUTRIENTS_ENABLED` está activo en la candidata de autogestión, limitado por la cuenta/guía propia verificada. No hay cambios en datos alojados, consultas a terceros, escrituras del diario, merge ni despliegue. La aprobación visual es previa a publicación.

Pruebas del motor: referencias por edad/etapa, unidades y densidades, datos ausentes, fuentes incompatibles, suplementos, períodos sin ceros ficticios, HTML escapado y contexto propio. Ensayo de navegador: PWA real con adaptador sintético local y bloqueo de red externa; 390/320 px, ausencia de desplazamiento lateral, borrador conservado, falta de perfil y diario inmutable. Las capturas llevan datos ficticios y no prueban Android nativo o Safari.

Fuentes: https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/ ; https://fdc.nal.usda.gov/data-documentation/

Release de autogestión: activación limitada a cuentas independientes con ficha/guía propia verificadas. La referencia se deriva de los campos explícitos de esa ficha; no hay activación en alumnos con coach ni referencia inventada desde datos incompletos.

Corrección Mi Día (13/11/2026): se elimina la dependencia de autogestión para mostrar consumos diarios y por fecha. Visible para administrador, coach y alumno. Las referencias personales siguen requiriendo datos propios explícitos; de no existir se indica «sin referencia» y no se inventan porcentajes. El cálculo toma el diario actual en cada render tras el guardado, independientemente del modo o de la presencia de una guía.
