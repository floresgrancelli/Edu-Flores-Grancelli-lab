# COACH-71 · Preflight estricto de objetos alojados para migración Coach (sin tocar producción)

**30/10/2026** · PR #37 DRAFT · SOLO Nutrition Coach (Alumno, Coach, Admin). **NO GO**.

## Qué se hizo de verdad

1. Se ejecutó un `SELECT` a `pg_catalog` en Supabase alojado `cyjvddhimbsfipjfctsl` sin leer ningún dato comercial, médico, de identidad, pago ni objeto Storage. La nueva referencia reproducible `tests/sql/coach71-hosted-object-signatures-20261030.json` contiene metadatos de **15 tablas**.
2. Se inventariaron y congelaron **40 políticas RLS, 8 triggers no internos, 39 índices, 38 restricciones CHECK y 27 claves foráneas (FK)**, con una huella por tabla/tipo. Adicionalmente se registraron los 14 permisos efectivos por tabla: 7 operaciones (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) para cada rol `anon` y `authenticated`. Ninguna de las 15 tablas concede esas operaciones directamente a `anon`; `authenticated` tiene SELECT sobre las 15 y ciertas operaciones de escritura, cuyo acceso a FILAS depende de RLS. Para políticas, los nombres de los roles se normalizan (no se codifican OID dependientes de cada PostgreSQL).
3. Se creó `scripts/coach71-hosted-preflight.mjs`: compara de modo **estricto**, en una DB **local permitida**, RLS, FORCE RLS, recuentos/huellas de esos cinco tipos (incluyendo FK) y permisos efectivos de tabla para ambos roles. Sale con código **2** ante diferencia, **3** si intenta utilizar host/base desconocidos o falla el SQL, **0** solo cuando estos metadatos específicos coinciden.
4. `tests/coach71-hosted-object-contract.mjs` valida 15 entradas, sumas y formato de huellas y confirma que el preflight **rechaza antes de conectar** una base no aprobada. Este control offline se agregó a Security CI; **no** hace consultas contra una copia restaurada ni prueba seguridad dinámica.

## Estado y alcance de esta evidencia

Las huellas MD5 son una señal de **drift de definiciones**, no un hash seguro de datos ni certificación de integridad de backup. Las definiciones pueden variar por normalización, versión o dependencias, aun cuando su semántica sea equivalente. Ahora incluye huellas de FK y permisos efectivos de TABLA, pero no cubre permisos de COLUMNA, raw ACL/GRANT por todas las identidades, owners, tipos personalizados, extensiones, funciones SECURITY DEFINER, permisos internos de Auth, JWT, Storage ni datos/filas. Coincidir en este control **NO** demuestra autorización RLS ni significa GO.

El `tests/sql/nut57-preupgrade-fixture.sql` actual contiene políticas **sintéticas** de alcance limitado y no reproduce las 40 políticas alojadas: el preflight estricto DEBE señalar diferencias al ejecutarse contra ese fixture. Ningún check anterior se está rebautizando como paridad completa.

## Próximo procedimiento sin riesgo para producción

1. Confirmar la **existencia actual** y disponibilidad de copia real restaurable en Supabase Dashboard. El Plan Maestro «Backup y recuperacion» informó cuatro respaldos físicos visibles al **29/10/2026** y **PITR desactivado**, pero **no** una restauración probada. No dar por verificado el respaldo del 30/10 sin nueva lectura del panel.
2. Obtener aprobación explícita de costos y tratamiento de datos antes de crear un Supabase Development Branch, un proyecto separado o exportar datos sensibles a un entorno externo. Los objetos de comprobantes de pago requieren respaldo de Storage independiente.
3. Restaurar una copia autorizada y protegida en PostgreSQL 17 **aislado**, con acceso mínimo, políticas de retención y minimización o anonimización apropiada. Nunca restaurar encima de la base viva ni cargar registros de alumnos a un CI público.
4. Ejecutar el preflight **ANTES de las migraciones** sobre una restauración local preparada y aprobada, por ejemplo:

```bash
PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=efg_coach71_restore_preflight PGUSER=postgres \
node efg-nutrition/scripts/coach71-hosted-preflight.mjs
```

5. Si falla, revisar *cada diferencia* contra `snapshot_sql`, completar políticas/triggers/índices/CHECK/FK/permisos efectivos de tabla del entorno aislado y ampliar a permisos por columna, ACL originales, helpers y SECURITY DEFINER. No copiar ciegamente definiciones ni modificar permisos de Supabase alojado. Volver a ejecutar.
6. Cuando haya una copia fiel, aplicar migraciones Coach/Legal únicamente en staging; comparar huellas de los historiales **antes/después/restore**, simular rollback y escrituras concurrentes, y probar JWT reales ficticios por dos organizaciones. Incorporar revisión de legal, clínica, clientes PWA antiguos y QA físico iPhone/Android/PC.
7. Solo tras verificación de respaldo restaurable, seguridad y 5/5 CI del mismo SHA final, presentar **GO/NO GO** al propietario. No fusionar, desplegar, habilitar flags ni cambiar Supabase sin permiso expreso.

**Situación al crear este documento:** no se creó staging pago, no se descargaron datos reales, no se ejecutó restauración de copia alojada, no se instalaron migraciones en producción, y Autogestión sigue OFF. **NO GO**.
