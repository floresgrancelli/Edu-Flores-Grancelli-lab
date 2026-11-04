# Nutrición Con-Ciencia — GO mínimo para Gran Actualización PILOTO
**Decisión del propietario: 02/11/2026. PR42 DRAFT. Prioridad: liberar piloto privado con seguridad; NO MERGE/NO DEPLOY sin GO expreso.**

## Principio
Se conservan las **55 mejoras aprobadas** y todo código/historial. Que un requisito exista o ya esté implementado no significa que deba repetirse una auditoría exhaustiva antes del piloto. Sólo el **camino crítico funcional y de seguridad** bloquea el GO. Lo demás conserva su implementación actual, con ampliaciones, documentación y QA profunda para después. Esta decisión reemplaza como *criterio de priorización* los 55 marcadores «BLOQUEA GO» históricos; NO borra los registros originales ni autoriza saltar controles de seguridad.

### 1. Camino crítico: NO publicar si falla cualquiera
1. **Ingreso y privacidad PILOTO (01-01/02/03/04/06, 01-07)**: dos textos adecuados al piloto, NO necesariamente contratos comerciales definitivos; responsable, domicilio/contacto y conservación reales, versión + hash; casillas independientes sin marcar y recibos persistidos, autorización separada y revocable al coach. Ficha general sin datos de salud; existentes/nuevos conservan historial. No pasar a MI DÍA sin autorización y publicación verificadas. Los borradores con marcadores NO PUBLICAR se siguen rechazando.
2. **Coach y publicación (02-01/02/02-03/02-04/02-05/02-06)**: cola, cálculo, objetivo + guía editables de cinco comidas, catálogo efectivamente seleccionado y con evidencia válida para los alimentos que se publiquen, publicación atómica/idempotente con revisión vigente, revocación, aviso único y rollback. **No exigir homologación de los 537 alimentos para abrir el piloto**, pero no permitir que el servidor apruebe un alimento no cotejado: cada ID elegible para nueva guía requiere coincidencia por preparación, unidad y fuente; el resto continúa estimado/no aprobable o fuera de la selección nueva hasta validación. Pechuga asada USDA ≠ pollo genérico; 100 g leche ≠ 100 ml sin conversión cotejada.
3. **Seguridad y continuidad (10-01/10-03/10-05)**: resolver 9 negativos conocidos de preflight hosted (RLS dueño, sharing independiente y fuente URL/documentos/revisión); migraciones ordenadas SEC09→OPT01→URL→COACH119 probadas con JWT A/B, dos organizaciones, deslogueo/cambio de sesión, restauración de estado y legado sin borrar. **Probar en staging fiel autorizado antes de cambiar hosted**. CI Seguridad/Premium/PG17/Auth/Visual 5/5 sobre el **SHA de release**, y consentimiento explícito del propietario.
4. **MI DÍA sin pérdida (04-01/02/03/04/04-05, 09-02)**: primer alimento al primer toque, sushi en piezas, habituales múltiples después de reabrir, guardado diario real por usuario/fecha, recuperación sin duplicados, teclado y scroll básico Android/iPhone, aislamiento de sesión, mantener datos previos. Pruebas mínimas reales en iPhone, Android/Gboard y desktop/PWA para ese camino; no repetir exhaustivamente otros módulos estables.
5. **Experiencia de corte (08-01/08-02, 09-03/04/05, 10-04)**: ocho pantallas educativas y pestaña visibles en rol, reautenticación/OTP y novedades una vez, cierre de sesión sólo cuando el relanzamiento firmado lo exija; nunca forzar reload o publicar banderas antes de backend listo.

### 2. Mantener existente, comprobar sólo NO REGRESIÓN para GO
- Patrón keto/ayuno y restricciones generales ya implementados (03-01/02/05), sin prescripción médica.
- Coach MI DÍA/cupos, comunicaciones, informes, pagos y panel admin que ya funcionan: **no refactorizar**, sí un smoke/roles para impedir pérdida de privacidad, datos y transacciones (02-07, 05-01/02/03, 06-01/02, 07-01/02/03).
- Catálogo regional, recetas, sustituciones, pasos, barras, textos y marca: mantener visibles y revisar solamente que no rompan el flujo central (03-06, 04-06/07/08, 08-03/04/05/06/07/08, 09-01/06).

### 3. POST Gran Actualización: NO bloquean el piloto
- Módulo clínico sanitario, diagnóstico, SIBO, lactosa, celiaquía/alergias y semáforo clínico: 01-05, 03-03/04. Flags **OFF** y sin datos sensibles. No etiquetar verde/rojo sin revisión por alimento/porción.
- Autogestión/Personal y promoción de Carla a coach (misma cuenta, diez cupos), comercialización, facturación avanzada.
- Revisión jurídica comercial formal completa, exportación/restauración INTEGRAL de DB/Auth/Storage desde Mac y ensayo completo (10-02), **sin confundir con el mínimo pre-GO de comprobar backup reciente, snapshot/rollback y protección de comprobantes privados**.
- Extensión del corpus USDA/Argenfoods/fabricantes a los 537 alimentos y QA nutricional profunda; jamás sustituir datos genéricos con ficha de otra preparación.
- Perfeccionamiento visual y QA exhaustiva adicional: ilustraciones/72 tips, fechas de ñoquis, gráficos históricos ampliados, pasos extremos, todos los casos de dieta, notificaciones opcionales, PDFs estéticos y pruebas cosméticas. Se preserva la función ya integrada.

### 4. Orden de ejecución único (sin vueltas)
**P0** Consolidar PR42 → candidato con SHA estable y cinco CI del mismo SHA; no mezclar PR37/41 concurrentemente.

**P1** Preparar identidad/contacto/retención del piloto y dos documentos versionados para aprobación. El repositorio no tiene todavía esos datos reales; nunca inventarlos.

**P2** Resolver los 9 preflight en staging aislado, con COACH119 y JWT reales ficticios A/B; aprobar fuentes de **un catálogo inicial concreto elegido por coach** (no automáticamente los 537), mantener resto sin aprobación.

**P3** E2E de persona nueva y existente (OTP→2 aceptaciones→ficha→compartir→coach→5 comidas→publicación→MI DÍA); probar una revocación y rechazo cross-org, y preservar históricos.

**P4** UAT mínima de teléfonos iPhone/Android Gboard/PWA y desktop; primer alimento, sushi, habituales, mensajes, pagar/ver comprobante sin mutar datos productivos. Verificar estado/fecha de backup de DB y copia segura de Storage; aprobar reversión.

**P5** Cinco CI 5/5 del HEAD **final** y autorización GO expresa de Edu. Sólo entonces merge, despliegue y activación escalonada de flags del piloto con verificación real.

## Evidencia objetiva al decidir
- PR37 DRAFT HEAD 0234da0; PR41 DRAFT 18c7bec; PR42 QA 2117e1b2 con cuatro CI terminados y Visual aún corriendo al redactar.
- Render LIVE **9000e4d8**, prod NO modificada. Supabase hosted healthy, COACH119 y documentos piloto todavía no instalados; 9 comprobaciones preflight pendientes; se habían registrado 0 fuentes aprobadas. CI local y visual aislado **no equivalen** a QA sobre hosting o teléfonos.
- Respaldo restaurable completo DB/Auth/Storage **NO probado**; diferido por propietario, pero un backup fechado + integridad/protección de Storage siguen siendo una salvaguarda mínima antes de GO.

**Prohibiciones:** no activar los switches clínicos ni Personal, no acceso a datos reales para UAT, no fingir E2E hosted, no crear staging pago sin autorización, no merge/deploy/RLS productivos antes de GO explícito.