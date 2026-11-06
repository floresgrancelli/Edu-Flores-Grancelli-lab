# Candidata R10: informes y Dieta Guía

Fecha: 2026-11-06. Estado: candidata aislada, no desplegada. Base: `ed92b17ef0e62187dfa980fb81726d064c9485a4` de `efg-nutrition-app`.

## Correcciones verificadas en la candidata

- Informes Luxury Pro: generación y edición legible, revisión de un PDF real y envío desde esa vista tras confirmación explícita. Se invalidan cambios de alumno, fechas y contexto; se evita doble envío. Un rechazo confirmado permite corregir, mientras que los resultados inciertos conservan contenido e identificador para reintentar sin duplicar.
- Porciones: 131 alimentos individuales del catálogo tienen cantidades realmente enteras, no solamente etiquetas redondeadas. Las 238 equivalencias están clasificadas explícitamente. Se conservan ingredientes exactos de recetas, alimentos divisibles y cantidades bloqueadas; los nutrientes se calculan con las cantidades efectivas.
- Reequilibrio: la guía celíaca ficticia de 2100 kcal vuelve a quedar dentro del 2% en todos los nutrientes. Quitar un alimento conserva el límite previo del 1,5% en macros. El diagnóstico explica cuando los mínimos físicos vuelven imposible una meta, sin inventar valores.
- Coach: selector de organización horaria con regular, 12:12, 14:10 y 16:8. La ventana se conserva con el plan; cambiarla requiere regeneración explícita antes de guardar o enviar. No reduce metas diarias ni afirma elegibilidad clínica.

- PDF real: renderizador local compartido y versionado. Coach y alumno generan el mismo documento desde el snapshot exacto guardado. Hay opciones de abrir y descargar, HTML accesible separado y rechazo explícito de versiones o caracteres no admitidos. El renderer v1 y sus fuentes se conservan para los snapshots históricos.

## Verificación

- 34/34 suites locales y sintaxis de 114 módulos: PASS sobre la candidata combinada. Ver `local-regression-results.json`.
- Transportes y personas ficticios, pruebas de handlers reales y módulos. Incluye cancelación, errores, reintentos, cambio de contexto, restricciones y conservación de cantidades.
- Manifest de 105 módulos, HTML y 25 hojas de estilo, con hashes y versión de caché coherentes. Identidad de release `ncc-pilot-3a40474052be` y feature flags conservados.
- Medición orientativa en Node del caso celíaco: 0,89–1,39 segundos, frente a 6,85–8,30 segundos de una versión intermedia descartada. No es una medición en móvil.

- PDF: prueba con cliente y handlers reales más transporte ficticio confirmó identidad byte a byte entre la revisión del coach y el documento reconstruido por el alumno. Muestras de 10 y 90 días: 3 y 7 páginas, texto completo, fuentes Unicode embebidas y ausencia de JavaScript. La igualdad entre motores de navegador diferentes todavía no fue verificada.
- Revisión independiente de porciones, activos y PDF: sin hallazgos bloqueantes en el alcance sintético/local. Los informes semanales conservan su exportación anterior; este cambio atiende informes por período.

## Pendiente para publicación

- QA real del visor en navegador, apertura/descarga, móvil físico y flujo autenticado no verificados. Los archivos PDF sí se generaron, analizaron y renderizaron localmente con datos ficticios. El navegador de esta ejecución no accedió al servidor local y la ruta alternativa de accesibilidad no estuvo disponible.
- CI remoto pendiente. La rama candidata no está entre los disparadores existentes por push. No se creó ni aprobó un PR.
- No hubo despliegue, merge, ejecución SQL, datos personales reales, nuevas credenciales ni cambios de permisos o seguridad. El envío de informes mantiene el rol coach ya exigido por el cliente y el servidor; no se amplió acceso de administradores.

La candidata no constituye autorización de publicación ni certificación del comportamiento alojado.
