# Catálogo y restricciones opcionales — candidata del 05/11/2026

La versión `ncc-catalog-25b60eacf6e38ba7` contiene los 560 alimentos efectivamente presentes en la app. El servidor valida identificadores, unidades, composición y versión, y recalcula totales y diferencias a partir de sus valores. No se requieren aprobaciones independientes inventadas para alimentos estimados: se conserva esa clasificación y la revisión del coach.

Compartir restricciones es opcional. La ausencia de declaración compartida se registra como `unknown`; nunca como ausencia de restricciones. Una declaración compartida vigente sigue ligada a alumno, organización y revisión. Se mantienen permisos, ficha general, participación, seguimiento, documentos legales, comparación de revisiones y recibo atómico idempotente. Los borradores antiguos conservan su validación de referencias previa.

## Verificación ejecutada

- Migración de helpers: 560 composiciones y totales comprobados; 560 alteraciones de nutrientes rechazadas; versión obsoleta e ID inexistente rechazados; privilegios privados/anon comprobados.
- RPC bajo rol `authenticated`: pollo, cerdo e identificador Unicode resueltos. Alumno ajeno y fuente de restricciones fabricada rechazados.
- Publicación alojada dentro de subtransacción: guardado CAS, rechazo de revisión anterior, publicación con restricciones privadas como `unknown`, recibo y reintento idempotente. Se deshicieron todos los datos de prueba y se verificaron borrador, metas y plan originales intactos. No fue una prueba HTTP con JWT firmado.
- 59 pruebas lógicas locales aprobadas, más matriz de 12 escenarios de navegación. Pruebas de navegador de la candidata final pendientes al preparar este documento.

## Android y menú

El delta móvil `overflow-x:hidden` → `clip` acompaña la exclusión previa de pull-to-refresh. El diálogo se cierra explícitamente y restaura el foco sin desplazar el documento. La prueba CDP mide movimiento del editor, diálogo y editor tras volver; espera posiciones reales para no medir durante el desplazamiento suave heredado.

Menú del alumno: etiquetas cortas, iconos propios, estado activo, opciones secundarias en Más. Mantiene destinos y separación de roles; historial privado disponible, diario bloqueado hasta plan publicado. QA a 360/390 px y navegación pendiente en el CI final. No se certificó Android físico.

`forward.sql` conserva el cambio aplicado; `rollback.sql` restaura la política anterior y el publicador anterior. El rollback vuelve a exigir restricciones compartidas y debe coordinarse con el frontend. No hay servicios nuevos ni costos adicionales.
