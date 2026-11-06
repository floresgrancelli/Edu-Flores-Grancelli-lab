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
