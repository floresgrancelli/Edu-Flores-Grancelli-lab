# PDF de período: QA de navegador de la candidata

## Ejecución aislada

`node efg-nutrition/tests/period-report-browser.mjs` y
`EFG_QA_ENGINE=webkit node efg-nutrition/tests/period-report-browser.mjs` usan
Playwright 1.56.1 y los navegadores que ya instala `efg-nutrition-visual-qa.yml`.
No requieren otro paquete, navegador, permiso, credencial, backend ni deploy.

El fixture sirve exclusivamente archivos locales y datos ficticios. Extrae los
helpers, el panel, los handlers y los listeners de edición/revisión directamente
de `pilot.js`, con marcadores únicos que fallan si desaparecen. Importa el
renderer PDF versionado, el constructor de informes, las lecturas de objetivos y
el cliente de historial reales. Solo el transporte se reemplaza por RAM. La
entrada de clics es un adaptador del fixture; no se presenta como una prueba de
login, RLS ni del arranque completo de la aplicación. No modifica los módulos de
producción. Para carreras asíncronas se demora la dependencia del renderer real,
sin sustituir los bytes que produce.

## Cobertura y evidencia

En Chromium y WebKit, con anchos 390 y 1280:

- Generar desde registros ficticios y revisar el borrador HTML accesible real.
- Abrir un Blob `application/pdf` auténtico en el diálogo; comprobar iframe,
  enlaces abrir/descargar, destino y controles, sin envío automático.
- Descargar mediante el navegador y verificar cabecera, EOF, xref, catálogo,
  fuentes embebidas, versión del renderer y múltiples páginas.
- Exigir revisión explícita; cerrar o editar revoca revisión y URL; la edición
  cambia los bytes; cierre vuelve a enfocar el botón que abrió el diálogo.
- Enviar desde el diálogo con el cliente real contra RAM: persistir exactamente
  el JSON del snapshot revisado y evitar publicaciones duplicadas.
- Cambiar al alumno, consultar su historial real, abrir su PDF de solo lectura y
  comprobar snapshot/version y descarga byte a byte iguales al coach.
- Ignorar respuesta de generación tras cambio de alumno; dos aperturas dejan una
  sola URL activa; cerrar durante generación no resucita diálogo o aprobación.
- Rechazar cualquier solicitud de red externa, incluidas CDN y backend.

`artifacts/period-report-pdf/` contiene PNGs del diálogo y HTML, PDFs realmente
descargados, JSON del snapshot ficticio, hashes SHA-256 y resultados por motor.
Si falla, conserva el último PNG y un JSON del error, además de resultados
completados. El workflow conserva esa carpeta incluso ante un fallo.

**Límite explícito:** el visor PDF nativo puede no pintar el documento en
headless. No se exige ni se certifica su render visual nativo. Las capturas
validan el diálogo/controles y el HTML; los archivos descargados verifican PDF
real y equivalencia exacta. Los PNGs del diálogo no reemplazan la revisión visual
del PDF renderizado por un parser/visor independiente. Tampoco equivalen a una
prueba en un iPhone/Android físico.

`node efg-nutrition/tests/period-report-browser.mjs --check-fixture` comprueba
únicamente sintaxis y extracción de código real sin lanzar ni instalar
navegadores. Un PASS de ese modo no acredita pruebas de navegador. El PASS de
Chromium/WebKit se informa solo tras ejecutar el CI en el SHA candidato exacto.


## Diagnóstico adicional del visor Chromium

El log del run 42211427515 muestra ambos binarios ya instalados:
`chromium-1194` y `chromium_headless_shell-1194`. El test selecciona ahora
`channel: 'chromium'` solo para Chromium, sin nuevas instalaciones ni cambios de
workflow, aplicación, seguridad o permisos. Playwright documenta que headless
sin canal utiliza el shell y que el canal Chromium completo incluye el visor
PDF: https://playwright.dev/docs/browsers#chromium-new-headless-mode y
https://github.com/microsoft/playwright/issues/33566.

Antes de la primera captura, el diagnóstico espera la carga del iframe y toma
capturas del propio iframe hasta observar píxeles del color de portada o agotar
un presupuesto acotado de 10 segundos. No es una espera ciega ni modifica el
PDF/DOM del visor. Guarda `*-native-iframe.png` y `*-native-viewer.json`.
Si carga o señal visual no se confirman, registra `native-display-unconfirmed`;
no lo transforma en PASS nativo. La señal de color permite detectar que ya no
está en blanco, pero no certifica textos, todas las páginas ni dispositivos
físicos. La conclusión visual exige inspeccionar la captura y sigue separada
del PASS funcional/bytes. WebKit Linux conserva la limitación explícita respecto
de Safari/iOS y no ejecuta este diagnóstico Chromium.


## Blob local y red en WebKit

El run 42212720569 de `cc2f381` completó Chromium390/1280 y WebKit falló en
`fetch(view.url)` con `TypeError: Load failed`. El fixture anterior rechazaba
cualquier URL que no empezara con el HTTP local, por lo que también rechazaba
un Blob local si el motor lo pasaba por interceptación. El log no incluía las
URLs interceptadas: esa causa debe confirmarse con la siguiente ejecución.

El guard conserva el bloqueo de toda red externa y permite únicamente el HTTP
local y `blob:` del mismo origin (incluido su puerto efímero). Usa
`route.continue()`, nunca una respuesta PDF fabricada, y no restaura blobs
revocados. Se mantienen las comprobaciones reales de fetch, MIME, descarga,
bytes exactos y fallo de fetch tras revocación. Los archivos `*-network.json` y
el JSON de fallo conservan URLs locales interceptadas, solicitudes bloqueadas
y fallos de red para distinguir el fixture de un problema real del navegador.
Esta corrección no implica que WebKit haya pasado: requiere el nuevo CI.
