# NUT-52 · Paridad PostgreSQL 17 y ruta de ensayo Supabase Auth aislada

Fecha: 29/10/2026. PR #37 `DRAFT`. **No migración, no merge, no despliegue, no costos adicionales.**

## Evidencia de plataforma (solo lectura)
- `Supabase get_project(cyjvddhimbsfipjfctsl)`: `ACTIVE_HEALTHY`, PostgreSQL **17.11**. `list_branches=[]`; no existe staging alojado.
- `Render get_service / list_deploys`: servicio estático en rama productiva `efg-nutrition-app`; último despliegue **LIVE** en `9000e4d8e08bd9483770209a863b1cdba2141c43`. El PR #37 no toca este despliegue.
- Las pruebas de NUT-48 a NUT-51 utilizaban PostgreSQL **16** efímero con roles/claims **simulados**, no Supabase Auth real. Esa compatibilidad no certifica paridad con producción.

## Avance técnico NUT-52
El workflow existente `.github/workflows/efg-nutrition-postgres-staging-qa.yml` ahora usa el servicio `postgres:17` en la **misma** clase de runner aislado, sin nuevas bases de datos alojadas. Comprueba mediante `SHOW server_version_num` que el **servidor** es PostgreSQL 17 antes de aplicar los SQL de ensayo y sus escenarios de dos organizaciones ficticias.

Se mantiene el mismo `jobs.isolated-postgres` y su nombre/check para no romper gates de GitHub. No cambia la rama productiva, el SQL de Supabase ni el cliente público. El test solo prueba sintaxis/transacciones y controles de una base artificial; **no verifica JWT firmado, API de Supabase, estructura real íntegra, SMTP/OTP ni restauración**.

## Ruta siguiente sin cargos de hosting
**Primer entorno recomendado:** stack local de desarrollo Supabase CLI + Docker/compatible (Auth, PostgreSQL, API y Mailpit), aislado y sin vincularse al proyecto remoto. Documentación oficial:
- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/auth/testing-auth-flows

No se ha levantado este stack todavía. En esta sesión el entorno de ejecución no tiene `supabase`, `docker` ni `psql` disponibles; la primera ejecución de los SQL de desarrollo seguirá siendo el runner GitHub.

**No** crear automáticamente una Preview Branch Supabase: la facturación de compute de Branching es aparte de créditos; requiere aprobación expresa de costo y política de datos. Fuente: https://supabase.com/docs/guides/platform/manage-your-usage/branching.

### Matriz para el próximo ensayo LOCAL AUTH firmado
1. Cargar **solamente datos de prueba**: org A/coach A/alumno A y org B/coach B/alumno B. Emails capturados en Mailpit, sin SMTP real.
2. Ejecutar esquema de acceso, ficha, drafts y publicación desde migraciones revisadas. Confirmar tablas, grants, funciones y RLS, migraciones reversibles y restauración probada; nunca usar `db push` sobre el proyecto real.
3. Autenticarse realmente como alumno/coach de A/B a través del API local; usar JWT de Auth local (no claims GUC manuales) y comprobar operaciones REST/RPC con distintos usuarios.
4. Negativas: cross-org lectura/escritura, desvinculación, consentimiento/revisión revocados, logout, rechazo de rol no autorizado, intento de INSERT directo en objetivo/guía, nueva versión de ficha, borrador viejo, publicación concurrente y segundo request UUID.
5. Comprobar ante error: **0** metas/guías/accesos/avisos parciales. Ante éxito: meta+guía+acceso+aviso+recibo atómicos e idempotentes. No modificar diario histórico ni plan anterior.
6. Verificar datos nutricionales y legales **reales** como tarea aparte; los fixtures sintéticos no acreditan restricciones clínicas ni aprobación jurídica.
7. Hacer ensayo de restauración del **entorno local** con snapshot ficticio; registrar tiempos, fallos y recuperación. QA física iPhone/Android y revisión visual humana siguen por separado.

## Decisión
`COACH_ATOMIC_PLAN_UI_ENABLED=false` y PR #37 DRAFT. **NO GO** hasta pruebas reales con Auth local, RLS entre dos organizaciones, fuentes alimentarias y legales validadas, integraciones legacy, capturas físicas y autorización final.

La prueba PostgreSQL 17 tendrá resultados registrados sobre el SHA exacto del workflow posterior a esta documentación, no se presenta como aprobada sin leer CI.
