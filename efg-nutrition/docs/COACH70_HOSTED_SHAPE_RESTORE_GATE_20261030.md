# COACH-70 · Paridad de esquema y ensayo de restauración para la gran actualización

**Fecha:** 30/10/2026 · **Nutrition Coach exclusivamente** · PR #37 en DRAFT · **NO GO**.

## Evidencia tomada de Supabase alojada, sin datos personales

La estructura se consultó con SELECT sobre `information_schema` y `pg_catalog`, nunca con lectura de alumnos ni registros. Proyecto `cyjvddhimbsfipjfctsl` (PostgreSQL 17.11, región sa-east-1).

- `tests/sql/coach70-live-schema-columns-20261030.json`: snapshot de **123 columnas en 15 tablas** (nombres, tipo, nulabilidad y presencia de predeterminado, nunca valores de registros). Incluye `efg_profiles`, `efg_organizations`, `efg_consents`, `efg_goals`, `efg_food_plans`, `efg_notifications`, `efg_daily_logs`, `efg_weights`, `efg_activities`, `efg_habitual_meals`, `efg_personal_recipes`, `efg_invitations`, `efg_messages`, `efg_payments` y `efg_weekly_reports`.
- `tests/sql/coach70-hosted-schema-controls-20261030.json`: todas esas **15 tablas tienen RLS activado** en el alojado. El inventario real reporta **40 políticas, 8 triggers de aplicación, 39 índices y 38 restricciones CHECK**, además de sus claves foráneas. **No** se está afirmando que las políticas/triggers/índices locales sean idénticos: este snapshot sólo guarda sus recuentos y banderas.
- `tests/coach70-live-schema-parity.mjs` contrasta automáticamente columnas y flags RLS de las 15 tablas **en PostgreSQL local descartable y antes del dump**. No acepta una conexión remota ni una base distinta de las de CI.
- La primera comparación local halló **8 incompatibilidades concretas**, todas en `efg_habitual_meals`, `efg_personal_recipes` y el predeterminado de `efg_organizations.id`. Se corrigieron las estructuras sintéticas y su carga de datos ficticios, sin tocar alojado.
- `tests/sql/nut57-preupgrade-fixture.sql` ahora modela también invitaciones, mensajes, pagos e informes semanales. `tests/sql/nut57-legacy-fictitious-records.sql` contiene un registro ficticio de cada uno. `tests/sql/nut57-synthetic-history-fingerprint.sql` hace un hash determinista de **16 tablas históricas sintéticas (auth.users + las 15 públicas)** para comparar ANTES, DESPUÉS de una migración ficticia con COMMIT y TRAS la restauración con `pg_dump/pg_restore`.
- Las políticas RLS locales son **simulaciones conservadoras**, no una reproducción íntegra de las reglas alojadas, por lo que esta prueba es paridad de **columnas y habilitación RLS** y preservación de filas ficticias, nada más.

## Por qué aún NO es una restauración de producción

Supabase alojada **no** contiene todavía las tablas/RPC del nuevo onboarding ni la publicación versionada. Tampoco hay un Supabase Development Branch conectado al proyecto (consulta `list_branches` devolvió lista vacía). El proyecto Pro puede tener respaldos diarios según la configuración y [documentación de Supabase](https://supabase.com/docs/guides/platform/backups), pero **no se verificó desde esta conversación la existencia/fecha de un backup restaurable de este proyecto ni que PITR esté contratado**. Las copias de la base no incluyen necesariamente objetos binarios del Storage API; los comprobantes requieren estrategia independiente. No asumir respaldo exitoso por la sola suscripción Pro.

Una prueba en un contenedor sintético no garantiza instalación sobre el esquema completo en producción ni reemplaza la restauración de una copia del hospedado. Crear un Development Branch puede tener costo adicional: no se creó uno ni se autorizó ningún gasto.

## Procedimiento para cerrar el bloqueo de lanzamiento, sin pérdida de historial

1. **Preflight externo y de seguridad.** Validar formalmente textos legales, tratamiento de información médica y reglas de alimentos; resolver controles críticos de las 19 RPC SECURITY DEFINER, sin revocaciones indiscriminadas. Confirmar scripts compatibles con el esquema alojado actual y aprobados por revisión.
2. **Respaldo real y restaurabilidad demostrada.** Verificar en Dashboard `Database > Backups` un punto reciente restaurable del proyecto real; inspeccionar si PITR existe y su ventana, y completar un backup lógico protegido si procede. Verificar independientemente Storage, usuarios, consentimientos y mensajes. No restaurar sobre la base viva para hacer una prueba.
3. **Staging aislado de paridad.** Crear/aprobar un entorno separado por vía administrada; restaurar una copia con acceso restringido y datos minimizados o anonimizados. Reconciliar columnas, claves, índices, restricciones, políticas, triggers, helpers y firmas de RPC antes del ensayo. Ningún marcador ficticio `nut57_isolated_staging_marker` debe instalarse en producción para eludir guardas.
4. **Ensayo completo de migración.** Aplicar solo migraciones Coach/Legal revisadas en el entorno aislado, registrar migraciones y hashes, probar restauración a partir de backup si falla una sentencia e igualdad de historiales. No borrar perfiles ni objetivos. El proyecto candidato contiene SQL DRAFT con banderas OFF; NO está listo para aplicarse tal cual sobre alojado.
5. **Validación real de funcionalidades.** JWT firmados para Coach A/B y Alumno A/B; alumno piloto previamente activo ingresa con sesión recordada → acepta Términos y Privacidad VIGENTES → completa ficha NUEVA en blanco por versión → decide compartir con coach → coach calcula y revisa cinco comidas → publicación atómica exactamente una vez → revoca permiso → coach pierde acceso a ficha. Confirmar restauración de diarios, mensajes, pagos, recetas, objetivos, pesos y PWA antiguo. Hacer UAT física iPhone/Android/PC y accesibilidad.
6. **GO de propietario y cutover controlado.** Solo tras aprobar backup restaurable, permisos, legal/clin, cinco CI en mismo SHA y dispositivos reales: solicitar autorización expresa para aplicar migraciones y publicación. Plan de reversión inicial: mantener flags OFF/revertir frontend sin borrar tablas ni datos nuevos; un rollback destructivo de esquema después de nuevos envíos requiere un plan adicional aprobado.

### Resultado hasta ahora

Se amplió de 11 a 15 tablas la comparación de columnas y se agregó control de RLS encendido; se ampliaron los registros ficticios bajo protección de huella digital a 16 tablas. La prueba PostgreSQL de la etapa inicial **aprobó** con los 15 esquemas de columnas y 4 tipos de registros adicionales. La verificación final conjunta que incluye flags RLS, hash del historial y nuevos commits requiere comprobación del SHA más reciente.

**La app en Render, los alumnos, los historiales y Supabase alojada siguen sin cambios. Nutrition Autogestión continúa en pausa.**
