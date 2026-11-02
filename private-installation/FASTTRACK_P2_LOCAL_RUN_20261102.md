# Ejecución local de instalación P2 · 02/11/2026

Esta nota activa una sola vez el **job `incremental-install-local`** del workflow `efg-nutrition-auth-local-qa.yml` mediante el marcador de mensaje GitHub `[incremental-install]`.

**Objetivo:** confirmar la instalación integral de migraciones candidatas y acceso JWT A/B en un Supabase PG17/GoTrue descartable con identidades ficticias, frente al estado observado del backend (9 preflight pendientes).

**Sin acceso a producción:** el job exige stack local Docker/localhost, prohíbe SUPABASE_ACCESS_TOKEN/SUPABASE_DB_PASSWORD, verifica la identidad del contenedor y elimina volúmenes después del ensayo. No aplica SQL en el proyecto alojado, no activa flags comerciales ni clínicos, no crea proyecto pago y no despliega Render.

**Origen congelado de posible release:** PR43 DRAFT `66be67df1bca5226e99999872ff6e88c747801fe`. Esta nota de QA se comitea sólo en PR42 y NO modifica el SHA de PR43. Cualquier diferencia futura requerirá revisar el código del test antes de extrapolar resultados.

**Evidencia requerida del job:** salida sanitizada del artifact `incremental-install-<SHA>`, paso a paso PASS/FAIL, JWT cross-org, preservación de históricos y rollback, ACL/RLS, seis migraciones locales, remoción del stack. No equivale a staging alojado, backup restaurable real ni GO.

**Estado:** control solicitado, resultado pendiente hasta verificar los logs de GitHub Actions.