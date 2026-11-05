# P30O — editor móvil y revisión directa de Dieta Guía (candidata)

Alcance autorizado: candidata/documentación con datos ficticios. Sin merge, producción, backend, permisos, credenciales, nuevos recursos ni mensajes reales.

Base: PR53 ya fusionada; rama reutilizada `work/ncc-owner-eight-intro-qa-20261103`, avance directo desde 97787a6 a cd5062f (incluye PR54). Checkout independiente en task-2; checkout del hotfix intacto. Inventario de hilos locales: otros hilos inactivos. No AGENTS.md, .agents/skills, package.json, tsconfig ni configuración lint en este checkout. Se siguieron los scripts/workflows existentes. Un archivo ajeno no rastreado `tools/pwa-build-identity 2.mjs` se conserva fuera del commit.

## Cambios

- Nombres completos fuera del selector, controles de 44px/16px y tarjetas de una columna también para administrador. El arreglo anterior solo alcanzaba `.efg-role-coach`.
- Edición → Ver dieta armada y enviar → Aprobar y enviar. Vista completa con seis o menos comidas, cantidades, objetivos/desvíos, nota y destinatario. Volver/Escape conserva edición sin escritura. Guardado y lectura verificada integrados al envío; sigue la confirmación explícita y publicación atómica existente. Guardar para continuar después sigue disponible.
- Porciones según FOOD_UNIT_PORTIONS ya existente, incluidos huevo/pan. Almacenamiento y nutrientes permanecen en g/ml. Un render/read sin edición preserva cantidades exactas, aunque la presentación redondee a dos decimales. Las equivalencias aproximadas se muestran; no se inventan pesos de marca ni se redondean silenciosamente los datos existentes.
- Un envío concurrente por vista; reintento conserva UUID tras fallo; no se vuelve a guardar un borrador coincidente. Cambios de alumno/sesión/ficha/contenido invalidan la revisión. Los límites y RPC actuales permanecen.
- Versión de assets `ncc-pilot-3a40474052be-guide1`; identidad de release servidor conservada. Manifest candidato exacto separado del hotfix histórico; esto no es aprobación ni despliegue.

## QA

Prueba nueva `node efg-nutrition/tests/guide-preview-mobile.mjs` sobre módulos, renderizadores y handlers reales, transporte ficticio y bloqueo de toda red externa; Chromium a 360/390/1280 px. Incluida en Visual CI. Ver resultados locales y CI final en la entrega.

No existe target de lint/types; se ejecuta sintaxis Node y git diff --check, más regresiones existentes. No se modifica ninguna configuración para simular un PASS.

Límites: captura IMG_1957.jpeg (Library libfile_4957c6eecd9c819196a8ff2cce86ad2d) resuelta pero materialización oficial falló dos veces (download failed, destino local explícito). No disponible para inspección de píxeles; no se eludió. QA visual realizada sobre screenshots de la app sintética. No iPhone físico ni envío autenticado alojado; no afirmar esos PASS.

Validación local: 13 regresiones existentes PASS (artifacts/guide-preview/regressions.json); sintaxis de archivos modificados y diff-check PASS. Target guide-meal-education.mjs inexistente: no ejecutado. QA visual Chromium 360/390/1280 PASS, incluidos 2 huevos=100g, 1 rebanada=30g, total nutricional idéntico y publicación simulada exitosa.
