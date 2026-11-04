# COACH94 · Recuperación real Supabase Pro — método corregido (piloto Nutrition Coach)

**30/10/2026 · PR #37 DRAFT · SOLO preparación, NO RESTORE REAL ni GO productivo.**

## Motivo de la corrección
La documentación oficial Supabase confirma que **pg_dump genérico sobre su plataforma puede incluir esquemas internos y producir errores de permisos al restaurar**. El antiguo COACH91 `capture/restore` está RETIRADO y bloqueado en código. Sus pruebas fueron sintéticas, no un backup real. Para preparar un entorno fiel, seguir los pasos oficiales de exportación **roles + esquema + datos** con `supabase db dump`, y restaurar en **una instancia completa de Supabase autoalojada PG17 aislada**, no una base PG17 vacía sin componentes Auth/Storage. La estructura de Auth sola no acredita correo OTP ni JWT, y las opciones de hosting self-hosted requieren configuración independiente.

Referencias primarias verificadas:
- https://supabase.com/docs/guides/self-hosting/restore-from-platform
- https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3
- https://supabase.com/docs/guides/platform/backups

## 0. Precondiciones

- Equipo/VM privado con **almacenamiento cifrado, red saliente bloqueada para el destino restaurado**, usuario administrador autorizado, Docker, Supabase CLI y PostgreSQL client compatibles con PG17. Sin crear proyectos/branches Supabase facturables ni desplegar Render.
- Copia real y credenciales de la instancia original **nunca** se agregan a PR, CI, Drive compartido ni chat. Los datos reales de Auth, pagos, diarios y comprobantes son privados.
- El entorno restaurado necesita extensiones y roles apropiados, servicio Auth/Storage en la misma versión compatible con la plataforma, SMTP y callbacks externos deshabilitados, claves JWT nuevas para el clon. No reutilizar tokens/secretos ni sesiones de producción.
- La API de la instancia de pruebas **no debe estar expuesta a Internet**. No dirigir un iPhone personal hacia un entorno con datos reales sin medidas de privacidad. Usar cuentas y datos **ficticios** para ensayos funcionales y UAT.
- Antes de exportar, registrar timestamp y huellas de continuidad, número de usuarios, diarios, metas, dietas, pagos y objetos en el bucket privado. Un respaldo de las 06:59 ART no equivale a exportación coherente del instante actual.

## 1. Exportación administrada por Supabase CLI en el entorno del operador

Usar la guía oficial Supabase para **tres comandos distintos**: `supabase db dump` con `--role-only` al archivo `roles.sql`, un dump de `schema.sql`, y `--data-only --use-copy` en `data.sql`. La guía oficial muestra `--db-url` con la connection string; contenerla estrictamente en un entorno privado y evitar que se exponga en historial de shell/listas de procesos. **No escribir la URL ni contraseña en GitHub, CI, chat o documentación.** Comprobar flags con `supabase db dump --help` en la versión instalada.

Guardar exclusivamente en directorio privado, por ejemplo `$HOME/efg-coach94-private` con permisos `0700`. Los archivos `roles.sql`, `schema.sql` y `data.sql` deben ser `0600`, ni symlinks ni hardlinks.

**Importante:** antes de dar la exportación por completa, el verificador COACH94 exige evidencia de `COPY auth.users`, `COPY storage.objects` y 5 tablas históricas EFG, además de RLS y funciones. Si el CLI o sus filtros no incluyen Auth o Storage, **DETENERSE**; no omitir la validación, ni inferir que existe un restore completo. Ajustar la estrategia de exportación en un entorno privado tras revisar la documentación y probar equivalencia, sin modificar el SQL productivo.

## 2. Sellar y validar copia

Con la rama candidata disponible localmente y fuera de CI:
```bash
export EFG_COACH94_MANUAL_ACK=LOCAL_PRIVATE_RESTORE_REHEARSAL
node efg-nutrition/scripts/coach94-platform-triplet-recovery.mjs seal "$HOME/efg-coach94-private"
node efg-nutrition/scripts/coach94-platform-triplet-recovery.mjs verify "$HOME/efg-coach94-private"
```

