# COACH-GO-01 · Alcance de lanzamiento / Carla después del GO / restauración segura
**Decisión del propietario: 30/10/2026 · PR #37 DRAFT · SIN PUBLICAR**

## Decisión expresa
- **Carla no bloquea la Gran Actualización de EFG Nutrition Coach.** La habilitación de su cuenta existente se hará **DESPUÉS** de publicar y verificar el producto base, por una operación posterior, expresa y auditada desde el panel del propietario Admin EFG.
- Rol elegido: **coach piloto**, nunca «administrador secundario». Una coach debe ver sus alumnos, su propia sección **MI DÍA** y sus recursos, pero no organizaciones ajenas, licencias de terceros, pagos globales ni controles administrativos generales.
- Mantener **COACH_PILOT_PROMOTION_ENABLED=false** durante el lanzamiento principal. **No basta con cambiar el flag**: la RPC y la auditoría siguen en SQL STAGING-ONLY; antes de habilitar se requiere migración verificada en esquema alojado, backup/restore, prueba con JWT real, confirmación de la identidad y consentimiento de Carla al cambio de rol, y acción manual de Admin EFG.
- Esta operación preservará el **mismo auth UID, email y registros históricos** de MI DÍA (pesos, diarios, recetas, habituales, metas, mensajes, pagos y consentimientos históricos); no se fabricará una cuenta nueva. Su nueva organización será piloto/gratis con **10 cupos totales entre alumnos activos e invitaciones pendientes**, rechazando el 11.º en servidor.
- No se cambia cuenta real, organización ni rol antes del GO de la operación posterior. **No habilitar rol admin** como atajo: ello permitiría acceso transversal incompatible con el principio de mínimo privilegio.
- Si la actualización de Nutrition Coach sale antes de implementar la migración posterior, **Carla continuará siendo alumna** hasta que la función se habilite en una actualización administrativa posterior. No prometer un botón operativo si la RPC aún no está desplegada.

## Alcance obligatorio de la Gran Actualización principal
- Prioridad: experiencia **alumno + coach + admin EFG**; fichas versionadas para alumnos existentes y nuevos, aceptación separada de Términos/Privacidad, autorización de compartir independiente, cálculo y guía revisada por coach, diario de 5 comidas, habituales, autocompletado, reportes Luxury Pro humanos y en celeste, notificaciones, pagos, permisos, Android/iPhone/PWA.
- **No se puede considerar GO** con la ficha de relanzamiento sin activar o con textos legales incompletos. Las banderas OFF actuales son protección, no evidencia de que el relanzamiento ya funciona.
- **No forma parte del GO principal:** conversión real de Carla; expansión comercial de licencias; Nutrition Autogestión; tratamiento/semáforo clínico de SIBO, intolerancia a lactosa u otras condiciones médicas **hasta autorización jurídica y clínica específica**. Estas funciones deben seguir OFF y no recoger datos sensibles reales.
- Para alimentos sin evaluación clínica, no representar colores «permitido» o «prohibido» como indicación sanitaria.

## Restauración: hechos verificados sin tocar datos
- Proyecto hospedado `cyjvddhimbsfipjfctsl`, PostgreSQL 17, estado ACTIVE_HEALTHY al consultar el 30/10/2026. `list_branches` devolvió ninguna rama de staging.
- Documentación Supabase vigente consultada 30/10/2026: Pro conserva hasta **7 días de backups diarios**; es preciso comprobar backups realmente disponibles antes de asumir recuperación. Una restauración directa sobre el proyecto principal implica indisponibilidad y riesgo, **no usarla como simulacro**.
- El backup PostgreSQL contiene **metadatos de objetos de Storage, no los archivos**; guardar/verificar/restaurar los bytes reales y políticas privadas por separado. No dar el GO con solo tablas `storage.objects`.
- La opción «Restore to a New Project» replica BD/Auth pero **no archivos Storage, Edge Functions ni configuración completa** y puede crear costos adicionales; se exige consentimiento previo y una estrategia específica para protección de datos sensibles. Una rama Supabase tampoco se debe suponer copia fiel de datos.
- La conectividad disponible aquí permite auditoría de catálogo y pruebas **locales con datos ficticios**, pero **no acredita descarga y restauración de un backup alojado ni de los archivos reales**. Evitar subir backups personales a GitHub/CI/logs.
- Para un entorno aislado aprobado: inventariar firmas de 15 tablas y 19 RPC `SECURITY DEFINER`, revisar Auth, RLS, roles A/B con JWT firmados, comparar conteos/huellas sin exponer información personal, verificar objetos privados de Storage y recuperación de recibos, practicar rollback y pruebas físicas.
- No crear proyecto/branch pago, importar datos reales a un CI compartido, cambiar Supabase alojado, aplicar migraciones alojadas, fusionar PR o desplegar Render sin aprobación explícita.

Fuentes Supabase:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/storage/management/download-objects

## Próximas acciones priorizadas
1. Preparar y ejecutar un **restore fiel y protegido** cuando exista medio seguro autorizado, incluyendo Storage, con coste explícito.
2. Cerrar matriz de autorización **dinámica** de las 19 RPC alojadas, 2 organizaciones, estudiantes, coaches, admin, revocación y roles inactivos. Un MD5 de definición NO prueba autorización.
3. Completar integración y QA real de ficha nueva, documentos legales generales y publicación atómica de guía, SIN datos clínicos.
4. UAT iPhone/Android físicos, PWA, PDF real, comprobantes, historial y recuperación.
5. Nueva ejecución 5/5 CI sobre SHA final; dueño autoriza GO principal. Después, segundo GO específico para promoción piloto de Carla.

**Estado: NO GO de publicación principal. Conversión de Carla: POST-GO, NO BLOQUEANTE.**
