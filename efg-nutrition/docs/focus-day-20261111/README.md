# Mi Día · propuesta Focus aprobada

Base: PR86, producción 9d41bea1cf548bce473b2ec77db93102d9b58fd3.
Edu revisó la propuesta visual de resumen compacto y registro con detalle en la tarjeta seleccionada. Aprobó implementarla y pidió retirar el botón enorme + Registrar comida.

Alcance: resumen de calorías consumidas/disponibles (o exceso y ausencia de meta), macros actuales frente a metas, guía en su disclosure existente, selección de horario con marca además del color y flechas/Home/End, acceso Añadir alimento en el horario. Se eliminan el botón flotante y el CTA duplicado, y la tarjeta promocional de guía. El balance detallado es plegable. Al elegir un reciente o receta, los controles existentes de cantidad se colocan en esa tarjeta; se conservan montados al cambiar listas. El menú móvil se oculta mientras la ventana de registro está abierta. Se mantienen logo, fotografías de fondo, paleta, formularios, recetas, cálculos, permisos y escritor diario existentes.

Los videos entregados son del onboarding Focus: selección por tarjetas, detalle contextual, progreso y acción principal. No muestran un registro nutricional real. No se trasladan sus estimaciones de gasto, deslizadores, promociones ni permisos de Salud.

Validación: pruebas locales de presentación, sintaxis, contratos y aislamiento; browser QA extendido para cantidad contextual, navegación entre fuentes, menú móvil, ausencia de CTA duplicado y conservación de registros. Los controles obligatorios de CI y revisión de capturas deben completarse antes de merge. No equivale a dispositivo físico.
