# Reconciliación tras recarga: candidata OFF

Base: `15be7ff3ca3a01590b122f22b7a49e14efe3cd83`, PR64. Esta extensión usa únicamente fixtures. La nueva bandera `PROFESSIONAL_RECONCILIATION_ENABLED` permanece **false**, junto con las cuatro banderas anteriores. No hay SQL, grants, credenciales, datos reales, merge ni habilitación de producción.

## Qué garantiza esta candidata

Antes de invocar una mutación profesional, el cliente reserva una lane en un journal mediante una transacción IndexedDB exclusiva. Espera `transaction.complete`, solicitando durabilidad estricta; el éxito de un `put` no basta. Dos pestañas cooperantes no pueden reservar simultáneamente la misma lane.

La lane contiene namespace del backend, UID, organización, acción y alumno cuando corresponde. No contiene sesión ni épocas, por lo que logout/relogin no esquiva el bloqueo. El registro guarda versión, UUID de operación, fecha informativa, digest y, para lecturas, IDs exactos. No guarda cuerpo del mensaje, alias, perfil, email, token ni sesión. El journal es estado local no confiable, nunca autorización.

Cada reserva recuperada significa **“pudo haberse enviado”**, incluso si la página se cerró antes del dispatch. No hay TTL, reenvío automático, limpieza al salir ni botón para borrar una incertidumbre. Cancelar sólo elimina borradores. Corrupción, versión desconocida, cuota o almacenamiento inaccesible bloquean escrituras; las consultas autorizadas pueden continuar.

Una denegación comprobada antes del dispatch permite retirar su reserva exacta. Después del dispatch, timeout, recibo inválido, cambio de contexto o pérdida de autorización conservan incertidumbre. Un resultado terminal recibido sólo libera tras guardar su resolución. Una respuesta vieja nunca elimina una reserva nueva en la misma lane.

## Mensajes: readback inequívoco

Con reconciliación habilitada sólo en la fixture, `efg_messages` recibe un UUID de cliente igual al UUID previamente reservado. La comprobación estática del contrato vigente admite ese ID: columna UUID con default, PK, permisos INSERT/SELECT y políticas existentes; la prueba conjunta con SDK/API reales sigue pendiente.

“Verificar envío pendiente” únicamente consulta por **ID + alumno + coach**. No busca por texto/fecha ni en los últimos 200 mensajes. Repite autenticación, contexto profesional, roster y consentimiento antes y después, y comprueba remitente y digest del cuerpo.

- Una coincidencia íntegra confirma ese mensaje sin reenviarlo. Se retira sólo su reserva, se muestra una única fila y se limpia el borrador únicamente si coincide con el cuerpo recuperado.
- Cero filas no prueba rollback ni ausencia: puede haber petición en vuelo, revocación o falta de visibilidad. El bloqueo permanece.
- Si otra pestaña resolvió la reserva, la guardia RAM original conserva sus metadatos mínimos y puede repetir la verificación contra el servidor. La ausencia del journal por sí sola nunca limpia incertidumbre.
- Si apareció una operación nueva en la misma lane, la verificación anterior no la elimina ni la confirma.

## Alias y lecturas

El RPC del alias sigue retornando boolean, sin ID de operación, versión/CAS ni `p_org`. Ver un alias igual no demuestra que nuestra petición terminó. Una escritura incierta de alias conserva su bloqueo, mostrando el valor actual separadamente.

Ver `read_at` tampoco prueba autoría ni que la petición vieja terminó. Sin un contrato monotónico y recibo inequívoco, las lecturas inciertas siguen bloqueadas. Una respuesta válida de cero filas informa **“No se recibieron confirmaciones de lectura”**, no éxito genérico.

## Límites explícitos

- No es una garantía de “exactly once”. Borrado/evicción total del almacenamiento, restauración de backups, otro navegador o dispositivo requieren idempotencia/registro de servidor. Un estado totalmente borrado puede ser indistinguible del primer uso.
- El driver de memoria sólo simula persistencia entre instancias de prueba. El driver IndexedDB persiste en el navegador de ensayo; no se activa con las banderas OFF.
- El backend del navegador de prueba persiste filas y contadores **ficticios** en una clave separada de almacenamiento local, sólo bajo opt-in del servidor de ensayo. No restaura sesión ni autorización real. Esa simulación no acredita JWT, RLS, PostgREST ni SDK real.
- La fuente oficial exacta de Supabase JS 2.118.0 se revisó separadamente: sus retries automáticos no incluyen POST/PATCH/DELETE. No se cambió el cliente legacy a partir de documentación genérica de otra versión.
- Las limitaciones visuales y de historia descritas en [pantallas profesionales](professional-screens-candidate.md) siguen aplicando; esta candidata no autoriza producción.

## Archivos y validación

- `pilot/professional-mutation-journal.mjs`: reserva atómica, validación estricta y drivers.
- `professional-screens-candidate/panel/transport.mjs`: recuperación, bloqueo visible y lectura puntual.
- Frame, panel dual y `pilot.js`: un journal por host, namespaces separados y gate OFF.
- Tests Node: reservas concurrentes, fallos/corrupción, recarga de guardia, readback ajeno/tardío/ausente, otra pestaña, borradores y cero recibos.
- `tests/professional-reconciliation-fullapp-browser.mjs`: app completa con SDK ficticio, recarga real, segunda pestaña, cancel/logout y resultados persistido/ausente/revocado, a 390 y 1280 px en Chromium/WebKit.

La prueba de navegador con dos pestañas verifica que la segunda observa una reserva existente; no certifica una carrera simultánea de dos despachos. La exclusión se prueba además en el modelo transaccional Node.

La ejecución del navegador y su resultado deben consultarse en el workflow existente **NCC dual workspace and professional screens QA**, para el commit exacto. La presencia del runner no implica un pase. Se conservan los mismos jobs y permisos de lectura; no se publica material del ensayo privado de backend.

```sh
node --test efg-nutrition/tests/dual-workspace-*.test.mjs efg-nutrition/tests/professional-*.test.mjs
NCC_R4_SYNTHETIC_FULL_APP=1 NCC_BROWSER=chromium node efg-nutrition/tests/professional-reconciliation-fullapp-browser.mjs
```

Los contratos de doble espacio usan las referencias públicas de base preparadas por CI. El nuevo generador exige el manifiesto exacto anterior, preserva release/CSS/flags y fija una única identidad de módulo para journal, guardias y fixtures.
