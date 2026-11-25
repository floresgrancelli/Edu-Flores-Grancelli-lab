# Catálogo directo en la Dieta Guía

Cada fila de la guía flexible del coach muestra Buscar alimento y Elegir alimento sin abrir Editar. En los seis horarios el selector usa el mismo catálogo de alimentos aptos para la Dieta Guía. El grupo de origen determina solo qué opciones aparecen primero. Se mantienen las exclusiones de referencias exclusivas del diario y la revisión de compatibilidad del perfil.

Elegir modifica solo la fila del borrador y recalcula las cantidades ajustables con las reglas existentes. No registra una ingesta ni publica. Agregar un ingrediente adicional o una receta sigue en Agregar alimento o receta; la ubicación de la receta solo aparece al elegir una receta. No se cambia la autorización requerida para recetas personales.

El ensayo aislado `tests/guide-inline-catalog-browser.mjs` valida el catálogo en todos los grupos y horarios, búsqueda, reordenación y sustitución sin publicar, con perfiles ficticios.
