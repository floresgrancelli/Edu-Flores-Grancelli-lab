# P28E · Backend privado y publicación vinculada

4/11/2026, Argentina. Trabajo sobre PR53. Preparación y pruebas aisladas; no instalación alojada.

## Paquete de ensayo

1. `docs/CLIN_GUT_03_PRIVATE_HEALTH_INTAKE_STAGING_ONLY.sql`: las cinco RPC existentes y tres tablas privadas, consentimiento separado, lectura con identidad/organización, revisión optimista, declaración explícita de ninguna y revocación. Sin documentos ni personas sembrados. Se admite el nombre adicional de la base descartable `efg_coach119_atomic`, manteniendo el marcador aislado obligatorio.
2. `docs/P28_HEALTH_BOUND_PUBLICATION_STAGING_ONLY.sql`: protección aditiva, sin reemplazar la publicación atómica. Nuevo switch `pilot_health_bound_publication=false`; no se activa fuera del ensayo. Antes de que el borrador pase a publicado se verifica identidad del coach, relación, consentimiento, declaración compartida, documento vigente y revisión/status exactos de la declaración usada para generar la guía. Falta de datos no equivale a ninguna.

El trigger participa de la misma transacción de publicación: un rechazo revierte objetivo, guía, acceso, historial, recibo y aviso. Usa el mismo advisory lock que guardar/revocar salud para serializar cambios simultáneos. El historial publicado no se reescribe. La repetición del request_id ya confirmado sigue devolviendo su recibo original, sin nueva escritura.

La guía captura `restrictionSource` al generarse. El recálculo, las sustituciones y el guardado conservan esa revisión; no la actualizan silenciosamente cuando cambia la ficha. El servidor exige una declaración actual compartida para nuevas publicaciones con este switch activo. Una ficha privada puede guardarse, pero no autoriza al coach a publicar un plan adaptado a datos que no puede leer.

## Evidencia requerida del nuevo HEAD

`ncc-six-meal-guide-contract.mjs`: captura independiente del objeto original, conservación al quitar horarios/sustituir alimentos/serializar y rechazo de revisión inválida.

`coach119-full-atomic-pg17.mjs`: instala ambos SQL exactos en PostgreSQL descartable; prueba fuente ausente, revisión vieja, otro alumno/organización, status falso, permiso retirado, documento retirado, eliminación completa, publicación vigente/idempotente y conservación de versiones. Cada rechazo debe provenir de P28 y dejar idénticos objetivo/guía/acceso/historial/recibos/avisos. Prueba además dos conexiones simultáneas para editar salud y publicar.

El resultado debe leerse en CI del commit que contiene estos cambios, no heredarse. Los fixtures usan declaraciones/documentos/revisores ficticios solamente dentro de una base descartable. No representan aprobación nutricional humana.

## Límite de esta entrega

No se instalaron estas funciones en Supabase alojado, no se activaron flags y no se publicó Render. Los SQL conservan su protección STAGING ONLY. Antes de una instalación alojada se necesita un paquete de promoción revisado contra el esquema actual, documento sanitario real aceptado por el propietario y prueba alojada con actores/escrituras autorizados. Este ensayo no certifica esa instalación ni el recorrido completo de producción.
