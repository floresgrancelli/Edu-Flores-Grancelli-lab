# COACH-91 · MÉTODO OBSOLETO: NO EJECUTAR CAPTURE / RESTORE

**Corrección de seguridad 30/10/2026:** el método anterior de exportación con pg_dump genérico de Supabase administrado puede incluir internals/roles que impiden una restauración portable. Las operaciones `capture` y `restore` de `scripts/coach91-local-db-backup-rehearsal.mjs` han sido **desactivadas de forma segura**. El resto de este documento es historial de lo preparado, **no instrucciones operativas vigentes**.

**Procedimiento vigente:** `docs/COACH94_SUPABASE_PLATFORM_RECOVERY_AND_STORAGE_RUNBOOK_20261030.md`, que emplea el método oficial de Supabase CLI (roles/schema/data), recuperación en instancia Supabase aislada y transferencia real de Storage por S3. Las pruebas sintéticas anteriores NO demostraron recuperación real. Sin nuevas autorizaciones ni costos.

Fuentes Supabase: https://supabase.com/docs/guides/self-hosting/restore-from-platform y https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3 .

---

# COACH-91 · Respaldo privado y ensayo de recuperación PG17 — SOLO PILOTO

**30/10/2026 · Nutrición Con-Ciencia / Nutrition Coach · PR #37 DRAFT · NO GO**

## Alcance y hechos

Se agregó `scripts/coach91-local-db-backup-rehearsal.mjs` a la rama candidata y se conectó su test **sintético** a Security CI. Es un procedimiento técnico preparado: **no significa que se haya descargado una base real, que existan bytes privados de Storage respaldados o que se haya ensayado un restore verdadero**. El piloto no comercial puede ensayar Términos y Privacidad con documentos de prueba y cuentas ficticias; no convierte borradores v0.9 en contratos aprobados ni habilita datos clínicos sensibles.

Supabase alojado `cyjvddhimbsfipjfctsl` PostgreSQL 17.11 sigue sin staging. El backup físico del panel del 30/10/2026 a las 06:59 ART consta en Plan Maestro, pero NO es una exportación lógica propia. Inventario de Storage previo: bucket privado `efg-receipts`, 3 objetos y 1.491.904 bytes de **metadatos de tamaño**, no archivos descargados. Al corte real debe volverse a consultar y congelar el inventario exacto.

## Requisitos de seguridad ANTES de ejecutar localmente

- Únicamente equipo propio bajo control del operador, directorio privado fuera de cualquier repositorio, `chmod 700` para el directorio, archivos del dump `0600` sin symlinks/hardlinks, disco cifrado, acceso limitado y retención acordada.
- Nunca subir `.dump`, `.backup`, identidades, recibos ni `.pgpass` al repo público, Drive compartido, CI, chat o logs. PostgreSQL puede contener Auth y datos personales; usar exclusivamente un medio privado autorizado.
- PostgreSQL 17 `pg_dump`, `pg_restore` y `psql` instalados en el equipo; credenciales gestionadas privadamente mediante archivo `.pgpass` con permisos `0600` o almacén de secretos, NO por URL ni por argumentos ni por un archivo de proyecto.
- Al restaurar, desconectar la red saliente del entorno local y desactivar cualquier cron, webhooks, mails o notificaciones externas. El script valida el destino por loopback, base exacta y vacío, **pero no controla la red por sí solo**.
- Si la conexión directa de Supabase necesita IPv6, túnel o pooler, detenerse y revisar el método. **No ampliar** el host autorizado por comodidad sin evaluar TLS, autenticación y permisos.

## Captura de archivo de PostgreSQL (sin ejecutarla en este PR)

Este ejemplo muestra *nombres* de variables, jamás valores de contraseñas:

