# Micronutrientes: candidata para revisión visual

Se incorpora un bloque compacto «Micronutrientes» inmediatamente después del resumen de macros de Mi Día. Magnesio, calcio y omega-3 ALA quedan visibles; el detalle agrega hierro, zinc, B12 y EPA+DHA, aportes de alimentos/suplementos y referencias NIH/ODS. El historial conserva fechas y separa días completos, parciales y sin registros.

## Procedencia y límites

El sidecar se genera sin red a partir de capturas originales USDA ya presentes en el repositorio. Primera cobertura: 63 alimentos con identidad de fuente y unidad exactas. No equivale a completar todo el catálogo. Cada entrada conserva sourceId, URL, ruta de captura, hash del registro y códigos de derivación. Ausente no significa cero; recetas, marcas y cantidades incompatibles se muestran sin estimación. La incertidumbre de composición no queda resuelta por conocer calorías o macros.

ALA y EPA+DHA son grasas esenciales, separadas en la interfaz. No se inventa una RDA/AI para EPA+DHA. Las referencias requieren edad, variable de referencia y etapa vital explícitas; nunca se deducen del nombre, del coach seleccionado o de la ausencia de una respuesta. El contexto de ficha propia está cercado por usuario y época de autenticación. Falta conectar un adaptador verificado de ficha propia; hasta entonces las referencias reales quedan pendientes.

El magnesio de suplementos requiere cantidad elemental explícita. Un gramo de aceite de pescado no se convierte en un gramo de EPA+DHA. Una etiqueta parcial no completa nutrientes no declarados. El límite superior de magnesio se aplica exclusivamente al aporte suplementario. Las barras no generan diagnósticos ni dosis/compras de suplementos.

## Activación y validación

`MICRONUTRIENTS_ENABLED` permanece en false. Solo la copia aislada del ensayo visual activa el bloque. No hay cambios en datos alojados, consultas a terceros, escrituras del diario, merge ni despliegue. La aprobación visual es previa a publicación.

Pruebas del motor: referencias por edad/etapa, unidades y densidades, datos ausentes, fuentes incompatibles, suplementos, períodos sin ceros ficticios, HTML escapado y contexto propio. Ensayo de navegador: PWA real con adaptador sintético local y bloqueo de red externa; 390/320 px, ausencia de desplazamiento lateral, borrador conservado, falta de perfil y diario inmutable. Las capturas llevan datos ficticios y no prueban Android nativo o Safari.

Fuentes: https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/ ; https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/ ; https://fdc.nal.usda.gov/data-documentation/
