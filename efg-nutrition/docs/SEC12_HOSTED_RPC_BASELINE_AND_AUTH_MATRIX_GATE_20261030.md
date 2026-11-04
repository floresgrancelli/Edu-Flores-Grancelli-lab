# SEC-12 — Inventario versionado de 19 RPC privilegiadas (solo metadatos)
**30/10/2026 · Nutrition Coach · PR #37 DRAFT · NO GO**

## Evidencia realmente obtenida

La consulta exclusivamente `SELECT` al catálogo del proyecto alojado `cyjvddhimbsfipjfctsl` devolvió exactamente **19 funciones públicas `efg_%` SECURITY DEFINER ejecutables por `authenticated`**. En esas 19:

- 0 permiten `EXECUTE` al rol `anon`.
- 19/19 establecen `search_path=""` explícito.
- 19/19 contienen una referencia textual a `auth.uid()` o `efg_private.is_admin()`.
- Se guardaron nombre y firma de argumentos, ACL efectiva de ejecución y MD5 del texto de definición en `tests/sql/sec12-hosted-privileged-rpc-baseline-20261030.json`.
- Se agregó `tests/sec12-hosted-privileged-rpc-contract.mjs` a Security CI; contrasta exactamente las 19 firmas y los hashes con la línea de base congelada y contiene pruebas negativas artificiales de acceso anónimo, ausencia de referencia a identidad, `search_path` ampliado y cambios de definición.

**No se accedió a filas, pacientes, informes, contraseñas, credenciales ni recibos.** No se ejecutó ninguna RPC productiva, se cambiaron roles, se revocó ningún permiso ni se alteró Supabase alojado.

## Interpretación necesaria

Una referencia textual a `auth.uid()` o `is_admin()` **NO demuestra autorización correcta**. Una función puede contener ese texto y seguir permitiendo acceso indebido por otras rutas. Las huellas MD5 solo permiten reconocer drift: no validan criptográficamente datos o backups, ni explican si el cambio es seguro.

Ya hay pruebas de Auth con JWT de usuarios **ficticios** para los nuevos borradores/publicaciones de Coach en Supabase **local** (COACH-69), pero **no** se ha ejecutado una matriz dinámica y reproducible para las **19 funciones reales** con dos organizaciones y roles distintos. No mezclar resultados.

## COACH-74 · Preflight de restauración ampliado (30/10)

Se extendió `scripts/coach71-hosted-preflight.mjs` para incluir un **tercer control de metadatos `READ ONLY`**: las 19 firmas de funciones, sus permisos anon/authenticated, configuración `search_path` y digest del código deben coincidir con el baseline alojado SEC-12. Si falta una función, cambia una firma o se habilita una ejecución anónima, devuelve NO GO por *drift*. Esto opera **solo sobre PostgreSQL local aislado aprobado** y no invoca ninguna RPC de negocio. El ensayo negativo con el fixture PG17 deliberadamente incompleto debe seguir fallando como parte de la prueba satisfactoria.

**Limitación:** una coincidencia exacta de firmas NO prueba que sus condiciones de autorización sean correctas; se requieren JWT firmados con casos negativos y positivos de las 19 funciones sobre staging restaurado desde una copia fiel.

## Gate pendiente antes de lanzamiento

1. Obtener un staging restaurado y aislado de la estructura real, con protección de datos y costo explícitamente aprobado. No asumir que la rama Supabase replica datos reales ni que un backup existe solo porque el plan es Pro.
2. Reproducir las 19 funciones reales con helpers, permisos, triggers y datos de prueba en staging. Probar con JWT firmados de: anónimo, alumno A/B, coach A/B, administrador, suspensión, pertenencia cruzada y consentimiento revocado. Por cada RPC registrar caso positivo/negativo, resultado y evidencia sin volcar datos privados.
3. Probar los nuevos componentes de ficha y documentos legales, versionado y publicación atómica; realizar restore, revisión legal/clínica y QA físico iPhone/Android/PWA; incluir la mejora de informes que el propietario comunicará antes del deploy.
4. Solo con todos los gates reales y 5/5 CI sobre el SHA final presentar GO/NO GO al propietario. **No fusionar, desplegar, habilitar flags ni crear recursos de pago sin autorización expresa.**

**Estado SEC-12: inventario de metadatos y control preventivo preparado; las pruebas JWT de autorización funcional siguen pendientes. RELEASE NO GO.**