```bash
mkdir -m 700 -p "$HOME/efg-coach-backup-private"
export PGHOST=db.cyjvddhimbsfipjfctsl.supabase.co
export PGPORT=5432 PGDATABASE=postgres PGUSER=postgres PGSSLMODE=require
export EFG_COACH91_MANUAL_ACK=PRIVATE_LOCAL_BACKUP_ONLY

node efg-nutrition/scripts/coach91-local-db-backup-rehearsal.mjs \
  capture "$HOME/efg-coach-backup-private/coach-before.dump"
```

El programa aborta en CI, evita host alternativo, requiere TLS, archivo nuevo, directorio privado y archivo privado. `pg_dump -Fc` es de lectura; luego se inspecciona con `pg_restore --list` sin imprimir el catálogo ni datos. Se exige cobertura de entrada TABLE DATA para Auth, `storage.objects` y 13 tablas EFG históricas seleccionadas, además de al menos una POLICY y TRIGGER. **Es una verificación estructural mínima, NO un inventario completo de todas las tablas ni un test de restauración.**

El dump no incluye los bytes de archivos privados de `storage`; respaldarlos por separado en lugar cifrado, usar `scripts/coach72-private-storage-restore-verify.mjs` y probar lectura con ACL real desde el destino.

## Restauración real en base local DESCARTABLE (NO producción)

**No ejecutar** hasta tener copia autorizada y PostgreSQL local privado. Cambiar las variables de acceso al PostgreSQL local; jamás dejar contraseña productiva exportada. Crear previamente una base **nueva y vacía** llamada exactamente `efg_coach91_disposable_restore` en PostgreSQL 17 local por un operador autorizado, con las identidades/extensions necesarios; el script falla si encuentra relaciones existentes en los esquemas controlados.

```bash
export PGHOST=127.0.0.1 PGPORT=5432
export PGDATABASE=efg_coach91_disposable_restore PGUSER=postgres
export EFG_COACH91_MANUAL_ACK=PRIVATE_LOCAL_BACKUP_ONLY
export EFG_COACH91_RESTORE_ACK=I_ACCEPT_DISPOSABLE_LOCAL_RESTORE
node efg-nutrition/scripts/coach91-local-db-backup-rehearsal.mjs \
  restore "$HOME/efg-coach-backup-private/coach-before.dump"
```

Ejecuta `pg_restore --single-transaction --exit-on-error` **sin saltarse owners, ACL, políticas o triggers**; por lo tanto una copia con roles/extensiones faltantes debería **fallar y detenerse**, nunca considerarse restore aprobado. Solo se comprueba después que la tabla Auth existe. Esa condición es necesaria, NO suficiente.

## Para otorgar PASS REAL al punto 2

1. Evidencia privada de dump, tamaño/huella SHA-256 y timestamp del mismo corte; evitar publicar hashes reales. Auth, esquemas, funciones, RLS, grants, triggers, objetivos, guías y diarios íntegros.
2. Restauración real en entorno segregado, sin escrituras externas ni dependencia del prod, y preflight `scripts/coach71-hosted-preflight.mjs` aprobado; toda diferencia en las 15 tablas/40 policies/8 triggers/39 índices/38 checks/27 FK debe resolverse o documentarse.
3. Una copia del destino debe pasar los ocho módulos del paquete Coach, rollback por error, paridad de registros antes/después, JWT firmados y aislamiento entre dos organizaciones, incluidas las 19 RPC privilegiadas existentes.
4. Restore real de bytes de comprobantes con SHA-256, bucket privado y ACL verificada; coherencia con `efg_payments` y usuarios.
5. Plan PWA antigua/rollback: frontend anterior, permisos de escritura, datos ingresados entre backup y fallo, Auth/configuración y archivos; RPO/RTO acordados. **Restaurar una base vieja en producción podría descartar datos posteriores y requiere GO expreso.**

## Resultado conocido

**COACH91: herramienta preparada y test sintético agregado; captura/restore REAL PENDIENTES.** Nada en este procedimiento autoriza proyectos pagos, despliegue, escritura de Supabase alojada o publicación. El objetivo es reproducibilidad y recuperación antes del GO de Nutrition Coach.
