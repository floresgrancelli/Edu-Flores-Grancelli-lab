# Mi Día — referencia aprobada por Edu, 11/11/2026

Base: producción 2f76ae568ef81bc6963e2e1760ab58dd88e23367 (PR92).
Referencia visual: approved-reference.png. Edu aprobó el concepto y exige comparación con captura REAL antes de publicar. La aprobación conceptual NO autoriza merge ni despliegue.

## Contrato visual

- Conservar negro oliva, crema, acentos oliva apagados, fotos detrás del contenido e imágenes de alimentos actuales.
- Encabezado compacto Mi Día y fecha. Resumen de energía y barras como la referencia.
- Seis solapas en grilla 3 × 2, icono y etiqueta en línea; solo una comida visible.
- Filas compactas: miniatura, nombre y cantidad, Editar a la derecha.
- Añadir alimento como acción local; no reincorporar botón gigante Registrar comida.
- Más opciones conserva sus acciones actuales.
- Una sección Herramientas del día plegada por defecto agrupa Balance restante, Suplementos, Mis recetas, Informes, Resumen semanal, Mensaje del día y Mis objetivos personales (solo roles que ya pueden usarlos).
- Comentario al coach solo donde corresponde; conservar el editor de alumnos, su texto sin guardar y su acción actual. No mostrar título vacío para coach/admin.
- Mantener menú inferior y áreas táctiles de al menos 44px; no reducir accesibilidad para forzar todo a entrar en una captura.
- La referencia tiene dos estados, NO dos escalas reales: el estado abierto debe mantener tamaños de tipografía y controles del cerrado.

## Comparación obligatoria antes de publicar

1. Capturas reales de la candidata con datos sintéticos, horario Almuerzo, pollo y arroz, a 390px de ancho. Capturar Herramientas cerrado y abierto.
2. Usar la misma escala entre los dos estados, sin comprimir la página para imitar una lámina.
3. Comparación lateral contra referencia: distribución, tamaños, márgenes, colores, miniaturas, navegación y controles.
4. Revisar también 320px y nombres largos (cinco alimentos reales de la captura de Edu como caso sintético). No ocultar alimentos ni truncar información esencial para simular menos desplazamiento.
5. Comprobar conservación de borradores, rol alumno/coach/admin y ausencia de escrituras al abrir/cerrar herramientas.
6. Mostrar las capturas a Edu y esperar aprobación visual explícita antes de publicar.

## Estado

Rama nueva desde producción: work/ncc-day-tools-preview-20261111.
Referencia y criterios preservados. Sin cambios publicados.
El Chromium local falla antes de iniciar: process_singleton_posix.cc socket() Operation not permitted. No presentar un mockup generado como captura real ni declarar comparación de navegador completada. Próximo paso: implementar en esta rama y generar evidencia por navegador de CI, conservando los seis controles existentes.
