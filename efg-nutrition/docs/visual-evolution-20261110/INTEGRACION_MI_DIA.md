# Mi Día · Primera integración de la estética aprobada

Fecha: 10/11/2026. Candidata de trabajo; **no publicada**.

## Cambio

La pantalla real `homeView()` del alumno utiliza el nuevo encabezado y dashboard carbón/lima. El resumen sigue siendo `pastelDaySummary()` y recibe los mismos valores de `dailyTotals()`, `activeGoal()` y `activeDiary()`; no se cambió ninguna ecuación ni se añadieron metas o mensajes ficticios al producto.

La fotografía usa `welcome-bowl.jpg` de la app. «Ver mi guía» abre la guía existente y solo aparece cuando hay un plan y una meta vinculada reconocida. Sin guía, el acceso lleva a los mensajes con el coach. «Registrar comida» enfoca los seis horarios existentes, sin elegir una comida ni registrar consumos automáticamente. La nueva acción hace desplazamiento inmediato para evitar que una animación de scroll interfiera con el primer toque.

Los registros, habituales, recetas, omisiones, comentarios, balance restante, permisos y accesos previos siguen disponibles. En el alumno se muestran las comidas antes de los módulos de constancia, motivación y tip; estos se conservan. La navegación mantiene las cinco entradas existentes, incluido el acceso a Ciencia. El coach/admin conservan la composición anterior.

## Alcance del tema

El tema se carga al final de la cascada y está limitado a `.ncc-student-day`, asignada solo cuando `role === 'student'` y `tab === 'home'`. Los selectores excluyen tanto el contenedor personal oculto del prototipo dual como el del espacio profesional instalado. No cambian el rol de la cuenta, las sesiones, el selector de espacios ni los permisos. Las superficies educativas de la guía, la tarjeta editorial y el panel semanal conservan sus tratamientos internos donde corresponde para mantener la legibilidad.

El CSS incluye contraste, foco visible, movimiento reducido y cuatro rangos de pantalla. Los selectores usan `:has()`; un navegador sin soporte conserva los estilos anteriores en vez de aplicar parcialmente este tema. WebKit y dispositivos físicos quedan pendientes de validación.

## Continuidad y archivos

Base productiva verificada en GitHub: `43a335386c73ad6b54f67704b458727c430d2d2f`, con PR64 (doble rol) y PR65 (administración compacta). La candidata conserva también la preview aprobada en `c1ba3710df0aaa875e5950c233e5211526e0e224`.

- `pilot/student-day-presentation.js`: encabezado y dashboard de presentación, sin I/O ni persistencia.
- `pilot/student-day.css`: estilos con alcance exclusivo de la pantalla y contexto personal.
- `pilot/pilot.js`: conexión con datos y callbacks existentes; orden visual del alumno y apertura de guía.
- `pilot/index.html`: nueva hoja de estilos y versión del entry point.
- Manifiesto y controles de identidad: se agregan los hashes exactos de los recursos nuevos y modificados. La identidad de release `ncc-pilot-3a40474052be`, los indicadores de funcionalidades y los recursos inmutables de informes se conservan. Las pruebas negativas de manifiesto modificado, HTML alterado e indicadores cambiados siguen activas.

No hay cambios de backend, SQL, Auth, almacenamiento alojado, credenciales, servicios ni costos nuevos.

## Ensayo de app completa

Se preparó una copia aislada de la PWA completa con el adaptador sintético ya existente y un transporte de prueba exclusivo del diario. `tests/prepare-student-day-visual.mjs` genera esa copia en un destino `/workspace/` separado; `student-day-visual-sdk.mjs` nunca es importado por el entry point de producción. Solo se usan cuentas `example.invalid`, un servicio en memoria y un registro ficticio en `sessionStorage` del origen de ensayo.

Este ensayo ejecuta el formulario y `saveDiary()` reales contra una respuesta sintética. **No acredita JWT/RLS, API alojada ni guardado en producción.** La aceptación profesional mostrada por el protocolo de prueba no tiene efectos legales y no se aceptó por ninguna persona real.

| Comprobación | Evidencia observada en Chrome |
| --- | --- |
| Registro inicial | Día vacío → abrir desayuno → elegir el huevo del catálogo, 100 g → «Registrar y cerrar» una vez. El formulario existente guardó una fila ficticia y el resumen mostró 148 kcal, 12,4 g P, 1 g HC y 10 g G; una comida registrada. |
| Confirmación visual | Ventana cerrada, alimento presente y cantidades reales del catálogo en la tarjeta. |
| Recarga del ensayo | Recargar y recuperar la cuenta ficticia conserva el único registro sintético de 148 kcal; no requiere duplicarlo. Esto prueba recuperación de la fixture, no una sesión alojada. |
| Guía | Abre el detalle de la guía publicada ficticia; consultar no cambia los totales. |
| Sin meta/guía | No hay porcentajes inventados; el acceso ofrece consultar con el coach. |
| Exceso | Fixture de 2.348 kcal respecto de 2.100: muestra +248 sin truncar el valor real. |
| Seis horarios | Presentes en todos los tamaños y estados revisados. |
| Tamaños | Marcos 320/390/768/1280; anchos interiores 305/375/753/1265 con scrollbar. En los cuatro, `scrollWidth === clientWidth`. |
| Coach convencional | Clase `efg-role-coach`, sin `.ncc-student-day`; composición y superficies anteriores. |
| Cuenta dual ficticia | Al pasar al espacio profesional se oculta el contenido personal y deja de coincidir el selector del tema oscuro. Volver restaura el resumen de 148 kcal. |
| Errores | No se observaron errores de JavaScript del origen local. Los mensajes de la extensión del navegador se excluyeron de esta clasificación. |

La captura `mi-dia-integrated.png` es evidencia local de la PWA sintética; no una fotografía de producción ni de un teléfono físico. No se publican capturas de usuarios reales.

## Comprobaciones de código

- `student-day-presentation.mjs`: valores del renderer original, exceso, ausencia de objetivo/guía, inmutabilidad de parámetros y escape del nombre.
- `student-navigation-contract.mjs`: 12 escenarios de roles/estados y destinos existentes.
- `guide-candidate-assets.test.mjs` + `dual-workspace-assets.test.mjs`: 10 casos de grafo, recursos inmutables, versiones, hashes y rechazos negativos.
- `version-notice-opt-in.mjs`: conserva el comportamiento de actualización menor y su identidad estricta.
- Contratos de integración del doble rol/profesional: 11 casos aprobados con la referencia histórica exacta requerida por sus fixtures. El primer intento carecía del archivo de referencia; se recuperó el commit histórico real y se ejecutaron sin modificar los contratos.
- Sintaxis de los módulos modificados y `git diff --check`.

## Pendientes

1. Revisión de la candidata integrada con Edu; la composición de referencia ya está aprobada.
2. Validación WebKit y pruebas en iPhone/Android físicos; no declarar estos entornos aprobados por las mediciones de Chrome.
3. EV-03/04/05: registro más ágil, presentación fotográfica de las comidas de la guía y sugerencias «Esto encaja con tu día». Esta entrega integra la primera pantalla y conserva los circuitos anteriores.
4. Merge y despliegue solo con GO específico del propietario.
