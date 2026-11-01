# COACH-72 · Gran Actualización Nutrition Coach — restore fiel + Storage privado + QA real
**30/10/2026 · Candidata PR #37 · NO PUBLICAR · Autogestión y clínica OFF**

## Evidencia real a esta fecha
- Estado de Supabase consultado: `cyjvddhimbsfipjfctsl` ACTIVE_HEALTHY, PostgreSQL 17; **sin branch de staging**. Solo consultas de lectura, ninguna escritura.
- Inventario read-only de `storage.objects`: bucket `efg-receipts` privado; **3 objetos** y suma de `metadata.size` **1.491.904 bytes** al consultar el 30/10/2026. Es información de catálogo, **no recuperación de bytes**, ni garantía de que la lista siga igual en la fecha de corte.
- El snapshot COACH71 compara **15 tablas relevantes** de las 20 tablas `public.efg_*` presentes. SEC12/SEC13 cubren las **19 RPC con permiso EXECUTE para `authenticated`**. Una auditoría de catálogos/ACL alojados confirmó **30 funciones públicas `efg_*` SECURITY DEFINER**: 19 ejecutables por `authenticated`, **11 sin EXECUTE para `authenticated` ni `anon`**, y **0 con EXECUTE para `anon` o `PUBLIC`**. Estas 11 corresponden a funciones internas de notificaciones y correo/cron. Su ACL reduce exposición REST pero no prueba que todas las cadenas de invocación internas sean seguras; deben revisarse por separado. Esta verificación **no es la matriz dinámica de JWT A/B**.
- El backend local con JWT firmados y ficticios **sí pasó** 30/10; no implica que el clon alojado esté validado.

## 1. Restauración fiel en entorno **aislado y autorizado**
1. Acordar identidad de prestador/operador, retención y quién accede a datos reales. No subir dumps, recibos, credenciales, emails ni hashes sensibles a GitHub, CI, Drive compartido o chats.
2. Identificar backup disponible REAL y fecha de corte. Supabase Pro normalmente ofrece backups diarios de DB; verificar en dashboard disponibilidad exacta. Nunca usar `restore_project` sobre producción como simulacro. `Restore to a New Project` genera **un nuevo proyecto facturable**, conserva Auth/BD, pero **no los bytes de Storage** ni toda la configuración. Crear proyecto solo tras presupuesto y autorización de ese costo; no activar jobs/cron/webhooks de la copia que puedan producir efectos externos.
3. Validar por separado copia completa de Auth, esquema, funciones, RLS, policies, índices, triggers, permisos y filas del mismo corte; preservar historia `efg_daily_logs`, `efg_weights`, habituales, pagos, objetivos y planes. Ejecutar `scripts/coach71-hosted-preflight.mjs` sobre copia PostgreSQL 17 con ruta permitida (ver su documentación). Fallar ante drift, **no reparar producción**.
4. Incluir pruebas de 19 RPC SEC13 con JWT realmente firmados (admin activo/inactivo, coach A/B, alumno A/B y anónimo), estado antes/después, autorizaciones, 2 organizaciones, revocación, pagos/recibos. Investigar además las demás funciones SECURITY DEFINER públicas; ningún PASS de metadata representa PASS de permisos.
5. Aplicar migraciones de relanzamiento **solo sobre la copia aislada y recuperable**, comparar metadatos/historias y simular rollback en la copia. No activar flags Coach ni importar cambios a Supabase alojado antes del GO explícito.

## 2. Bytes de comprobantes privados (independiente de la DB)
**PRECONDICIÓN:** una exportación de objetos autorizada y cifrada, y una segunda descarga DESDE el destino restaurado, ambas realizadas en un entorno privado y con inventario de corte. El bucket destino debe comprobarse **privado mediante la API y sus políticas**, no solo una casilla escrita por quien prepara el manifest. Restaurar metadata **sin el archivo físico NO es un backup completo**.

