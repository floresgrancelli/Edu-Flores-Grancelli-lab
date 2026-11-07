# Recuperación con SDK y navegador reales, API HTTP ficticia

Esta candidata agrega un ensayo autónomo en el runner estándar de CI del repositorio público. No necesita la computadora personal, ningún proyecto Supabase, secretos, servicios pagos ni material de base de datos privado.

## Alcance y separación

El ensayo usa los tres módulos profesionales de la candidata, sin modificar sus bytes ni sus flags `false`. Su página mínima de pruebas habilita únicamente la ejecución sintética mediante las opciones ya previstas. No cambia `pilot.js`, el perfil original, el vínculo personal de alumna, los assets de publicación ni la versión desplegada.

- Reales: paquete npm `@supabase/supabase-js` 2.118.0, Chromium, IndexedDB, recarga de página y solicitudes HTTP de navegador entre dos orígenes loopback propios.
- Construido para este ensayo: bundle navegador local de ese paquete mediante esbuild 0.25.5. No se presenta como distribución publicada ni como paridad con esm.sh.
- Ficticios: autenticación, sesiones, permisos, contextos, filas de mensajes y contadores del servidor HTTP. El servidor es una fixture en memoria y no implementa ni certifica GoTrue, PostgREST, PostgreSQL o RLS.
- No probados aquí: backend privado, datos reales, servicio alojado, OTP, dispositivo físico y aplicación completa. El harness es una página mínima, no la app publicada.

Un resultado favorable acredita únicamente esta combinación. No habilita el doble rol ni convierte el contexto seleccionado, un JWT ficticio o los metadatos locales en autorización real.

## Ejecución y recursos

El job `real-sdk-browser-http-fixture` del workflow `ncc-dual-workspace-fullapp-qa.yml` se limita al repositorio público esperado y a su rama candidata. Conserva `contents: read`, checkout del commit exacto y credenciales no persistidas. Usa Ubuntu estándar con dependencias oficiales de versiones superiores fijadas. El grafo transitivo se resuelve en un lock dentro del runner y se instala mediante `npm ci`; la evidencia identifica los bytes y versiones efectivamente usados, no un grafo preauditado fuera de la corrida.

No se suben artifacts ni se crean caches para este job. Sólo se publican resultados sanitizados en logs y resumen del job. Las credenciales ficticias, tokens, cuerpos de mensajes, almacenamiento del navegador y encabezados quedan fuera de esa evidencia. Los recursos HTTP y de navegador pertenecen a la prueba y se cierran al terminar.

La prueba no desactiva el sandbox del navegador ni modifica ajustes de seguridad del runner. Si el recurso disponible no permite ejecutarla dentro de esas condiciones, debe fallar y reportarlo, sin un modo alternativo que eluda la restricción.

## Casos del navegador

Cada caso crea una fixture en memoria y un contexto de navegador nuevos. Dentro del caso conserva el mismo origen, nombre de IndexedDB y namespace del backend durante la recarga. El servidor HTTP observa sus propios contadores, por separado de los callbacks del SDK.

1. Mensaje persistido: descartar la respuesta después de consumirla por completo, conservar la reserva y confirmar el UUID exacto tras un login explícito y recarga, sin otro INSERT.
2. Recibo ausente: eliminar explícitamente la fila del fixture mediante un control sólo de Node después de la escritura; mantener la reserva y no interpretar el resultado vacío como prueba de que nunca se escribió.
3. Acceso profesional revocado: revocación ficticia después de la escritura; no reabrir herramientas ni reenviar después de recargar.
4. Alias: observar el valor actual no resuelve la incertidumbre de una escritura anterior; la reserva se conserva.
5. Lecturas: los valores actuales de `read_at` no son recibos por operación y no permiten borrar la reserva.

También se comprueban Cancelar, logout, una segunda pestaña observadora, almacenamiento sin sesiones ni cuerpos, respuesta completamente drenada y preflights CORS aceptados. La segunda pestaña no acredita una carrera simultánea. Las notificaciones contadas son filas ficticias, no efectos de un trigger SQL.

## Validación

El resultado se determina por la corrida del commit exacto, no por la existencia de este documento. Los contratos offline sirven para revisar el aislamiento y los controles del harness; no sustituyen la ejecución del SDK, de IndexedDB, del navegador o de la red.

La recuperación exige una lectura exacta del identificador y de su pareja alumno/profesional, remitente y digest. Un resultado vacío, un acceso revocado o la coincidencia del valor actual de alias no son recibos de una mutación anterior. No se infiere éxito por texto o fecha y no se reenvía automáticamente una escritura incierta.

La evidencia anterior de pruebas con SDK ficticio, o de backend privado con journal en memoria, conserva su identidad separada. Ninguna de ellas se reclasifica por agregar este ensayo.

**Estado de publicación: candidata de pruebas, OFF, sin merge ni despliegue.**