Genera `coach94-private-manifest.json` (0600): identifica tres archivos, tamaños y huellas SHA256 del contenido real, **sin imprimirlos**. Verifica permisos, no uso de CI, integridad y presencia estructural mínima de Auth/Storage/EFG. Las huellas y el manifiesto se quedan en la carpeta privada. El sellado **NO** equivale a restauración.

## 3. Restaurar en self-hosted aislado (NO proyecto alojado)

La instancia self-hosted local PG17 debe estar inicializada, con `auth.users` y `storage.objects` **vacíos**, y sin tablas EFG. La herramienta exige exactamente `PGHOST=127.0.0.1`, `PGPORT=5432`, `PGUSER=postgres`, `PGDATABASE=efg_coach94_disposable_restore`, y marca manual de restauración. Los valores son del **destino aislado**, nunca los de producción.

```bash
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres
export PGDATABASE=efg_coach94_disposable_restore
export EFG_COACH94_MANUAL_ACK=LOCAL_PRIVATE_RESTORE_REHEARSAL
export EFG_COACH94_RESTORE_ACK=I_ACCEPT_ISOLATED_PG17_WRITES
node efg-nutrition/scripts/coach94-platform-triplet-recovery.mjs restore "$HOME/efg-coach94-private"
```

Aplica **una sola transacción** con `psql --single-transaction -v ON_ERROR_STOP=1`: roles → esquema → `SET session_replication_role = replica` → datos COPY. **No** suprime errores de roles, extensiones, políticas, triggers o permisos. Un fallo es NO GO y requiere diagnosticar la copia **sin tocar producción**. Esta herramienta por sí sola no bloquea la salida de red ni prueba autenticación; asegurar aislamiento del host y revisar paridad después. No reutilizar la base ensayada para pruebas con datos sintéticos sin una limpieza aislada autorizada.

## 4. Storage privado separado: S3, NO copiar a carpetas internas

La guía oficial dice que descargar archivos y colocarlos en `volumes/storage` **no funciona**; hay que copiar con S3 compatible, por ejemplo `rclone`, desde Supabase Platform hacia la instancia privada. Las claves S3 se gestionan **solo** en la máquina privada; no crear credenciales ni cambiarlas aquí. Verificar que `efg-receipts` continúa siendo bucket PRIVADO.

- Crear/verificar bucket destino privado con el mismo ID; no habilitar acceso público.
- Usar transferencia de objetos mediante el protocolo S3 con las dos credenciales de mínimo privilegio, sin salida pública del destino.
- Comparar conteos y tamaños usando `rclone size` y SHA256 de bytes reales de origen/restaurado con `scripts/coach72-private-storage-restore-verify.mjs`. Comprobar ACL, lectura autorizada y denegación desde otra organización a través de Auth real en el clon.
- Inventario conocido anterior: 3 objetos/1.491.904 bytes de **metadata**; verificar nuevamente al mismo corte. El catálogo `storage.objects` NO sustituye los bytes de archivos físicos.

## 5. Hitos obligatorios previos al GO

1. Exactitud del backup Auth/DB y comprobantes privados (archivo real, manifest, bytes, tiempo de corte) y restauración completa segregada.
2. Comparar 15 tablas/40 RLS policies/8 triggers/39 índices/38 checks/27 FK del snapshot COACH71, además de grants y 19 RPC; ejecutar JWT firmados con dos organizaciones y permisos revocados.
3. Aplicar los ocho módulos SQL del Coach **solo sobre la copia preparada/descartable**; confirmar metas + dieta guía atómicas, rechazo legal cuando no aceptan, ausencia de falsos consentimientos, historial preservado, rollback probado y cliente previo protegido.
4. Ensayar presentación bienvenida única, términos y privacidad **SIMULADOS** solo con identidades ficticias y UAT 12 escenarios en iPhone, Android y PC (COACH92). No habilitar autogestión ni restricciones clínicas no verificadas.
5. Verificar cinco workflows CI en último commit; pedir GO explícito antes de cualquier SQL o flags productivos, fusión del PR #37 o despliegue Render.

**ESTADO 30/10/2026: método corregido + tests sintéticos preparados, ningún backup de Auth, DB o Storage reales descargado ni restaurado mediante estas acciones; no se incurrió en nuevos costos.**
