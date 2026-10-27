# EFG Nutrition Pro — preparación de lanzamiento de etapas 1 y 2
Fecha: 2026-10-27
Rama de trabajo: `efg-nutrition-etapas-1-2-dev`
Rama publicada: `efg-nutrition-app`
Estado: **CANDIDATA NO VALIDADA — NO PUBLICAR AÚN**

## Funciones incorporadas en desarrollo
Etapa 1: múltiples comidas habituales con importación del almacenamiento anterior, respaldo en la cuenta, recetas propias pesadas, cálculo de macros por porción, registro de recetas y búsqueda de alimentos.
Etapa 2: búsqueda de alumnos, indicadores descriptivos de 7 días, borrador semanal editable, publicación explícita por coach, consulta de informes dentro de cuenta de alumno, historial de objetivos.

**Límite conocido:** el borrador semanal utiliza reglas descriptivas. No existe aún integración demostrada con un servicio de IA generativa ni evaluación científica de recomendaciones personalizadas. No anunciar como “informe analizado por IA” hasta implementarlo y validarlo.

## Dependencias — aplicar únicamente tras respaldo y aprobación
1. `migrations/etapas12_habituales.sql`
2. `migrations/etapas12_recetas.sql`
3. `migrations/etapas12_informes_semanales.sql`
Las tres requieren revisión de RLS, prueba de migración en entorno aislado y verificación de SELECT/INSERT/UPDATE/DELETE bajo cuentas diferentes.

## Pruebas de aceptación obligatorias
- [ ] Login alumno y coach con cuentas de prueba; datos reales intactos
- [ ] Guardar dos habituales por horario; repetir uno y verificar macros sin duplicar
- [ ] Migrar favoritos de Safari sin duplicados y recuperarlos desde otro dispositivo
- [ ] Crear receta con 3 ingredientes, verificar suma kcal/P/HC/G/fibra y división por porciones
- [ ] Registrar 1.5 porciones; recalcular diario y eliminar receta sin borrar registros previos
- [ ] Buscar “granola” y variar opciones en iPhone Safari y Android Chrome
- [ ] Repetir rutina merienda proteína→hidratos→cena; comprobar saldo real versus simulación
- [ ] Coach ve solo alumnos autorizados; no ve datos tras revocación
- [ ] Informe semanal con 0, 1 y 7 días registrados; no contabilizar ausencia como cero
- [ ] Pesajes faltantes y datos insuficientes: sin inferencias fisiológicas indebidas
- [ ] Editar borrador, aprobar y consultar informe desde cuenta del alumno
- [ ] Probar intentos de acceso cruzado a informes/recetas/habituales entre dos alumnos
- [ ] Verificar histórico de objetivos y fecha efectiva del objetivo usado en los promedios
- [ ] Revisar entrega semanal, privacidad, consentimiento y acceso de entrenadores de prueba
- [ ] Aplicar lint/parse y pruebas de integración de base de datos
- [ ] Ensayar rollback de despliegue y respaldar esquema y datos

## Orden de publicación posterior a la aprobación del propietario
Respaldo → migraciones con RLS verificadas → tests con usuarios de demostración → publicación rama validada en Render → pruebas móviles y de roles → revisión de registros → confirmar estado live.
No actualizar la rama pública ni disparar Render hasta autorización expresa del usuario.

## Riesgos pendientes
- No hay base de datos aislada configurada para pruebas completas.
- Generación inteligente por IA y validación de informes aún pendientes.
- La interfaz de creación de recetas usa diálogos nativos del navegador; revisar UX móvil.
- El informe semanal actualmente usa un período móvil de siete días; definir corte semanal estable antes de habilitar su entrega automática.
