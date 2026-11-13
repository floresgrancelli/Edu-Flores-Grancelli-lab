# Segundo lote de catálogo · candidata sin publicar

Base de producción56bf31cf575e68c7fd7fad9463db14cc20aa8fcc (PR119). Rama work/ncc-catalog-batch-two-20261113.

28 alimentos nuevos, 585 anteriores conservados exactamente, total613. Diez categorías incluyen verduras, frutas y conservas, legumbres, cereales, carnes y pescados, lácteos, panificados, preparados, bebidas y grasas. La comparación por identidad y preparación descartó alimentos existentes, como maracuyá, pallares y hummus. Cada fila nueva identifica estado/preparación y registro FDC.

Fuente: archivo oficial USDA SR Legacy2018-04, SHA2560fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef. review.json documenta la selección y source-records.json conserva los28 registros exactos. El verificador coteja las identidades, cinco nutrientes requeridos y sus unidades contra el archivo oficial completo. No se completan nutrientes ausentes con ceros: se descartó una referencia de pancake casero sin dato de fibra y se eligió otra preparación explícita con información completa.

Todas las cantidades se expresan en gramos. Las porciones sugeridas son masas divisibles, no pesos inventados de piezas comerciales. Los jugos también se pesan en gramos: no se asume que1ml equivale a1g. Duraznos en almíbar se declaran escurridos; damascos secos indican tratamiento con sulfitos; carnes crudas y cocidas tienen identidades diferentes. Referencia nutricional no equivale a certificación de aptitud clínica ni aprobación independiente.

Las28 nuevas identidades usan marcador neutro mientras no haya fotografía exacta. Se conservan los560 mapas fotográficos existentes y los25 marcadores neutros del lote anterior; no se asignan imágenes por palabras del nombre ni se modifica la paleta.

La propuesta SQL forward.sql archiva el snapshot585 y conserva la selección previa del snapshot560. Permite tres versiones de borrador sin modificar sus cantidades ni validaciones existentes. Exige coincidencia exacta de catálogo y cuerpo del validador y ausencia del archivo nuevo antes de aplicar. No cambia tablas de usuarios, políticas RLS, contratos de publicación, cálculos ni emisores de avisos. rollback.sql requiere revertir el cliente junto al catálogo; los borradores613 necesitarían revisión después de revertir. baseline.sql es solo para PostgreSQL17 desechable.

Preparación y pruebas no autorizan publicar. Mostrar capturas reales comparadas con producción y obtener aprobación visual de Edu; después comprobar HEAD/base/CI, verificar nuevamente el servidor y sincronizar el catálogo antes de fusionar/publicar. La conexión correcta existente para EFG Nutrition es Primary; verificar el proyecto cyjvddhimbsfipjfctsl, sin reutilizar la referencia de Conectando. No aplicar la propuesta durante la preparación.
