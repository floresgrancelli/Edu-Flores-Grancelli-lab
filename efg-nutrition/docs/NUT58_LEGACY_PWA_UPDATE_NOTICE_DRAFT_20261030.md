# NUT-58 · Aviso seguro de actualización para PWA (borrador)

**30/10/2026 · PR #37 DRAFT · Publicación única pendiente · NO GO**

Se revisó el comportamiento de `pilot/version-notice.js`: el código comparaba `meta[name="efg-build"]` y la firma de los assets contra HTML `no-store`, pero `paint()` ocultaba siempre el cartel. Como consecuencia, la comparación podía identificar una versión distinta sin presentar ningún aviso accesible.

En la candidata se habilitó un cartel **visible solo cuando hay actualización verificable, la sesión está dentro de la app, la pestaña está visible y la versión no fue pospuesta**. El usuario puede pulsar «Más tarde» para posponer esa versión o «Cómo actualizar» para ver instrucciones de guardar y cerrar/reabrir. Nunca hay recarga automática, tampoco por foco, polling o cambio de visibilidad. El aviso **no fuerza legal onboarding**, no cambia los datos nutricionales y no promete conservar un formulario que aún no se haya guardado.

Se agregó `tests/version-notice-opt-in.mjs`, prueba local con DOM simulado, y se integró a la suite Premium QA. `tests/notifications-messages.mjs` ahora exige presentación únicamente cuando corresponde y mantiene la prohibición de `window.location.reload`. Se conserva `hasUnsavedChanges` y el aviso informa que hay que guardar antes de cerrar.

## Límites y gate de entrega

Esta prueba de UI **no garantiza que un cliente PWA antiguo ya instalado adquiera automáticamente el código nuevo**. El JavaScript actualmente publicado podría estar en caché y no puede modificarse retrospectivamente. La release final debe incluir identificador de build y query de assets actualizados en `pilot/index.html`, comprobar cierre y apertura real en iPhone Safari/PWA, Android Chrome/PWA y MacBook, y testear la ruta de usuarios con una sesión activa anterior al despliegue. Los clientes viejos pueden seguir llamando escrituras `efg_goals`/`efg_food_plans` que la migración NUT-57 revoca; debe haber estrategia explícita de compatibilidad y una ventana controlada de cambio. No se debe desactivar el mecanismo RLS para evitarles errores.

La prueba visual automatizada en Chromium/WebKit con fixtures sintéticos no reemplaza el UAT en equipos físicos. **No se modificó Render ni Supabase hospedado.**

## Estado

PR #37 sigue **DRAFT**; la app pública permanece en commit `9000e4d8e08bd9483770209a863b1cdba2141c43`. NUT-57 B3 recuperó desde respaldo de PostgreSQL 17 ficticio luego de COMMIT, no desde toda la base hospedada ni con PITR. LEG-07, restricciones médicas, Autogestión y UAT de dispositivos siguen pendientes. **Gran actualización única: RELEASE NO GO.**
