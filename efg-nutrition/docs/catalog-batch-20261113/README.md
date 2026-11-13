# Lote 1 de catálogo · candidata PR119

Base: e2dc451f75d0b4d31fa9af3b39a83c62626c13c8 (PR118). Rama: work/ncc-catalog-batch-one-20261113. No publicado.

25 identidades nuevas, 560 anteriores conservadas exactamente, total 585. Incluye verduras, frutas, legumbres, cereales, carnes, pescados, lácteos, panificados, platos preparados y bebidas. Las denominaciones separan preparación y estado. Los alimentos nuevos sin fotografía exacta conservan un marcador neutro por identidad; ninguna miniatura anterior cambia.

## Fuente y cantidades

USDA FoodData Central SR Legacy, archivo oficial 2018-04: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip . SHA256 0fe8ae486a2c8eb42cb96413f058deb51863a46c8fb8eeb4b1fb45006dd338ef. review.json detalla identidades, FDC ID, preparación, macros por100g, porción en gramos y hash del registro de origen. source-records.json conserva los 25 registros originales. El verificador comprueba sus valores contra el archivo oficial completo.

Todos los alimentos del lote se pesan en gramos; el jugo de tomate también. No se presupone densidad de1g/ml. Las porciones son masas orientativas divisibles, no tamaños inventados de piezas. No cambia la fórmula energética, los factores de actividad ni los cálculos existentes. La fuente nutricional no certifica compatibilidad clínica ni aprobación independiente.

## Compatibilidad del servidor: propuesta sin aplicar

forward.sql exige igualdad exacta del snapshot y cuerpo del validador previo, dentro de una transacción. Archiva el snapshot anterior; los borradores anteriores siguen validándose con su versión y las mismas cantidades. Los nuevos usan585 identidades. Se conserva el cuerpo de validación salvo la elección del snapshot por versión. No modifica tablas de usuarios, permisos de publicación ni políticas RLS. Funciones auxiliares privadas, sin permiso de ejecución para public/anon/authenticated. rollback.sql revierte funciones; exige volver el cliente junto al catálogo. Los borradores de versión nueva necesitarían revisión después de revertir.

baseline.sql es exclusivamente una base reproducible para PostgreSQL17 desechable, NO un procedimiento para reemplazar la base alojada.

El test PG17 pasó en CI run43402403187: compatibilidad exacta del borrador previo, todas las nuevas identidades, totales, rechazo de versiones/unidades/cantidades/composición alteradas, privilegios, guarda de reaplicación y reversión. No demuestra el estado de la base alojada.

## Evidencia y condiciones de publicación

CI run43402403187: cotejo de fuente oficial, pruebas de catálogo y18 escenarios reales de navegador (Chromium/WebKit,320/390/1280, alumno/coach/admin). Incluyen búsqueda de25 alimentos, registro ficticio de37.5g de espinaca cruda, recientes, habitual ficticio y disponibilidad de25 alimentos en planificador sin registrar consumos. Capturas comparadas con el catálogo de producción e2dc451 usando la misma PWA y datos ficticios aislados. La Dieta Guía se verifica en sus validadores y PostgreSQL17 desechable; no se afirma publicación ni recorrido alojado. Sin teléfonos físicos.

Antes de fusionar: aprobación visual de Edu, controles de HEAD/base/CI y acceso autorizado a la base real para leer snapshot/validador/privilegios, revisar diferencias y aplicar la propuesta compatible. La conexión actual identifica el proyecto correcto pero rechaza lecturas SQL/migraciones. No publicar solo el cliente ni atribuir al servidor un catálogo no verificado. Después: un único despliegue confirmado LIVE, commit correcto, hashes públicos y actualización del Plan Maestro.

Ver REMINDERS_EVALUATION.md: evaluación de recordatorios sin activar avisos ni agregar preferencias sin efecto.
