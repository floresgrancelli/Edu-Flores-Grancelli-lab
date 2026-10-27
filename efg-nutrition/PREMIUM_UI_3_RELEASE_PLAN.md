# EFG Nutrition Pro · Premium UI 3.0
## Diseño aprobado
Pantallas compactas con fondo blanco, tarjetas pastel (menta, azul, durazno, lila), tipografía jerárquica y avatares con iniciales. La identidad existente se conserva. Puntos de referencia: la captura de diseño pastel aprobada por el usuario.

## Arquitectura por perfil
- **Alumno:** Hoy, Planificar, Progreso, Más. Más conduce a Recetas, Suplementos, Actividad, Informes, Privacidad y Pagos. El diario NO contiene todas las herramientas apiladas.
- **Coach:** Inicio, Alumnos, Informes, Pagos. Herramientas accesibles desde Inicio. Fichas y nombres preferidos accesibles sin alterar datos nutricionales.
- **Administrador:** Inicio, Mi día, Coach, Más. Desde el inicio accede a organizaciones y cupos, pagos, informes, coach y funciones personales, conforme al modelo de permisos actual. No leer datos privados globales sin consentimiento.

## Cambios de la versión
- Reparada tarjeta de macros con HTML incorrecto.
- Pantallas independientes para planificador, recetas, suplementos, informes semanales y privacidad.
- El planificador mantiene saldos reales y simulados separados; comidas planificadas desplegables.
- Tarjetas responsivas y barra inferior de máximo cuatro destinos en teléfono, navegación lateral en escritorio.
- Vistas iniciales de coach y administrador separadas de las pantallas complejas.
- No se añadieron migraciones de base de datos ni cambios a RLS.

## Validaciones realizadas
- Compilación sintáctica de JavaScript.
- Prueba aislada de render del alumno con cuatro comidas (etiquetas details equilibradas).
- Pruebas aisladas de portadas de coach y administrador con datos ficticios.
- Prueba aislada de render del planificador: 2 secciones details equilibradas, saldos real y simulado mantenidos.
- CSS enlazado y estilos responsivos presentes.

## Pendientes imprescindibles ANTES de publicar
- Revisar capturas reales de la rama de desarrollo en Safari iPhone (375/390/430) y Android Chrome (360/412), con cuentas de demostración.
- Probar menús sin desbordes, barras seguras, botones, teclado, foco y orientación.
- E2E con alumno: registrar/eliminar alimento, favoritos, recetas, suplementos, objetivos del coach, día y planificador; confirmar persistencia.
- E2E con coach: ingreso, autorización, seleccionar alumno, objetivos, informes, publicar/rescatar informe.
- E2E con admin: ingreso, organizaciones, cupos, roles, pagos, coach de prueba y funciones personales.
- Revisar regresiones de cálculos de macros y diferencias reales/simuladas.
- Desplegar solo después de aceptación visual. Mantener Render estable hasta entonces.

## Referencias UX
Apple: https://developer.apple.com/design/human-interface-guidelines/tab-bars
Android: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
NN/G: https://www.nngroup.com/articles/progressive-disclosure/
