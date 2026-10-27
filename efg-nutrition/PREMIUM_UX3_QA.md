# EFG Nutrition Pro — Premium UX 3.0 — Criterios de aceptación

## Fuente de diseño
Referencia aprobada: dashboards móviles minimalistas, tarjetas pastel grandes, contraste alto, tipografía clara, cuatro destinos máximos en navegación inferior. Mantener identidad EFG. **No publicar por cumplir solamente un parseo JavaScript.**

## Alumno
- [x] Inicio no presenta el planificador completo ni listados de recetas y suplementos.
- [x] Barra real de calorías registradas con objetivo aprobado, sin confundirla con calidad nutricional.
- [x] Seis comidas en tarjetas plegables; botón rápido «Registrar alimento» con selección de comida.
- [x] Destinos separados: hoy, planificador, progreso y más (recetas, suplementos, informes, privacidad y actividad).
- [x] Las simulaciones del planificador no modifican el diario hasta registrar explícitamente.
- [x] Consentimiento pendiente visible sin impedir el registro personal.
- [ ] Verificar selección/registro/edición y suplementos con una cuenta de alumno real, incluidas fechas y guardado en Supabase.

## Coach
- [x] Portada breve con alumnos, avisos y cuatro accesos visuales.
- [x] Lista completa separada, búsqueda y filtros; avatar de iniciales y nombre preferido local.
- [x] Ficha individual con peso y objetivos plegables.
- [x] Herramientas de cálculo e informes fuera de la portada.
- [ ] Verificar acceso real a un alumno autorizado, revisión y aprobación de informe semanal.
- [ ] Confirmar que las actualizaciones de metas únicamente las efectúa el coach y que RLS cumple el modelo de permisos.

## Administrador
- [x] Portada breve con accesos a alimentación personal, coach de prueba, informes, organizaciones, pagos y más.
- [x] Gestión detallada de organizaciones separada de portada.
- [x] Sin visibilidad administrativa automática sobre diarios nutricionales no autorizados.
- [ ] Verificar cada destino, incluida la administración comercial, con el administrador real.

## Diseño y seguridad de lanzamiento
- [x] Archivo premium-system.css carga al final para priorizar los estilos nuevos.
- [x] Cuatro pestañas inferiores para alumno y administrador; cuatro para coach.
- [x] Cambio de pantalla devuelve desplazamiento al inicio.
- [x] Módulos JS con sintaxis correcta; vistas principales probadas con datos ficticios.
- [ ] Capturas reales y prueba de interacción en Safari iPhone (ancho 375/390/430 px).
- [ ] Capturas reales y prueba de interacción en Chrome Android (ancho 360/412 px).
- [ ] Revisar teclado, desplazamiento, áreas seguras, mínimo 44 px en acciones primarias y tamaños de texto.
- [ ] Comprobar funciones con dos cuentas de prueba sin alterar datos reales.
- [ ] Aprobar visualmente en móvil **antes** de fusionar con efg-nutrition-app y desplegar en Render.

## Fuera de alcance del lanzamiento visual
Fotos de perfil y cualquier tabla de fotos en Supabase. Se mantienen avatares con iniciales. El nombre preferido del coach se guarda localmente hasta implementar sincronización deliberadamente.
