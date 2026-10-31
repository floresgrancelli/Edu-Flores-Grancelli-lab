# NUT-57 · Ensayo integral de restauración y reversión (SÓLO DATOS FICTICIOS)

**29 de octubre de 2026 | PR #37 DRAFT | RELEASE: NO GO | NO publicar, NO aplicar a Supabase alojado**

## Qué se comprobó realmente

El job de PostgreSQL 17 en GitHub Actions (SHA de ensayo `a85c3916f2fc50b1fa4fe132f7d01ad8fcd44b2a`, ejecución **40986681317 SUCCESS**) efectuó lo siguiente, en bases PostgreSQL **separadas y descartables**:

1. Creó una base preactualización desde `tests/sql/nut57-preupgrade-fixture.sql` y `tests/sql/nut56-prodshape-local-overlay.sql`: roles, dos organizaciones, perfiles, permisos de coach/alumno, metas, guías, notificaciones heredadas, diarios, peso, actividades, comidas habituales y recetas, todos con contenido ficticio.
2. Sembró dos alumnos preexistentes con `tests/sql/nut57-legacy-fictitious-records.sql`; uno conserva una meta, guía, diario y otros registros históricos. No hay datos de usuarios reales.
3. Generó un **backup custom format** con `pg_dump` PostgreSQL 17 dentro del contenedor, lo restauró con `pg_restore --exit-on-error` en una segunda base aislada y verificó registros restaurados.
4. Instaló previamente `LEGAL_VERSIONED_ACCEPTANCE_STAGING_SQL_20261029.sql` sólo en la copia ficticia y después ensambló los **cinco** módulos NUT-57 en orden usando `tests/nut57-integrated-rollback-qa.mjs` y `tests/nut57-staging-bundle.mjs`. El SQL generado tiene un **BEGIN**, no contiene **COMMIT** y termina con **ROLLBACK**.
5. Ejecutó todo el SQL hasta las aserciones internas `tests/sql/nut57-rollback-assertions.sql`: dos alumnos antiguos con estatus publicado, asociación al objetivo anterior, nuevo alumno en pendiente, restricciones de escritura por RLS para alumno pendiente (pero no para anterior), conservación de registros de diario/peso/actividad/recetas/habituales, supresión de triple notificación, borrador/recibo de publicación vacíos, bloqueo de escritura REST directa de objetivos, guías y aceptación legal.
6. Confirmó tras el ROLLBACK que **no persistieron** nuevas tablas, alumno temporal ni datos de test, y que permaneció intacta la información histórica sintética.
7. Generó una **segunda** transacción sobre la misma copia con una excepción provocada al final; el proceso falló según lo esperado y el cierre de conexión revirtió íntegramente lo ejecutado. Los conteos históricos y el esquema anterior siguieron iguales.

En el primer ensayo **falló** la sintaxis de una expresión `CASE` del SQL legado de `migrations/20261029_coach_intake_plan_access_DRAFT.sql`. Se corrigió en `a85c3916...` colocando el `CASE` entre paréntesis. Esa corrección no se aplicó a producción ni alteró acuerdos del producto.

## Lo que NO demuestra

- La base ficticia reproduce **sólo una parte** del esquema hospedado de EFG Nutrition Pro. No fue obtenida de un dump real; no cubre todas las relaciones, extensiones, políticas, triggers, funciones, índices, datos atípicos, volúmenes o sesiones de clientes de producción.
- El respaldo restaurado corresponde **exclusivamente a la base de ensayo ficticia**, NO al proyecto Supabase Pro real ni a todo su universo de tablas.
- Es una prueba de **ejecución con ROLLBACK antes de commit**; un despliegue real requiere además estrategia verificable de restauración posterior al commit, tiempos de bloqueo, concurrencia y compatibilidad PWA.
- Los documentos legales usados en el entorno fueron ficticios; faltan aprobación jurídica y aceptación auténtica por los usuarios finales.
- No se revisó clínicamente el semáforo de restricciones, alérgenos o celiaquía ni se activó la modalidad Autogestión.
- No se realizó una prueba física real en iPhone, Android y MacBook.
- No implica que sea seguro activar `COACH_ATOMIC_PLAN_UI_ENABLED` o `LEGAL_ONBOARDING_ENABLED`, ni desplegar la app.

## Próximo gate obligatorio

**NUT-57 producción fiel:** inventariar el esquema actual sin extraer datos privados, generar un staging de paridad comprobada y restaurable, verificar diferencias de tablas/constraints/triggers/RLS y ejecutar la migración integral con clientes y JWT auténticos de ensayo. Determinar también qué hace la aplicación PWA antigua durante la transición; preparar un rollback post-commit de verdad. Revisar legal, nutrición y seguridad. Publicar **todos los cambios juntos** únicamente con aprobación expresa del propietario.

**Documentación de continuidad:** Plan Maestro, pestañas «Continuidad chat» y «Control QA». **GitHub:** PR #37; rama productiva `efg-nutrition-app` intacta SHA `9000e4d8e08bd9483770209a863b1cdba2141c43`.
