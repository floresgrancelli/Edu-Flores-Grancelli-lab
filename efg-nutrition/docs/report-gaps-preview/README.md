# Informe y estadísticas: diferencias respecto al objetivo

Edu aprobó la imagen conceptual el 12/11/2026 y pidió la misma visual en las estadísticas del alumno. La referencia exacta se conserva aquí. La implementación no se publica hasta mostrar capturas reales y recibir aprobación.

Una sola función deriva faltantes y excesos por fecha a partir de los registros y la instantánea de metas históricas. Los excesos no netean faltantes; los días sin datos no son ceros. Se conserva cobertura y advertencia de registros incompletos. Nunca se usa la meta actual como reemplazo de una fecha desconocida.

El PDF nuevo v4 incluye resumen y detalle; v1/v2/v3 e informes históricos sin versión de diferencias mantienen su renderizador. El alumno consulta solo su propio ID y resultados tardíos se descartan al cambiar sesión/época/fechas/vista. La vista del coach y del alumno comparte componente. No se modifica Mi Día, fórmulas, permisos ni publicación de planes.

Pruebas: contratos de fechas/cambio de metas/conflictos/ausencias/cero/serialización; PDF determinista; navegador real Chromium/WebKit 320/390, cuenta propia y respuesta obsoleta. Sin prueba física.
