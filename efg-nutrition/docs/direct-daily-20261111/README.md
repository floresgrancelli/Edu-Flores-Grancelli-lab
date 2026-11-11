# Registro directo y trabajo compacto · 11/11/2026

Base: producción PR79, 6201c0778e1271fb1bfb2d59e8ab0338705618c8.

Bloque solicitado por Edu en su captura:
- Mi Día: bienvenida y guía compactas; acceso persistente «Registrar comida» que abre el selector existente, con horario editable y Recientes/Habituales/Mis recetas. También disponible en diario propio de coach/admin. Abrir o cancelar no guarda.
- Mis alumnos: cupos plegados para acercar la búsqueda, filtros de pendientes/fichas/planes, nombre preferido incluido en búsqueda, acción contextual según información verificada. Estado desconocido no se presenta como pendiente confirmado; la ausencia de ficha voluntaria no impide preparar el plan. Opciones administrativas plegadas.
- Editor de Dieta Guía: alimento y cantidad en una fila; sustituciones y quitar dentro de Editar, catálogo completo dentro de Agregar o reemplazar. Controles permanecen montados. Sin cambio de fórmula, permisos ni publicación atómica.

Validación: controles de interfaz y contratos locales; navegador local bloqueado por socket EPERM. Las pruebas de navegador se ejecutan por CI con datos ficticios, incluidos no escritura al abrir/cerrar, estados pendientes verificados, filtros, preservación de cantidades y disposición de controles. Publicación pendiente hasta completar controles y revisión visual.
