# Administración de coaches: ubicación y tamaño

Estado: candidata aislada, sin merge ni despliegue. Base publicada consultada: `24623efb577926c4f8c8603ee948ee7223bb193d`.

## Solicitud
El bloque de creación/verificación de espacios profesionales aparecía en todas las pestañas y ocupaba demasiada pantalla. Debe quedar en Administración.

## Corrección
- La ubicación visible se deriva de las pestañas `admin` y `adminManage`, además del rol administrador ya verificado por el cliente.
- Los formularios se desmontan del documento al salir de Administración, sin eliminar borradores, y se reinsertan al volver. No hay nuevas escrituras, permisos o cambios del perfil.
- La administración inicia plegada en “Administrar coaches y cupos”; las verificaciones de operaciones anteriores quedan en desplegables secundarios.
- Si la cuenta no tiene espacio profesional propio, el bloque desaparece completamente en las demás pestañas.
- Las cuentas con doble espacio conservan un selector compacto para alternar personal/profesional. Se conservan bloqueo de navegación profesional, borradores, separación de sesión y retorno al espacio personal.
- Se actualizaron las identidades de assets modificados, conservando el identificador de release del servidor y verificaciones estrictas del manifiesto.

## Verificaciones ejecutadas
- Sintaxis de los dos módulos modificados: PASS.
- 329 pruebas Node de doble espacio/profesional, incluyendo cinco nuevas de ubicación, borradores y navegación: PASS.
- Manifiesto exacto y `git diff --check`: PASS.
- Las nuevas pruebas de DOM son dobles en memoria; NO equivalen a navegador ni a prueba física.

## Pendientes explícitos
- Prueba visual real Chromium en 390/412/1280 y flujo real completo. Se preparó `tests/professional-workspace-admin-location-browser.cjs`, pero el navegador no inició: `socket() failed: Operation not permitted`, incluso después de la ejecución revisada. No se eludió el bloqueo y no se generaron capturas.
- `dual-workspace-fullapp-contract.test.mjs` requiere los insumos históricos `base-tree.json` y `baseline` que no estaban en este checkout; se excluyó de la corrida final, no se cuenta como PASS.
- No hubo operaciones en servicios alojados, cambios de datos reales, merge, despliegue ni prueba en teléfono físico.
