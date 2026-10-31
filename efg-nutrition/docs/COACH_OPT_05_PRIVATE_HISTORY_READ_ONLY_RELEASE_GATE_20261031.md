# COACH-OPT-05 · Historial del alumno con ficha privada — SOLO CANDIDATA
Fecha: 31/10/2026 · PR #37 DRAFT · Nutrition Coach (alumno/coach/admin) · **NO GO / NO PUBLICAR**

## Problema observado
El circuito COACH111/116 diferenciaba `private` y `review` y no habilitaba nuevas escrituras de comidas. Sin embargo, el cliente cortaba la carga de datos antes de consultar diarios, pesajes, metas, guías, informes y pagos del propio alumno. En `private`, la pantalla decía que el historial se conservaba, pero solo ofrecía ficha, mensajes y ciencia. La conservación en base no equivalía a **acceso del titular**.

## Cambios en PR37, banderas OFF
- Nuevo módulo `pilot/coach-private-history.js`: consultas `SELECT` a seis recursos propios bajo el JWT actual, siempre filtradas por `student_id=auth.uid()` o `payer_id=auth.uid()`. Las políticas RLS de servidor siguen siendo la autorización real. Se rechaza una respuesta que contenga una fila de otro usuario; sin rol alumno activo, legal vigente, participación firmada y ruta `private`/`review` validada, no consulta datos.
- `pilot/pilot.js` integra la lectura solo para rutas `private` y `review` del adaptador COACH111/116. Se añade menú `Mi historial` con registros previos, pesajes, objetivo/guía aprobados, informes y comprobantes enviados, **en modo lectura**, sin botones de edición, publicación, pago o registro de comida.
- Si la cuenta o la verificación fallan, no se entrega historial parcial; el cliente no interpreta una caché local como autorización. Los datos no se copian a almacenamiento local.
- El circuito `ready` y las funcionalidades de coach/admin no cambian. `COACH_STUDENT_JOURNEY_ENABLED=false`, `COACH_RELAUNCH_ONBOARDING_ENABLED=false` y Autogestión OFF. No se modifica Supabase alojada ni Render.

## Pruebas
`tests/coach-private-history.mjs` con fixture sintético: seis SELECT filtrados al titular, HTML escapado frente a nombres y reportes maliciosos, rechazo de identidad ajena, ruta legal, rol incorrecto, escritura no habilitada, y comprobación de integración en `pilot.js`. Se agregó al workflow Premium QA. **No es una prueba de dispositivos reales, RLS de hospedaje ni paridad de staging.**

## Refuerzo de sesión vigente · 31/10/2026 (candidata)
El perfil almacenado en memoria al iniciar sesión puede quedar obsoleto si un administrador desactiva, cambia de rol o traslada a un alumno mientras conserva su PWA abierta. Antes de consultar las seis fuentes históricas, el cliente ahora relee `efg_profiles` con el JWT actual y exige `user_id`, rol alumno, `active=true` y organización iguales al contexto firmado. Ante error o discrepancia falla cerrado y no consulta historial. Se añadieron regresiones sintéticas para inactivación, traslado y cambio de rol. **Esto es defensa en profundidad del cliente, NO sustituye RLS ni revocación inmediata de JWT, y requiere validación con JWT en staging fiel.**

## Pendientes obligatorios
1. Verificar 5/5 CI en el mismo SHA final y que Premium ejecute COACH-OPT-05; corregir cualquier fallo.
2. En staging fiel restaurado: JWT A/B y verificación de RLS para las seis lecturas, incluso tras traslado/inactivación y revocación de permisos, preservando historial del titular.
3. UAT física Android/iPhone/PC, navegación táctil, lectura de guías y PDF de informes, PWA anterior y permisos revocados.
4. Completar migraciones Coach, COACH119, documentos legales aprobados, SEC-08 29 RPC, respaldo DB/Auth/Storage y restauración/PITR.
5. No habilitar flags, publicar, fusionar, contratar ni cambiar usuarios reales sin autorización GO expresa.

**Alcance real:** se añadió una ruta de consulta histórica a la candidata. No implica que el relanzamiento o las 55 mejoras estén terminados.
