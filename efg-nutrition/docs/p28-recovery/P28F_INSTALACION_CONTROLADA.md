# P28F — Paquete de instalación controlada

4/11/2026. Proyecto existente `cyjvddhimbsfipjfctsl`. PR53 DRAFT. No autoriza merge, Render ni activar flags.

## Alcance concreto

`docs/P28_PRIVATE_HEALTH_INSTALL_NOT_APPLIED.sql` instala las tres tablas privadas, cinco RPC y protección transaccional P28. Copia los cuerpos SQL exactos ya probados en P28E; solo sustituye los guardas de entorno de ensayo por requisitos de instalación y reúne los módulos en una transacción. No reemplaza funciones existentes. No crea documentos, alumnos ni declaraciones. El nuevo switch queda OFF. Las tablas privadas tienen RLS y ningún acceso directo de anon/authenticated; las RPC acotadas conservan controles de identidad/consentimiento.

Se genera con `node efg-nutrition/scripts/p28-health-install-bundle.mjs --write`; `--check` detecta divergencia respecto de los módulos originales. El generador no conecta ni ejecuta SQL. Los originales STAGING ONLY conservan sus guardas.

## Preflight alojado ejecutado

`tests/sql/p28-health-install-readonly-preflight.sql`: 34/34 comprobaciones aprobadas mediante lectura de metadatos y switches, sin consultar fichas personales. Verifica tipos de las 16 columnas consumidas, firmas/resultados de cuatro funciones, ausencia de los nueve objetos nuevos, ausencia de triggers de borradores, defaults para insertar el switch y controles OFF. El mismo preflight se ejecuta dentro del paquete antes de cualquier DDL. El default alojado de `coach_release_switches.updated_at` es `now()`, compatible con el INSERT.

Esto acredita requisitos estructurales concretos; no acredita permisos de cuentas reales ni funcionamiento del recorrido alojado. Las definiciones de autorización legal y relación coach/alumno se revisaron en P28E. No se presume equivalencia de toda la base descartable con producción.

## Ensayo requerido del paquete exacto

`coach119-full-atomic-pg17.mjs` usa ahora el paquete de promoción completo. Debe rechazar instalación con switch activo, columna faltante y reinstalación. Inyecta error después del DDL para verificar rollback de tablas, RPC y switch. Instala las tablas vacías con RLS, comprueba permisos y todos los checks de postflight, confirma historial de objetivos intacto y ejecuta las regresiones P28E de publicación/revocación/concurrencia sobre ese paquete. Esperar resultado del HEAD actual antes de aplicar.

## Ejecución alojada, después de autorización específica

1. Confirmar proyecto `cyjvddhimbsfipjfctsl`, SHA del paquete y CI del mismo commit. Repetir SOLO el preflight de instalación para detectar cambios desde la preparación.
2. Aplicar el SQL completo como una migración aditiva registrada, sin fragmentarlo. `lock_timeout=3s` y `statement_timeout=30s` evitan esperar indefinidamente. Un error revierte todo; no reintentar sin leer la causa.
3. Ejecutar `tests/sql/p28-health-install-readonly-postflight.sql`: siete resultados verdaderos. Revisar advisors para los objetos nuevos y comprobar recarga de esquema PostgREST.
4. Conservar los tres switches OFF y Render intacto. El documento sanitario continúa ausente; por tanto no se puede guardar una declaración nueva hasta preparar y aprobar ese texto separado.

## Recuperación y siguiente prueba

Si falla la transacción no queda instalación parcial. Si el postflight falla tras un COMMIT exitoso, no activar flags ni borrar tablas: diagnosticar la diferencia; cualquier retirada debe asegurar que las tablas nuevas siguen vacías y conservar toda declaración que pudiera existir. La versión estable continúa disponible.

Después corresponde texto breve de autorización sanitaria del piloto, actores y escrituras de prueba expresamente autorizados, y recorrido candidato en navegador. No crear alumnos ficticios en producción. Falta esa validación alojada antes del GO de actualización.
