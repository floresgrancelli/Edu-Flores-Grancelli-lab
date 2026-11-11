# EV-04 y Mi Día — diseño compacto aprobado

Edu aprobó la maqueta lima/crema y pidió reducir fotos 30–50%. Luego extendió explícitamente el formato y opciones a Mi Día, con solapitas por horario y una comida visible a la vez.

- Mi Día: seis solapas, cantidades destacadas y registro existente con búsqueda, recientes, habituales/favoritos y recetas. Cambiar solapa no escribe alimentos. Se mantiene el horario editado durante los guardados.
- Dieta Guía: tarjetas crema, fotografías de ingredientes de 90–96 px de alto, cantidades y aportes reales, accesos a horarios; una sola apertura para el alumno. Registro explícito abre el selector existente, nunca copia silenciosamente una guía.
- Coach: controles existentes de cantidad/sustitución, búsqueda y edición; revisión y envío atómico conservados.
- Fotos: generadas con image_gen, seis ingredientes (avena, huevos, pollo cocido, yogur, manzana, arroz cocido), sin marcas ni recetas inventadas. WebP 768×512 en pilot/assets/guide. Solo IDs exactos y cantidad positiva; sin coincidencia no se muestra foto. No se infiere compatibilidad clínica de la foto.
- Prompt común: fotografía editorial de un ingrediente, primer plano, luz natural, sin otros alimentos ni medidas, no representar una ración. Se conservan originales generados; WebP es optimización de entrega.
- Fuente: producción 89e26fc18a96616f8d487d6eb90fdbeef755e92d. No se cambian fórmulas, permisos, consentimiento, horarios configurados ni publicación.

Validación local: sintaxis JS y 15 comprobaciones de activos y cantidades aprobadas. CI de navegadores pendiente; no afirmar publicación hasta verificar despliegue y bytes públicos. Ensayos ficticios no equivalen a teléfonos físicos ni sesión alojada real.
