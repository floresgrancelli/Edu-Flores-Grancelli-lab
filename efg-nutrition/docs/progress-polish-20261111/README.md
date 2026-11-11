# Tres mejoras aprobadas · 11/11/2026

Base publicada: PR77, `57dbbf270857329512eb57f46487d7890e14b17d`.

- Pulido móvil: solapa «Comidas» en el ingreso y texto oscuro legible en las tarjetas de cupos. Conserva las cuatro etapas y sus campos.
- EV07: tarjetas de días con registros, comidas registradas y última fecha, según el período 7/30/90 días existente. Usa el historial guardado, deduplica fechas y respeta comidas omitidas. Incluye registros de suplementos en días registrados, sin contarlos como comidas. Sin rachas obligatorias, puntuaciones de salud ni proyecciones corporales. Se pueden ocultar; preferencia local por cuenta. No modifica informes ni gráficas.
- EV08: conserva las seis fotos propias WebP compactas (90 px), carga diferida y equivalencia exacta del ingrediente. Si falla una imagen, se muestra una alternativa textual, manteniendo cantidades/acciones. Leyenda ilustrativa sin representar porciones. Avisos existentes en crema/lima con «Cerrar», foco de teclado, pausa del temporizador al enfocar y animación breve desactivada con movimiento reducido. En móvil se sitúan sobre la navegación.

## Validación

Pruebas puras de conteos reales, duplicados, fechas fuera del período, días vacíos/omitidos, suplementos y ocultación. Pruebas añadidas al circuito existente de Chromium/WebKit/Android emulado: preferencia por cuenta tras reconstruir estado, colores/anchos, cierre por toque/teclado, movimiento reducido y alternativa de imágenes. Sin cuentas, datos ni escrituras de usuarios reales. No equivale a teléfono físico ni sesión alojada autenticada.

Caché y manifiesto actualizados a `ncc-progress-polish-r1-20261111`. Publicación y evidencia final se registran en el Plan Maestro y la PR, una vez finalicen los controles.