- Normalizar cada archivo a un identificador opaco en **dos directorios privados**, uno origen y otro restaurado, evitando guardar nombres de clientes en manifest; usar nombres como `object_001.bin`.
- Construir un manifest *fuera de GitHub* con `evidence_kind: "EFG_PRIVATE_STORAGE_RESTORE_V1"`, `source_project: "cyjvddhimbsfipjfctsl"`, `restored_project` diferente, `bucket: "efg-receipts"`, `source_private: true`, `restored_private: true`, `expected_objects`, `expected_bytes` y `objects` (cada elemento: `file`, `bytes`, `sha256`). Los hashes y medidas deben derivarse de la copia ORIGINAL, no copiarse de la restaurada.
- Ejecución **solo en equipo local privado, NO GitHub Actions**:
  ```bash
  EFG_RESTORE_MANUAL_ACK=I_ACCEPT_LOCAL_PRIVATE_RESTORE \
    node efg-nutrition/scripts/coach72-private-storage-restore-verify.mjs \
    /ruta-privada/manifest.json /ruta-privada/origen /ruta-privada/restaurado
  ```
- El script hace SHA-256 sobre **ambos conjuntos de bytes**, verifica inventario exacto, suma, tamaño, directorios independientes, ausencia de archivos extra o perdidos, rutas, symlinks y hardlinks. Solo informa cantidad/bytes; **NO imprime contenidos ni nombres**. Por sí solo NO verifica RLS, ACL, que el origen sea auténtico, backups PostgreSQL, cifrado, ni que la restauración se haya hecho en un servicio alojado. El test CI es estrictamente **sintético**.
- Los 3 objetos/1.491.904 bytes son solo la foto de inventario de este día. Antes del backup real, registrar nuevos totales del **mismo corte** para evitar pérdida de comprobantes recientes.

## 3. Pruebas físicas y experiencia piloto (bloqueantes)
Realizar en **iPhone Safari + PWA instalada**, **Android Chrome + PWA instalada** y PC con usuarios de prueba y sin datos sensibles. Guardar capturas sin identidades, fechas, comprobantes reales ni credenciales.
1. Login OTP, sesión recordada, día cerrado a las 23:59 Argentina, pantalla de actualización y logo serotonina cargando, sin cierres espontáneos.
2. Alumno existente y nuevo: Términos/Privacidad vigentes aceptados separadamente, ficha **nueva** desde cero sin eliminar diario ni objetivos históricos, consentimiento de compartir separado y revocable.
3. Coach recibe **solo** la ficha autorizada, precarga edad/altura/peso/objetivo/actividad, confirma parámetro de ecuación que no se infiere, genera meta y guía de 5 ingestas editable; aprobación conjunta y una sola notificación.
4. 5 comidas: selector de proteínas, hidratos, plato preparado y omitir donde corresponda; media mañana/media tarde conservan flujo simple; buscador/autocompletado con teclado Android Gboard, comidas habituales múltiples, crudo/cocido, cantidades y totales macros coincidentes.
5. Mensajería estilo chat por alumno, notificaciones flotantes, informes semanales humanos y apartado **Espacio para disfrutar** celeste, respuesta al coach.
6. Alias de pagos, subida/visualización y aprobación/rechazo de comprobantes **ficticios**; privado ante otras organizaciones, revocación y acceso restringido; descarga de PDF del informe con tildes y formato correcto.
7. Alumno edita ficha desde otro teléfono mientras coach prepara un borrador: no debe publicarse ni reactivarse una propuesta vieja; reabrir revisión con permisos vigentes.
8. Verificar accesibilidad mínima: teclas táctiles, contraste, scroll, zoom, teclado, contenido sin superposiciones ni botones cortados; capturas landscape/portrait cuando aplique.
9. Control de privacidad: coach B y alumno B no deben ver datos del alumno A, y una cuenta inactiva no puede aprobar operaciones.
10. Rollback: volver a versión anterior SIN alterar historial, fichas y bytes de comprobantes en copia de prueba.

## 4. Decisión
- **GO técnico no disponible** hasta: copia fiel real (BD+Auth+Storage bytes), prueba 19 RPC + funciones fuera de inventario en esa copia, revisión mínima legal piloto, integraciones activadas en staging, UAT física con resultados, rollback verificado y CI 5/5 en SHA definitivo.
- Términos/Privacidad son borradores no definitivos para la futura comercialización, pero para piloto con personas reales debe existir texto de aceptación concreto y derechos de privacidad aplicables.
- Carla piloto como coach con 10 alumnos se **promueve después** del GO principal mediante autorización específica, conservando su MI DÍA; Autogestión y semáforo médico permanecen OFF.
- **No se han descargado los archivos privados, restaurado la DB real, creado un proyecto pago ni publicado la app** por crear esta documentación o pasar un test sintético.

## Fuentes oficiales
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
