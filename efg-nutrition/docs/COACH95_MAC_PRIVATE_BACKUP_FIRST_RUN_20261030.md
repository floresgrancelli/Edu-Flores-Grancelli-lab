# COACH95 · Primera ejecución privada en Mac — piloto Nutrición Con-Ciencia

**30/10/2026 · PR #37 DRAFT · NO tocar producción · SIN DATOS EN CHAT/GITHUB**

Objetivo: disponer en una Mac privada de una exportación verificable de Supabase Pro (Auth/DB) para restaurar DESPUÉS en una instancia segregada, más preservar los bytes de tres recibos privados. **No ejecutar migraciones, no activar flags ni fusionar el PR.** El script previo es solo diagnóstico, no descarga ningún dato.

## 1. Preparación del equipo privado

En Terminal de macOS, comprobar que están instalados Node 20+, PostgreSQL 17 client, Supabase CLI 2.x y Docker Desktop **en ejecución**. Referencias oficiales:
- https://supabase.com/docs/guides/local-development/cli/getting-started
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/guides/self-hosting/restore-from-platform

**No compartir contraseñas, links de conexión con password, archivos SQL, manifiestos SHA256 ni recibos.** Comprobar que FileVault/disco esté cifrado; nuestro script NO puede comprobarlo. Preferir cuenta personal del operador, no computadoras compartidas. Nunca copiar estos archivos a Drive, GitHub o la conversación.

Si falta el código local, obtener la rama CANDIDATA en una carpeta separada:
```bash
git clone --single-branch --branch efg-major-integration-20261029 \
  https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab.git \
  "$HOME/EFG-Nutrition-Revision"
```

En una terminal **sin variables de credenciales cargadas**, ejecutar:
```bash
export EFG_COACH95_MANUAL_ACK=I_AM_ON_MY_PRIVATE_COMPUTER
node "$HOME/EFG-Nutrition-Revision/efg-nutrition/scripts/coach95-private-operator-preflight.mjs" \
  --init "$HOME/efg-coach94-private"
```

Este paso crea, si hace falta, una carpeta `0700` fuera del repo; exige Node 20+, `psql` 17, Supabase CLI 2.x, Docker corriendo y espacio libre mínimo. **No comprueba cifrado físico ni realiza dump**. Si falla, resolver localmente y volver a ejecutar `--check`. No ejecutar nunca en GitHub Actions.

Si se instaló PostgreSQL 17 con Homebrew y no se encuentra `psql`, agregar el directorio de PostgreSQL 17 al PATH siguiendo las indicaciones de Homebrew. No degradar el requisito a PostgreSQL 15.

## 2. Vincular CLI en una carpeta PRIVADA, no en el repo

```bash
cd "$HOME/efg-coach94-private"
umask 077
supabase init --yes
supabase login
supabase link --project-ref cyjvddhimbsfipjfctsl
```

El login y la contraseña de base se ingresan **solo en el equipo privado** cuando Supabase CLI lo solicite. El enlace es local al directorio de trabajo; **no correr** `supabase db pull`, `supabase db push`, `supabase db reset`, `supabase migration up`, `restore_project` ni scripts de relanzamiento contra la base alojada. Antes de continuar revisar `supabase db dump --help`; los comandos siguientes son de EXPORTACIÓN (lectura) sobre el proyecto vinculado.

## 3. Exportación desde CLI enlazado

Siempre dentro de la carpeta privada (no del repositorio):
```bash
supabase db dump --linked --role-only --file roles.sql
supabase db dump --linked --file schema.sql
supabase db dump --linked --data-only --use-copy --file data.sql
chmod 600 roles.sql schema.sql data.sql
```

**Precaución importante:** la referencia del CLI aclara que habitualmente excluye esquemas administrados como `auth` y `storage`. La guía oficial de restauración menciona los usuarios Auth en la copia. **No dar por resuelta esta discrepancia sin inspección.** El verificador COACH94 exige explícitamente `COPY auth.users`, `COPY storage.objects` y tablas históricas EFG; si faltan, fallará cerrado. NO borrar esa exigencia ni copiar manualmente filas privadas a un chat. Resolver el mecanismo de exportación de Auth/Storage con la documentación/versiones instaladas y una instancia de destino aislada, sin cambios productivos. No editar SQL para simular completitud.

**No están listos los respaldos físicos de Storage** por generar estos archivos: las tablas de metadatos no contienen los bytes.

## 4. Sellado SHA256 sin subir información

```bash
export EFG_COACH94_MANUAL_ACK=LOCAL_PRIVATE_RESTORE_REHEARSAL
node "$HOME/EFG-Nutrition-Revision/efg-nutrition/scripts/coach94-platform-triplet-recovery.mjs" \
  seal "$HOME/efg-coach94-private"
node "$HOME/EFG-Nutrition-Revision/efg-nutrition/scripts/coach94-platform-triplet-recovery.mjs" \
  verify "$HOME/efg-coach94-private"
```

Si ambos comandos terminan correctamente, el resultado **no demuestra restauración**; solo que la tripleta pasó un mínimo estructural y sus SHA-256 coinciden con el manifiesto privado. No compartir el manifiesto ni los dumps.

## 5. Comprobantes privados — 3 objetos en la última consulta

Consultar [Storage > Files](https://supabase.com/dashboard/project/cyjvddhimbsfipjfctsl/storage/buckets) del proyecto Supabase. La documentación oficial permite bajar archivos individualmente desde el Dashboard: https://supabase.com/docs/guides/storage/management/download-objects . Como había **solo 3 objetos** en `efg-receipts` y `public=false` (inventario read-only 30/10 17:05 ART), **descargar individualmente al almacenamiento local cifrado** puede ser más sencillo que habilitar S3. Volver a contar en el momento del corte y registrar la lista privadamente. Después, al restaurarlos en un Storage aislado, verificar hashes de ambas copias con `coach72-private-storage-restore-verify.mjs` y permisos de acceso realmente privados. No subir recibos a un chat ni adjuntarlos a issues.

## 6. Qué sigue y por qué todavía NO publicar

1. Si se logra exportación real completa, conservar en la Mac privada evidencia de fecha de corte y paridad Auth/BD/Storage.
2. Restaurar en instancia local **completa** Supabase PG17 segregada, sin salida a Internet, con credenciales y tokens nuevos; probar estructura, permisos, 19 RPC y rollback en esa copia.
3. Pasar la migración de 8 módulos SOLO en staging; correr 12 pruebas UAT físicas iOS/Android/PC con cuentas ficticias.
4. Solicitar GO explícito antes de modificación alojada, merge, deploy o contacto de alumnos.

**Estado real al generar esta guía: solo herramientas, tests y documentación; ninguna exportación real ejecutada ni acceso al ordenador personal.**
