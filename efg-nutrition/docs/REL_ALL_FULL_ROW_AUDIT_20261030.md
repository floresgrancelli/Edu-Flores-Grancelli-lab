# REL-ALL — Nueva auditoría exhaustiva y trazable · 30/10/2026

Fuente única: https://docs.google.com/spreadsheets/d/17z_Pj8gvYSlxMIbHdJjkrVeHnZp5pVTjp2BnrXxqZqw/edit. PR #37 en rama `efg-major-integration-20261029`, HEAD de referencia `36311849f9b54423db407a345ac9bbd6bd575601`. Estado: NO GO.
**Regla:** estados anteriores son registros, no certificados de implementación, ni pruebas en dispositivos reales. Toda mejora que integra el corte debe tener código, pruebas y aceptación.
**Alcance:** Gran Actualización integral de Nutrition Coach alumno/coach/admin, no parcial. Respaldo integral en Mac, restauración y hardening adicional POST; jamás omitir autorización mínima/RLS, integridad, consentimiento clínico ni preservación de datos. Carla POST, Autogestión y tiendas POST.

## Plan maestro: inspección de cada fila

| Fila | ID | Funcionalidad | Prioridad | Estado que consta | Alcance |
|---:|---|---|---|---|---|
| 7 | SEG-01 | Prueba cruzada alumno/coach A vs B | Crítica | En curso | POST / condicionado |
| 8 | SEG-02 | Auditar 14 funciones SECURITY DEFINER ejecutables | Crítica | En curso | POST / condicionado |
| 9 | SEG-03 | Protección de rama de producción y controles obligatorios | Crítica | Implementado | POST / condicionado |
| 10 | SEG-04 | Rate limits y antiabuso del acceso OTP | Alta | Pendiente | POST / condicionado |
| 11 | SEG-05 | Almacenamiento privado de comprobantes | Alta | Implementado | POST / condicionado |
| 12 | SEG-06 | Revisar contraseñas filtradas y métodos habilitados | Media | Pendiente | POST / condicionado |
| 13 | SEG-07 | Gestión de sesiones, expiración y cierre seguro | Alta | Pendiente | POST / condicionado |
| 14 | SEG-08 | Auditoría de secretos y dependencias públicas | Alta | En curso | POST / condicionado |
| 15 | SEG-09 | Recuperación y restauración de backups | Crítica | Pendiente | POST / condicionado |
| 16 | SEG-10 | Separar staging de producción | Alta | Pendiente | POST / condicionado |
| 17 | SEG-11 | Seguridad HTTP, CSP, CORS y cabeceras | Alta | Pendiente | POST / condicionado |
| 18 | SEG-12 | Logs, alertas e incidentes | Alta | Pendiente | POST / condicionado |
| 19 | SEG-13 | Política de privacidad, exportación y borrado | Alta | Pendiente | POST / condicionado |
| 20 | SEG-14 | Blindar subida de recibos ante fallos parciales | Media | Pendiente | POST / condicionado |
| 21 | SEG-15 | Revisión roles admin, coach y alumnos con criterios mínimos | Alta | Por validar | POST / condicionado |
| 22 | SEG-16 | Mitigación de abuso y denegación de servicio | Media | Pendiente | POST / condicionado |
| 23 | PRO-01 | Motor científico para hombre y mujer, factor máximo 1,50 | Alta | Implementado | GRAN ACTUALIZACIÓN |
| 24 | PRO-02 | Evaluar calorías con tendencia real del peso | Alta | Pendiente | POST / condicionado |
| 25 | PRO-03 | Planificador de comidas restantes y porciones coherentes | Alta | En curso | GRAN ACTUALIZACIÓN |
| 26 | PRO-04 | Distinguir alertas de macros vs energía restante | Alta | Pendiente | GRAN ACTUALIZACIÓN |
| 27 | PRO-05 | Trazabilidad nutricional del catálogo | Alta | Pendiente | GRAN ACTUALIZACIÓN |
| 28 | PRO-06 | Control de suplementos sin duplicar nutrientes | Media | Por validar | GRAN ACTUALIZACIÓN |
| 29 | PRO-07 | Biblioteca Fit con fotografías gastronómicas | Media | Implementado | CONTRASTAR REL-ALL |
| 30 | PRO-08 | Ampliar recetas Fit simples y económicas | Media | Pendiente | POST / condicionado |
| 31 | PRO-09 | Interpretación de tendencias y adherencia | Media | Por validar | GRAN ACTUALIZACIÓN |
| 32 | PRO-10 | Informes semanales con cambios accionables | Alta | Pendiente | GRAN ACTUALIZACIÓN |
| 33 | PRO-11 | Panel de alumnos por nivel de seguimiento | Media | Pendiente | POST / condicionado |
| 34 | PRO-12 | Envío, recepción y aceptación de comprobantes | Alta | Verificado usuario | GRAN ACTUALIZACIÓN |
| 35 | PRO-13 | Rechazo y reenvío de comprobantes | Media | Por validar | GRAN ACTUALIZACIÓN |
| 36 | PRO-14 | Registro alimentario rápido en celular | Alta | Pendiente | GRAN ACTUALIZACIÓN |
| 37 | PRO-15 | Optimización de carga y fotos externas | Media | Pendiente | POST / condicionado |
| 38 | PRO-16 | Instalación como webapp/PWA | Media | Pendiente | GRAN ACTUALIZACIÓN |
| 39 | OPS-01 | Checklist obligatorio de publicación | Alta | En curso | POST / condicionado |
| 40 | OPS-02 | Monitoreo disponibilidad, errores y costo | Media | Pendiente | POST / condicionado |
| 41 | OPS-03 | Documentar versiones y reversión segura | Alta | Pendiente | POST / condicionado |
| 42 | PRO-17 | Guía alimentaria explicada + gramajes realistas + ajuste automático sin borrar cambios del coach | Crítica | Por validar | GRAN ACTUALIZACIÓN |
| 43 | PRO-18 | Corregir saltos y cierre involuntario de la pestaña dieta en iPhone | Crítica | Por validar | GRAN ACTUALIZACIÓN |
| 44 | PRO-19 | Centro de notificaciones persistente coach/alumno, automático sin recarga | Alta | Verificado usuario · Fase 1 | GRAN ACTUALIZACIÓN |
| 45 | PRO-20 | Chat bidireccional privado coach/alumno con avisos y permisos RLS | Alta | Mensajes probados por usuario · revisar más flujos | GRAN ACTUALIZACIÓN |
| 46 | PRO-21 | Borrador de informe todos los viernes, editable antes de compartir | Alta | Por validar | GRAN ACTUALIZACIÓN |
| 47 | PRO-22 | Permitir sustituciones del huevo en desayuno por jamón cocido, pavo, claras, yogur proteico y otras fuentes; descripción y macros dinámicos | Alta | Publicado · validar iPhone | GRAN ACTUALIZACIÓN |
| 48 | PRO-23 | Mantener Objetivos y plan nutricional abiertos pese a revalidación de sesión; preservar datos de edición y scroll | Crítica | Verificado usuario · estabilidad por ahora | GRAN ACTUALIZACIÓN |
| 49 | PRO-24 | Deslizar hacia abajo desde el tope para sincronizar sin recargar, cerrar paneles o perder borradores; avisos, mensajes y dieta | Alta | Publicado · gesto validado en iPhone | GRAN ACTUALIZACIÓN |
| 50 | PRO-25 | Aviso de nueva versión con comprobación periódica y tras pull refresh, recarga solo por confirmación y advertencia de borradores | Alta | Comprobación manual validada iPhone · alerta pendiente | GRAN ACTUALIZACIÓN |
| 51 | PRO-26 | PRIORIDAD ABSOLUTA. Biblioteca EFG sin sesgo light: zapallo/verduras; tartas de atún y verdura; sushi por pieza; pizzas, empanadas, helados, choc | Crítica | Publicado · 136 opciones nuevas · validar en iPhone y fuentes | GRAN ACTUALIZACIÓN |
| 52 | PRO-27 | Validar progresivamente macros de platos regionales, sushi, tartas, pizzas y dulces contra USDA FoodData Central/FNDDS, Argenfoods o etiquetas de | Crítica | Publicado · PR #26 LIVE 16:14 ART · 20 USDA + 6 fichas web Arcor; 103 fichas genéricas y cotejo de fuentes primaria | GRAN ACTUALIZACIÓN |
| 53 | PRO-28 | Antes de cualquier cambio de interfaz, diseñar/previsualizar, revisar capturas comparativas móviles y escritorio, verificar recorridos alumno/coa | Crítica | Regla activa · aplicar a Fase 3 | GRAN ACTUALIZACIÓN |
| 54 | PRO-29 | Sustituir estimaciones opacas de platos compuestos por modelos auditables con ingredientes, gramajes y rendimiento visible; luego validar recetas | Crítica | 13 modelos compuestos LIVE: 4 tartas + 4 pizzas + 5 sushis; rendimientos supuestos, no recetas pesadas · Safari rea | GRAN ACTUALIZACIÓN |
| 55 | PRO-30 | Diseñar tablero premium «Mi día» (sin EFG en el título de la sección) con cinco comidas: meta, consumido, restante, macros y acceso al registro;  | Alta | Diseño aprobado como sistema global para TODA la app · alumno, coach y administrador · diseño en rama/preview, NO p | GRAN ACTUALIZACIÓN |
| 56 | PRO-31 | Reutilizar comidas habituales, recientes, favoritos y frecuentes según horario; acción 'igual que ayer' con confirmación y edición de gramos ante | Alta | Propuesto · SIN IMPLEMENTAR | GRAN ACTUALIZACIÓN |
| 57 | PRO-32 | Feedback contextual por semana: tendencias de energía/macros, regularidad y peso con explicaciones de variabilidad y datos faltantes; informe edi | Alta | Propuesto · SIN IMPLEMENTAR | POST / condicionado |
| 58 | PRO-33 | Evaluar indicadores optativos de hidratación, frutas/verduras y fibra para educación nutricional contextual. | Media | Investigación · SIN IMPLEMENTAR | POST / condicionado |
| 59 | PRO-34 | Investigar texto/voz y eventualmente fotografía como ayuda opcional; el usuario confirma ingredientes, cocción, aceite y gramos; escáner de barra | Media | Investigación · SIN IMPLEMENTAR | POST / condicionado |
| 60 | PRO-35 | Migrar TODAS las interfaces de EFG Nutrition Pro al sistema visual de la segunda maqueta elegida y fondo pastel: alumno, coach y administrador; i | Crítica | PUBLICADO LIVE · Fase 3 PR #27 merge 2278aaf9 · Render dep-dbh6l9ek1f9s73ekiob0 LIVE 28/10/2026 21:36 UTC · CI 3/3  | GRAN ACTUALIZACIÓN |
| 61 | PRO-36 | Lote de alimentos del usuario en PR #28 DRAFT, NO PUBLICAR: (1) Chocolate Colonial orgánico 80% cacao, rótulo fotográfico; (2) Mi mix de frutos s | Alta | PUBLICADO LIVE · 5 alimentos + botón Extra calorías · PR #28 merge 9da9e025 · Render dep-dbh8fue1egvs73eqngg0 · QA  | GRAN ACTUALIZACIÓN |
| 62 | PRO-37 | Dos barras de lunes a sábado, ±5% ideal y ±10% cumplido, proteína ≥90%, domingo excluido del conteo y bajo criterio del coach. NUEVO: al lograr 6 | Alta | PR #29 DRAFT · dos barras implementadas en preview; recompensa «ABRIR PREMIO» solicitada y PENDIENTE de implementar | GRAN ACTUALIZACIÓN |
| 63 | PRO-38 | Eliminar el botón rosa + REGISTRAR ALIMENTO del resumen de macros y el panel posterior de seis botones coloreados. Conservar intacta la sección M | Alta | PR #29 DRAFT · SIMPLIFICACIÓN DE REGISTRO LISTA EN PRUEBA · QA SEGURIDAD, FUNCIONAL Y VISUAL 3/3 PASS · NO PUBLICAD | GRAN ACTUALIZACIÓN |
| 64 | PRO-39 | Acortar «Gestionar organizaciones» a «ORGANIZACIONES» para evitar corte/guionado en tarjeta móvil; renombrar «Mensajes de prueba» como «MENSAJERÍ | Alta | Implementado en PR #29 DRAFT · NO PUBLICADO · QA automático nuevo en ejecución | GRAN ACTUALIZACIÓN |
| 65 | PRO-40 | APROBADO por usuario: aplicar a TODA EFG Nutrition Pro (alumno, coach y administrador) la primera opción del último par de mockups: fondo piedra/ | Crítica | Implementación inicial aislada en PR #29 DRAFT · NO PUBLICADA · CI en curso | GRAN ACTUALIZACIÓN |
| 66 | PRO-41 | Celebrar seis días de lunes a sábado dentro de ±10% con ABRIR PREMIO; 6/6 ±5% otorga distinción. Comida libre domingo sólo si coach explícitament | Crítica | PUBLICADO · Render LIVE 28/10 22:52 AR · PR #29 MERGED SHA 0090ec4 · QA 3/3 PASS · Supabase nueva tabla RLS aplicad | GRAN ACTUALIZACIÓN |
| 67 | PRO-44 | Permitir 50, 100 o más alumnos por entrenador dentro del límite configurable; mostrar cupos totales, ocupados (activos + invitaciones pendientes) | Alta | PUBLICADO · PR #30 MERGED · Render LIVE 29/10 · 3/3 QA PASS | GRAN ACTUALIZACIÓN |
| 68 | PRO-45 | Solo EFG admin invita/activa coach; cupos según contratación e importe distinto por plan (precios pendientes de definición). Coach puede cobrar a | Crítica | PR #31 DRAFT · Coach MI DÍA implementado en rama · pago comercial y aprobación pendientes · NO PUBLICADO | GRAN ACTUALIZACIÓN |
| 69 | PRO-46 | Coach puede usar MI DÍA privado completo sin consumir cupo; EFG habilita manualmente coach y cupos contratados tras pago; pagos alumno→coach y co | Crítica | PUBLICADO 29/10/2026 09:16 ARG · PR #32 FUSIONADO · GitHub 3/3 PASS · Render LIVE · commit 9000e4d | GRAN ACTUALIZACIÓN |
| 70 | PRO-47 | Resolver por qué MI DÍA del admin no vuelve a cargar habituales que sí guarda. Permitir seleccionar cualquiera de hasta 20 comidas habituales por | Crítica | PUBLICADO 29/10/2026 09:16 ARG · PR #32 MERGED 9000e4d8, PERO BUG REPORTADO: habituales guardados no reaparecían. P | GRAN ACTUALIZACIÓN |
| 71 | PRO-49 | Bandeja de chats buscables para alumno/coach/admin de prueba, conversación al tocar contacto; campana flotante dorada texturizada, sin fondo blan | Crítica | PUBLICADO · GitHub PR32 MERGED 9000e4d · Render LIVE · CI 3/3 PASS | GRAN ACTUALIZACIÓN |
| 72 | OPS-04 | Verificar backups Supabase Pro y crear copias independientes cifradas de PostgreSQL, Storage, código GitHub, migraciones y configuración reproduc | Crítica | En curso · panel Supabase muestra backup reciente («3 hours ago», captura 29/10 10:18 ART); falta verificar restaur | POST / condicionado |
| 73 | OPS-05 | Separar un entorno de pruebas de producción: DB, Storage, cuentas ficticias, claves propias, configuración de Render y procesos de despliegue. | Crítica | Pendiente | POST / condicionado |
| 74 | OPS-06 | Vigilar continuidad de Supabase Pro, facturas, alertas, consumo y renovación estimada 25–26/11/2026, sin presuponer vencimiento real ni cambiar c | Alta | Monitoreo de avisos configurado · fecha exacta por confirmar | POST / condicionado |
| 75 | SEG-17 | Auditar MFA en Supabase, GitHub, Render y Google; recovery codes, responsables, sesiones y procedimiento de continuidad si el único administrador | Crítica | Pendiente · único admin de la app verificado | POST / condicionado |
| 76 | PRO-50 | Mejorar mensaje a correos no habilitados: aviso Luxury claro, sin enumeración de usuarios, botón de contacto o solicitud de invitación controlada | Alta | Auditoría de código realizada · NO MODIFICADO | GRAN ACTUALIZACIÓN |
| 77 | QA-M01 | Verificar iPhone Safari/PWA y Android reales: comidas habituales, selector primer alimento, conversaciones multirol, campana, guía y planificador | Crítica | Pendiente E2E físico · QA sintética aprobada PR #32 | GRAN ACTUALIZACIÓN |
| 78 | ARCH-01 | Declarar web/PWA como fuente funcional actual y diseñar una base compartida para web, iOS y Android (modelo de datos, reglas nutricionales, permi | Crítica | Decisión aprobada · implementación por auditar | POST / condicionado |
| 79 | ARCH-02 | Diseñar login de invitaciones y OTP, retorno a app/deep links, persistencia segura de sesión y cierre de sesión para web, iOS y Android. | Crítica | Pendiente evaluación técnica | POST / condicionado |
| 80 | ARCH-03 | Hacer prueba de concepto real con Capacitor u otra vía justificable sobre el código existente: build iOS/Android, navegación y rendimiento; evita | Alta | Investigación · NO IMPLEMENTADO | POST / condicionado |
| 81 | ARCH-04 | Preparar puentes nativos y degradación segura para notificaciones push, enlaces profundos, archivos/comprobantes, teclado, accesibilidad, almacen | Alta | Por especificar | POST / condicionado |
| 82 | GOV-01 | Mantener un único administrador EFG y titularidad del proyecto; definir futuro rol operativo con permisos mínimos, sin equivalencia con socio o a | Alta | Principio acordado · admin actual único | POST / condicionado |
| 83 | GOV-02 | Documentar onboarding técnico, acceso GitHub mínimo, ramas/PR, NDA, cesión de derechos de código, revisión independiente, acceso temporal a stagi | Media | Planificado · no contratar todavía | POST / condicionado |
| 84 | LEG-01 | Preparar política de privacidad, consentimiento por rol, derechos de acceso y eliminación, retención de datos, divulgaciones de salud y seguridad | Crítica | Pendiente revisión legal profesional | POST / condicionado |
| 85 | LEG-02 | Clasificar por separado pagos alumno→coach y licencia digital coach→EFG frente a reglas Apple/Google de compra integrada, cobros externos y revis | Crítica | Pendiente revisión de políticas actuales | POST / condicionado |
| 86 | MOB-01 | Definir publicación personal vs persona jurídica, cuentas de desarrollador Apple y Google, entidad, identidad comercial y titularidad de claves d | Alta | Decisión futura · cuentas NO abiertas | POST / condicionado |
| 87 | MOB-02 | Preparar TestFlight y prueba cerrada Google Play con usuarios ficticios/autorizados, guías visuales, métricas de fallas y revisión de experiencia | Alta | Planeado · NO IMPLEMENTADO | POST / condicionado |
| 88 | MOB-03 | Preparar iconos/logo, capturas reales, política de privacidad, clasificación, soporte, ficha de App Store y Play, proceso de revisión y mantenimi | Alta | Meta futura · sin fecha prometida | POST / condicionado |
| 89 | PRO-51 | Corregir mensajes >200, borradores, refresco sin pérdida de posición, campana ante error de red, errores OTP, accesibilidad alimentos/calculadora | Alta | CÓDIGO LISTO EN PR #33 DRAFT · GitHub CI 3/3 SUCCESS · QA real iPhone/Android y multirol pendiente · NO PUBLICADO | GRAN ACTUALIZACIÓN |
| 90 | PRO-52 | Alumno recién incorporado: acceso limitado a bienvenida, mensajería con coach, ficha inicial opcional, privacidad y soporte; sin habilitar regist | Alta | Diseño aprobado 29/10 · NO IMPLEMENTADO | GRAN ACTUALIZACIÓN |
| 91 | PRO-53 | Captura voluntaria de objetivos, edad, estatura, peso, actividad y observaciones relevantes, con explicaciones, validación, derecho a corregir y  | Alta | Diseño aprobado 29/10 · NO IMPLEMENTADO | GRAN ACTUALIZACIÓN |
| 92 | PRO-54 | Flujo coach crea borrador, configura meta y alimentos/guía, valida y PUBLICA; alumno recibe notificación y se habilitan funciones, sin desbloquea | Crítica | Diseño aprobado 29/10 · NO IMPLEMENTADO | GRAN ACTUALIZACIÓN |
| 93 | PRO-55 | EFG Nutrition Personal en misma base de app y motor nutricional: usuario sin coach configura objetivos y usa MI DÍA, recetas, macros y gráficos;  | Alta | Fase 3 aprobada como dirección · NO IMPLEMENTADO | POST / condicionado |
| 94 | PRO-56 | Vincular usuario independiente a coach y desvincular sin perder su historial; permisos explícitos por período/alcance y acceso sólo a información | Alta | Diseño conceptual acordado · NO IMPLEMENTADO | POST / condicionado |
| 95 | QA-COACH1 | Pruebas alumno nuevo sin plan, con borrador, con publicado, sin consentimiento, revocado, y alumno antiguo con plan existente (retrocompatibilida | Crítica | Pendiente · requiere staging ficticio | GRAN ACTUALIZACIÓN |
| 96 | PRO-57 | Pantalla previa para escoger «EFG Nutrition con Coach» o «EFG Nutrition Personal», con aviso claro del alcance informativo, límites de cálculos,  | Alta | Propuesta aceptada para roadmap · NO IMPLEMENTADO | POST / condicionado |
| 97 | PRO-58 | Catálogo opcional de profesionales verificados, perfiles con especialidades reales, zona, modalidad, disponibilidad y enlace voluntario; niveles  | Alta | Idea comercial aprobada como dirección · NO IMPLEMENTADO | POST / condicionado |
| 98 | LEG-03 | Revisar copy y roles: EFG es guía de registro/estimaciones, no servicio clínico; trainers ofrecen entrenamiento dentro de competencias; planes in | Crítica | Pendiente revisión legal antes de comercializar | POST / condicionado |
| 99 | PRO-59 | Crear sección «Por qué importa moverse»: recomendaciones de actividad física y fuerza, evidencia científica con enlaces a fuentes primarias, adve | Alta | Ideas y fuentes registradas · NO IMPLEMENTADO | GRAN ACTUALIZACIÓN |
| 100 | OPS-07 | Cerrar Sprint UX1 en PR #33 DRAFT: QA 3/3 en último HEAD, revisión de artefactos visuales, pruebas multirol ficticias autorizadas y pendientes en | Alta | Misión definida para Work · NO ejecutada en esta solicitud | POST / condicionado |
| 101 | PRO-60 | Incorporar contenido editorial fresco en interfaz alumno «Tip nutricional del día», con regla fija de ñoquis todos los 29 válidos del calendario, | Media-Alta | Lluvia de ideas guardada · NO IMPLEMENTADO | POST / condicionado |
| 102 | PRO-61 | Rediseñar panel coach con sección para nuevos alumnos y cola de tareas, mostrando los estados fiables de la invitación, consentimiento y objetivo | Alta | PR #34 DRAFT, interfaz Ingresos + ficha alumno / publicación UI · CI 3/3 SUCCESS · SQL sin aplicar · NO PUBLICADO | GRAN ACTUALIZACIÓN |
| 103 | PRO-62 | UI form alumno voluntario, privacidad y envío a coach autorizado; coach publica por RPC tras meta+guía aprobada; acceso nutricional completo solo | Crítica | INTERFAZ + SQL DRAFT PR #34 · CI 3/3 SUCCESS · NO PUBLICADO · migración staging/E2E/RLS QA pendientes | GRAN ACTUALIZACIÓN |
| 104 | QA-COACH2 | Pruebas staging: legacy no bloqueado, nuevo alumno pending; ficha privada/compartida/revocada; coach A no ve alumno B; solo coach publica último  | Crítica | PENDIENTE · no hay staging/E2E ni migración aplicada | GRAN ACTUALIZACIÓN |
| 105 | PRO-63 | Diseñar formulario de preferencias (vegano/vegetariano), condiciones sanitarias autodeclaradas, analíticas medidas reales (glucosa/colesterol con | Alta | Documentado en GitHub roadmap · sin UI clínica ni DB aplicada | POST / condicionado |
| 106 | SCI-01 | Calcular sodio, grasas saturadas, azúcares, potasio, calcio, hierro, magnesio, vitaminas cuando haya datos validados por marca/porción, integrar  | Alta | Investigación científica prioritaria · no implementado | POST / condicionado |
| 107 | SCI-02 | Investigar carga glucémica de alimentos cuando exista índice glucémico validado; nunca reportar mg/dL de glucemia diaria por dieta ni HbA1c/coles | Crítica | NO implementar números de laboratorio predichos · documentado | POST / condicionado |
| 108 | LEG-04 | Revisar clasificación de datos sensibles bajo Ley 25326, permisos explícitos, derecho de acceso/corrección/supresión, manejo de coaches según cre | Crítica | Revisión legal y clínica obligatoria · no implementado | POST / condicionado |
| 109 | PRO-64 | Diseñar nuevo dashboard visual con ilustraciones, gráficos y tendencias, cobertura de nutrientes validados, calidad de datos y recomendaciones ed | Alta | Diseño conceptual y objetivos guardados · NO IMPLEMENTADO | POST / condicionado |
| 110 | LEG-05 | Redactar y revisar Términos y Condiciones, aviso de alcance, política de privacidad, roles/coaches, obligaciones y derechos de usuario; aceptació | Crítica | Plan registrado · SIN BORRADOR LEGAL APROBADO · NO IMPLEMENTADO | GRAN ACTUALIZACIÓN |
| 111 | SEC-13 | Tabla/versionado auditado de aceptación T&C por usuario, timestamp/versión; bloqueo de funciones hasta aceptación validada en servidor. Separar c | Crítica | Arquitectura propuesta · NO APLICADA A SUPABASE | GRAN ACTUALIZACIÓN |
| 112 | QA-LEGAL01 | Probar alta nueva con aceptación, rechazo, versión modificada y reaceptación cuando corresponda; acceso directo API rechazado si sin aceptar; con | Crítica | Pendiente staging y revisión legal | GRAN ACTUALIZACIÓN |
| 113 | REL-ALL-20261030 | Incorporar al corte de la Gran Actualización todos los 94 puntos de control enumerados al propietario: incorporación Coach, ficha general y sanit | Crítica | En curso · alcance total aprobado, NO PUBLICADO | GRAN ACTUALIZACIÓN |
| 114 | SPORT-STEP-01 | Agregar en Deportes y Mi progreso: pasos → km aproximados según altura opcional (0,415×altura; 70 cm/paso por defecto), ritmo suave/moderado/rápi | Alta | EN PR37 · MOTOR/UI INTEGRADOS · COLUMNAS SUPABASE APLICADAS · QA EN EJECUCIÓN / NO PUBLICADO | GRAN ACTUALIZACIÓN |
| 115 | COACH115-117 | Añadir textos legales publicados versionados y validados por hash, aceptación explícita de Términos y Política de Privacidad por separado (sin pr | Crítica | HOSTED COACH115+116 APLICADOS · 0 TEXTOS PUBLICADOS / 0 ACEPTACIONES · UI CANDIDATA OFF · QA EN CURSO | GRAN ACTUALIZACIÓN |
| 116 | COACH118 | Instalar, cuando se apruebe la Gran Actualización, un control BEFORE INSERT/UPDATE en efg_daily_logs que revalide el estado firmado 'ready' y ace | Crítica | HOSTED COACH118 INSTALADO CON SWITCH OFF · REGISTROS LEGADOS INTACTOS · NO ACTIVAR / JWT E2E PENDIENTE | GRAN ACTUALIZACIÓN |
| 117 | COACH119 | Implementar backend firmado, transaccional e idempotente para que el Coach publique objetivo nutricional, guía validada de cinco comidas, ledger  | Crítica | CANDIDATA SQL EN PR37 · NO INSTALADO / NO ACTIVADO · CI SINTÉTICO EN CURSO | GRAN ACTUALIZACIÓN |
| 118 | UX35-SESSION01 | Secuencia UX-35 DEFINITIVA 29/10: PREVIEW con Entendido sin logout. Solo al tener Gran Actualización publicada y validada por servidor: REAUTH_RE | Crítica | PR37: SILENCIO VERSIONES MENORES Y CIERRE MANUAL MÓVIL IMPLEMENTADOS · FLUJO ESPECIAL OFF / PRUEBAS EN CURSO | GRAN ACTUALIZACIÓN |
| 119 | COACH120-121 / UX35 | Para todos los perfiles admitidos: PREVIEW previo con «Entendido» y NO logout; solo la Gran Actualización realmente publicada y aprobada por serv | Crítica | BACKEND COACH120/121 HOSTED APLICADO SIN CAMPAÑAS (OFF); UI PR37 FLAG OFF; CI Y E2E PENDIENTES | GRAN ACTUALIZACIÓN |
| 120 | COACH122 / UX35 | Al pasar de PREVIEW a la Gran Actualización realmente publicada, guardar la hora real de corte reauth_required_at. Para cada solicitud autenticad | Crítica | HOSTED COACH122 APLICADO Y VERIFICADO · 0 CAMPAÑAS / 0 AVISOS · NO ACTIVADO · CI 5/5 PENDIENTE | GRAN ACTUALIZACIÓN |
| 121 | REL-ALL-AUDIT-20261030 | Control de todas las 114 filas con ID de la hoja Plan maestro (7–120) y 273 controles con ID de Control QA (7–279), enlazados a PR37 y a sus esta | Crítica | AUDITORÍA FILA POR FILA REALIZADA · CÓDIGO/QA EDUCATION INTEGRADO EN PR37 OFF · BLOQUEANTES DE PUBLICACIÓN ACTIVOS  | GRAN ACTUALIZACIÓN |

**Total Plan maestro:** 115 filas con ID (corte 61, post/condicionado 53, conciliación puntual 1).

## Control QA: inspección de cada fila

| Fila | Control | Qué debe comprobarse | Estado documental |
|---:|---|---|---|
| 7 | QA-01 | Identidad | Lectura comprobada |
| 8 | QA-02 | Identidad | Pendiente |
| 9 | QA-03 | Privacidad | Pendiente |
| 10 | QA-04 | Admin | Pendiente |
| 11 | QA-05 | Pagos | Verificado usuario |
| 12 | QA-06 | Pagos | Pendiente |
| 13 | QA-07 | Pagos | Pendiente |
| 14 | QA-08 | Nutrición | Implementado |
| 15 | QA-09 | Nutrición | Implementado |
| 16 | QA-10 | Nutrición | Implementado |
| 17 | QA-11 | Recetas | Implementado |
| 18 | QA-12 | Dispositivos | Por validar |
| 19 | QA-13 | Dispositivos | Pendiente |
| 20 | QA-14 | Respaldo | Pendiente |
| 21 | QA-15 | Releases | Implementado |
| 22 | QA-16 | Nutrición | Implementado |
| 23 | QA-17 | UX móvil | Por validar |
| 24 | QA-18 | Mensajes | Mensajes funcionan según usuario · E2E completo pendiente |
| 25 | QA-19 | Notificaciones | Verificado usuario |
| 26 | QA-20 | Eventos | Por validar |
| 27 | QA-21 | Informe viernes | Por validar |
| 28 | QA-22 | Nutrición / iPhone | Por validar |
| 29 | QA-23 | UX / Coach iPhone | Verificado usuario |
| 30 | QA-24 | UX / Pull to refresh iPhone | Gesto confirmado en iPhone · sincronización pendiente |
| 31 | QA-25 | UX / Detector de versiones | Comprobación manual verificada · aviso nuevo release pendiente |
| 32 | QA-26 | Catálogo / Búsqueda | 3/3 controles aprobados · prueba humana pendiente |
| 33 | QA-27 | Datos / Fuentes | 20/20 referencias genéricas · validación de recetas pendiente |
| 34 | QA-28 | UX / Revisión visual previa | Regla activa · próximo cambio UX |
| 35 | QA-29 | Recetas modeladas / Fase 2 | CI 3/3 aprobado · Safari real pendiente |
| 36 | QA-30 | UX / Fase 3 · Mi día | Prototipo v1 responsive local QA OK · aprobación visual real + integración E2E pendientes |
| 37 | QA-31 | Fase 2 · Pizza, sushi, marcas | CI 3/3 SUCCESS · Render LIVE commit 0e26bb7 · Safari real pendiente |
| 38 | QA-32 | Fase 3 · Migración UX global | PRO-36 · QA 3/3 PASS · Chromium/WebKit 17 escenarios/85 vistas · Sandía 100g registro RAM PASS · GitHub 9da9e025 Render LIVE; Safari físico pendi |
| 39 | QA-33 | Fase 3 · Mayúsculas y contraste | Últimos cambios MI DÍA/admin/comidas/móvil en PR #27 DRAFT, commit f5e8445; QA final en curso y revisión humana pendiente. NO PUBLICAR. |
| 40 | QA-34 | UX / Admin · accesos de menú | Prueba contractual añadida; CI nueva en ejecución; Safari físico pendiente |
| 41 | QA-35 | Tema global Luxury / gráficos vivos | PR #29 DRAFT: capa de CSS y QA en ejecución, sin publicación |
| 42 | QA-36 | Premio semanal / RLS coach y visual Luxury | RELEASE QA 3/3 PASS · SHA 74b06a7 · PRODUCCIÓN LIVE 0090ec4 · RLS aplicada/negativas probadas · Safari físico pendiente |
| 43 | QA-37 | Gestión cupos laboratorio y coaches | PASS 3/3 · PR #30 MERGED · Render LIVE a1cf122 · Safari físico pendiente |
| 44 | QA-38 | Coach MI DÍA privado / licencia comercial supervisada | PR #31 DRAFT; seguridad PASS, funcional PASS, visual en curso; flujo comercial no implementado todavía |
| 45 | QA-39 | Coach personal + licencias y pagos EFG | PASS 3/3 · Seguridad, Premium y Visual (Chromium/WebKit) · LIVE 9000e4d · iPhone físico pendiente |
| 46 | QA-40 | Habituales recuperables / primer alimento iOS | PASS 3/3 · Seguridad, Premium y Visual (Chromium/WebKit) · LIVE 9000e4d · iPhone físico pendiente |
| 47 | QA-41 | Release UX mensajería, campana y contratación coach | RELEASE 3/3 SUCCESS · Render LIVE 9000e4d · SQL prueba rollback PASS |
| 48 | UX-00 | Resumen ejecutivo / alcance | AUDITORÍA PARCIAL DINÁMICA; revisión de código |
| 49 | UX-01 | Versión / evidencia de producción | VERIFICADO · SOLO LECTURA |
| 50 | UX-02 | ALTO · Mensajería / historial | CONFIRMADO POR CÓDIGO; no reproducido en vivo |
| 51 | UX-03 | MEDIO · Mensajería / borradores | CONFIRMADO POR CÓDIGO; no reproducido en vivo |
| 52 | UX-04 | MEDIO · Mensajería / búsqueda y lectura | CONFIRMADO POR CÓDIGO; impacto visual pendiente |
| 53 | UX-05 | ALTO · Campana / fallos de red | CONFIRMADO POR CÓDIGO; no reproducido en vivo |
| 54 | UX-06 | MEDIO · Acceso OTP / errores | CONFIRMADO POR CÓDIGO; entrega real NO VERIFICADA |
| 55 | UX-07 | MEDIO · MI DÍA / diálogo alimentos | CONFIRMADO en marcado/apertura; recorrido asistivo NO VERIFICADO |
| 56 | UX-08 | MEDIO · Calculadora / formularios | CONFIRMADO POR CÓDIGO |
| 57 | UX-09 | MEDIO · Recetas / coherencia móvil | MEJORA PROPUESTA, no fallo funcional demostrado |
| 58 | UX-10 | MEDIO · iPhone / teclado y legibilidad | SOSPECHA · NO VERIFICADA EN IPHONE |
| 59 | UX-11 | ALTO para publicación futura · PWA/iOS/Android | BRECHA TÉCNICA CONFIRMADA; no es caída de la web |
| 60 | UX-12 | MEDIO · Rendimiento | OPORTUNIDAD; lentitud NO DEMOSTRADA |
| 61 | UX-13 | Cobertura · Alumno / MI DÍA / metas | NO VERIFICADO EN VIVO |
| 62 | UX-14 | Cobertura · Coach / consentimiento / progreso | NO VERIFICADO EN VIVO |
| 63 | UX-15 | Cobertura · Admin / licencias / pagos | NO VERIFICADO EN VIVO |
| 64 | UX-16 | Propuesta · Sprint UX 1 | PROPUESTA · 5 días hábiles orientativos, sin ejecución |
| 65 | UX-17 | Requisitos · Base compartida web/PWA/nativa | PROPUESTA ARQUITECTÓNICA · sin reconstrucción |
| 66 | UX-18 | Requisitos · Validación móvil | PENDIENTE · no hay nuevas pruebas físicas ni emuladas |
| 67 | UX-19 | Requisitos · Tiendas y privacidad | REQUISITOS A REVISAR · NO certificación de publicación |
| 68 | UX-20 | Sprint UX 1 — PR #33 DRAFT | PR #33 DRAFT · QA AUTOMÁTICO 3/3 SUCCESS en HEAD c1f22da (Security 40892424846, Premium 40892424882, Visual 40892424836). NO PUBLICADO; QA físico |
| 69 | UX-21 | Fase Coach / Ingresos, ficha y publicación | PR #34 DRAFT · HEAD acd79130aa3b160a08cf9adba115a0bc2bcc3db8 · CI 3/3 SUCCESS confirmado 29/10: Security 40902614092, Premium 40902614251, Visual |
| 70 | UX-22 | Auditoría Coach / SQL DRAFT / seguridad | PR #34 DRAFT · HEAD 3f0c588d · Security, Premium y Visual (Chromium/WebKit) 3/3 SUCCESS en nuevo HEAD · SQL solo borrador · STAGING/E2E pendiente |
| 71 | UX-23 | Fase Coach · tests sintéticos nuevos y matriz staging | PR34 DRAFT HEAD 6990f68 · Seguridad 40908343457 y Premium 40908343484 PASS, Visual 40908343459 en curso. Fix consentimiento revocable tras public |
| 72 | UX-24 | UX1 / Privacidad al cambiar de cuenta | PR33 HEAD ab6b695 · CI 3/3 SUCCESS (Security 40906887083, Premium 40906886924, Visual 40906886974). QA visual humana E2E aún pendiente; sigue DRA |
| 73 | UX-25 | Coach / revocación ficha después de plan publicado | PR #34 DRAFT HEAD 95d727e. Seguimiento consentimientos pospublicación y borrado solo ficha añadidos; 3 historiales con org/coach verificados read |
| 74 | UX-26 | Coach · backfill histórico y borrado de ficha | PR34 DRAFT HEAD f3a14c9 (incluye diseño legal, no implementado), SQL draft backfill/borrado y caché coach con tests. CI 40913268938/40913269077/4 |
| 75 | UX-27 | Legal / consentimiento de términos y privacidad versionado | DISEÑO DRAFT EN GITHUB HEAD f3a14c9; NO IMPLEMENTADO; revisión jurídica pendiente |
| 76 | UX-28 | MI DÍA · identificación de comidas habituales | PR33 DRAFT HEAD c82a9b0 · CI 3/3 PASS (Security 40914393818, Premium 40914393809, Visual 40914393843). QA visual humana/roles y aprobación explíc |
| 77 | UX-29 | Nutrition Coach · ficha de preferencias nutricionales no clínicas | PR34 DRAFT HEAD b7b426c · Seguridad 40915501714, Premium 40915501745 y Visual 40915501760 3/3 SUCCESS (fixtures aislados). Aún falta staging SQL, |
| 78 | UX-30 | Coach SQL DRAFT · delimitadores DO de control de backfill | PR34 HEAD b7b426c · Security y Premium PASS; Visual 40915501760 en curso; ejecución SQL/E2E aún no |
| 79 | UX-31 | MI DÍA catálogo · pan común, golosinas y proteínas vegetales | PR35 DRAFT HEAD aeb8ed5: Security 40917145221 y Premium 40917145557 PASS; Visual 40917145274 IN_PROGRESS al 29/10/2026. Pendiente integración tra |
| 80 | UX-32 | Guías base Coach+Personal · patrones y restricciones seguras | DISEÑO DRAFT PR35 · no desplegado, módulo clínico/seguridad/legal pendiente |
| 81 | REL-01 | PREPUBLICACIÓN CONTROLADA · PR33 + PR35 | BLOQUEADO PARA DEPLOY: falta visual humana y CI de HEAD COMBINADO + aprobación expresa del dueño. |
| 82 | NUT-33 | Keto, Portfolio, ayuno y calculadora exclusiva Autogestión | HEAD 6aa4a5e: Security y Premium QA SUCCESS, Visual 40919900250 en curso; NO PUBLICADO. |
| 83 | ARCH-02 | Arquitectura · patrones y restricciones compartidos Coach/Personal | ALCANCE APROBADO · DISEÑO DOCUMENTADO · MOTOR CLÍNICO/ENTITLEMENT NO IMPLEMENTADO |
| 84 | NUT-34 | Semáforo compartido de alimentos por restricciones + plan · 3 perfiles | DISEÑO APROBADO 29/10 · NO IMPLEMENTADO · CI de nuevos HEAD pendiente de verificación |
| 85 | NUT-35 | SIN RESTRICCIONES = CATÁLOGO NEUTRO · semáforo NO basado en kcal/macros | DISEÑO APROBADO · NO IMPLEMENTADO · QA pendiente |
| 86 | NUT-36 | Nutrition Coach · reaprobar guía editada antes de publicar | DESARROLLO EN PR34 DRAFT · Security/Premium/Visual 3/3 SUCCESS (fixtures aislados); staging/restore PENDIENTE |
| 87 | NUT-37 | Coherencia nutricional y cantidades elegidas por el coach · guía de 5 comidas | PR34 DRAFT · cambios implementados SOLO EN RAMA · CI último HEAD pendiente · sin despliegue |
| 88 | NUT-38 | Recalcular guía completa con pesos o ingredientes cambiados | DESARROLLO SOLO EN PR34 DRAFT · Security/Premium PASS; Visual en curso (último HEAD) |
| 89 | UX-33 | Tips diarios con ilustraciones premium · «ñoquis del 29» | DISEÑO CONFIRMADO / NO IMPLEMENTADO / no publicado |
| 90 | LEG-06 | Términos y Privacidad versión 2026-10-29 · consentimiento separado (BORRADOR) | CI 3/3 SUCCESS (fixtures) · IMPLEMENTADO SOLO BORRADOR EN PR34 · NO VIGENTE NI PUBLICADO · revisión jurídica y staging pendientes |
| 91 | UX-34 | Ficha del alumno · estado privado/compartido y datos opcionales | DESARROLLO EN PR34 · 3/3 SUCCESS fixtures · NO PUBLICADO / RLS JWT pendiente |
| 92 | REL-02 | BLOQUEO PUBLICACIÓN hasta semáforo/dietas/fichas/legal completos | BLOQUEANTE DEFINITIVO · NO PUBLICAR |
| 93 | LEG-07 | Términos/Privacidad por rol y reautenticación general | DISEÑO/TEST DRAFT · NO ACTIVADO |
| 94 | UX-35 | Aviso previo y What's New premium por versión | UX35 CORRECCIÓN IMPLEMENTADA EN CANDIDATA · NUEVO CI EN CURSO · GRAN RELANZAMIENTO OFF / NO PUBLICADO |
| 95 | NUT-39 | Gate de lanzamiento · dietas y restricciones + semáforo contextual | OBLIGATORIO · NO IMPLEMENTADO · PUBLICACIÓN DETENIDA |
| 96 | REL-03 | Candidata integrada PR37 | QA AUTOMATIZADO PASS / RELEASE BLOQUEADO |
| 97 | NUT-40 | Compatibilidad compartida con evidencia | PARCIAL OFF / NO CLÍNICO |
| 98 | NUT-41 | Semáforo: no confiar en evidencia de objeto editable | DRAFT · backend y catálogo real PENDIENTE |
| 99 | UX-36 | Inspección humana de screenshots de PR37 | PARCIAL · NO QA FÍSICO |
| 100 | UX-37 | Experiencia visual premium de relanzamiento excepcional, ilustración vectorial | DESARROLLO VISUAL EN PR37 · FEATURE OFF · NO PROBADO EN DISPOSITIVO FÍSICO |
| 101 | UX-38 | Detección automática de ficha por rol/entitlement | PENDIENTE DE IMPLEMENTACIÓN / JWT |
| 102 | NUT-42 | Entrega ficha al coach y generación automática de guía con aprobación | FRONTEND PARCIAL · NO E2E · NO PUBLICAR |
| 103 | NUT-43 | Ficha del alumno → calculadora Coach precargada → guía borrador | DESARROLLO PR37 · PREMIUM Y SECURITY PASS · VISUAL QA EN CURSO |
| 104 | PRIV-04 | Compartir ficha solo con autorización de seguimiento y aviso genérico coach | TEST PREMIUM PASS · SQL SOLO DRAFT · REQUIERE STAGING Y E2E |
| 105 | NUT-44 | Evitar objetivo visible antes de aprobación atómica de guía Coach | PARCIAL EN PR37 · BLOQUEANTE DE PRODUCCIÓN · NO GO |
| 106 | SEG-17 | Supabase Advisors actuales · funciones privilegiadas y RLS | PENDIENTE DE AUDITORÍA CONTEXTUAL/JWT · NO GO RELEASE |
| 107 | REL-04 | CI definitivo de PR37 / decisión de gran lanzamiento | CI 3/3 VERDE · RELEASE NO GO (BLOQUEANTES ACTIVOS) |
| 108 | NUT-45 | Borrador de plan privado Coach · SQL STAGING ONLY | PARCIAL · DRAFT NO APLICADO · NO GO |
| 109 | REL-05 | Serotonina acuarela: splash y loader global; experiencia mayor OFF | PARCIAL · PR37 CANDIDATA · NO GO |
| 110 | NUT-46 | Reemplazar RPC legacy Coach no atómico antes de staging | ROJO · NO GO · CANDIDATA SIN DESPLEGAR |
| 111 | NUT-47 | Publicación transaccional de borradores Coach · propuesta SQL NO APLICADA | PARCIAL DOCUMENTADO · NO EJECUTADO · BLOQUEANTE ROJO |
| 112 | NUT-48 | Backend alimento/evidencia/consentimiento y SQL PostgreSQL 16 sintético | PARCIAL · POSTGRES SINTÉTICO VERIFICADO · STAGING/JWT REAL ROJO NO GO |
| 113 | NUT-49 | Interfaz Coach → borrador privado → publicación transaccional, flag OFF | PARCIAL · CÓDIGO STAGING OFF · NO GO |
| 114 | NUT-50 | Integración Coach ficha → calculadora científica → cinco comidas → borrador privado versionado | PARCIAL · 4/4 CI AISLADO APROBADO · FUNCIONALIDAD OFF · RELEASE NO GO |
| 115 | NUT-51 | Integridad post-guardado Coach y aislamiento entre alumnos/sesiones | PARCIAL FUNCIONAL OFF · 4/4 CI APROBADO · RELEASE NO GO |
| 116 | NUT-52 | PostgreSQL 17 en CI sintético y plan aislado de ensayo Supabase Auth | PARCIAL · CI 4/4 SOBRE POSTGRESQL 17 SINTÉTICO · OFF · RELEASE NO GO |
| 117 | NUT-53 | Supabase Auth local firmada y permisos Coach entre dos organizaciones | PARCIAL · AUTH LOCAL FIRMADA 5/5 CI SUCCESS · SIN QA REAL PROD · RELEASE NO GO |
| 118 | NUT-54 | Supabase local JWT: publicación completa, idempotencia, plan histórico y rollback | PARCIAL FUNCIONAL · LOCAL AUTH JWT 5/5 CI SUCCESS · FEATURE OFF · RELEASE NO GO |
| 119 | NUT-55 | Restore parcial local real y auditoría read-only de esquema y rutas legacy | PARCIAL FUNCIONAL · 5/5 CI SUCCESS MISMO HEAD · RESTORE 3 TABLAS · RELEASE NO GO |
| 120 | UX-ANDROID-01 | MI DÍA Android: scroll superior no responde salvo gesto desde abajo | PARCIAL FUNCIONAL · CI 5/5 SUCCESS · PENDIENTE ANDROID FÍSICO · CANDIDATO SIN PUBLICAR |
| 121 | NUT-56 | Esquema productivo simulado + notificaciones legacy compatibles con publicación atómica | PARCIAL FUNCIONAL · 5/5 CI SAME HEAD SUCCESS · PROD INTACTO · RELEASE NO GO |
| 122 | UX-MEALS-01 / WEEKLY-05 | Registrar desayunos, almuerzos y cenas por macro-guía + platos preparados; eliminar banda semanal 10% | PARCIAL FUNCIONAL · 5/5 CI SAME HEAD SUCCESS · PENDIENTE MÓVIL FÍSICO · RELEASE NO GO |
| 123 | UX-MEALS-01/WEEKLY-05 · CIERRE CI | CI final del selector guiado y barra única ±5% · HEAD 8aaec012 | 5/5 CI SAME HEAD SUCCESS · SOLO CANDIDATA · RELEASE NO GO |
| 124 | UX-SEARCH-02 / HABITUAL-PREVIEW-02 | Videos MacBook: buscar alimento no despliega sugerencias; habitual guardado sin detalle visible | CORRECCIÓN CANDIDATA · 5/5 CI SUCCESS · NO QA FÍSICO · RELEASE NO GO |
| 125 | NUT-57 · PREFLIGHT MIGRACIÓN INTEGRADA | Inspección de cinco módulos SQL de staging, esquema legal, RLS/notificaciones y orden de aplicación; sin migrar ni desplegar | NO GO · PREFLIGHT DOCUMENTADO · BLOQUEOS REALES CONFIRMADOS |
| 126 | UX-GUIDE-01 | Guía educativa por grupos Proteínas e Hidratos en las 3 comidas principales | 5/5 CI SUCCESS · SOLO CANDIDATA · QA FÍSICO PENDIENTE · RELEASE NO GO |
| 127 | NUT-57 FASE A · ENSAMBLADO NO EJECUTABLE Y ENSAYO DE RECHAZO | Unificar preparación de 5 SQL en una transacción de revisión fail-closed; respetar decisión lanzamiento grande único | 5/5 CI SUCCESS · FASE A STAGING REVIEW · MIGRACIÓN REAL PENDIENTE · RELEASE NO GO |
| 128 | LEG-07 / NUT-57 · BACKEND LEGAL VERSIONADO STAGING | Tablas y RPC para Términos y Privacidad por versión sin aceptaciones ficticias; JWT identity server-side | 5/5 CI SUCCESS · SOLO STAGING PG17 SINTÉTICO · RELEASE NO GO |
| 129 | LEG-07 JWT-LOCAL · PRUEBAS DE ACEPTACIÓN REAL CON GоTRUE | Ensayar backend legal versionado con sesiones GoTrue firmadas por coach/alumno, no con claims inventados, en Supabase local aislado | 5/5 CI SAME HEAD SUCCESS · LEG-07 JWT LOCAL VALIDADO · SOLO CANDIDATA · RELEASE NO GO |
| 130 | NUT-57 FASE B1 · RESTORE PRE-UPGRADE FICTICIO + MIGRACIÓN POSITIVA | Ensayar los cinco SQL de la actualización en PostgreSQL17 sobre un snapshot sintético antiguo, con RLS, backfill histórico y rollback í | 5/5 CI SAME HEAD SUCCESS · NUT57 PG17 SINTÉTICO RESTORE/ROLLBACK PASS · RELEASE NO GO |
| 131 | NUT-57 FASE B2 · CONTRATO DE COLUMNAS Y RLS EN BASE FICTICIA | Reducir diferencias de estructura entre QA ficticia y las tablas nutricionales existentes sin usar datos personales | 3/5 CI SAME HEAD SUCCESS · ESTRUCTURA FICTICIA MEJORADA · RELEASE NO GO |
| 132 | NUT-57 B3 · COMMIT FICTICIO Y RESTAURACIÓN | Probar recuperación a estado anterior DESPUÉS de COMMIT de los cinco módulos en PostgreSQL 17 aislado | POST-COMMIT RECUPERACIÓN SINTÉTICA PASS · NO GO |
| 133 | NUT-58 · AVISO ACTUALIZACIÓN PWA SEGURO | Mostrar nuevas versiones sin interrumpir diario ni perder ediciones y asegurar carga de recursos nuevos al reabrir | 3/5 CI SAME HEAD SUCCESS · AUTH/ VISUAL EN PROCESO · RELEASE NO GO |
| 134 | SEC-08 · AUDITORÍA READ-ONLY SUPABASE SECURITY ADVISORS | Evaluar funciones con privilegios elevados en public y tablas RLS sin policies antes de relanzamiento | AVISO EN REVISIÓN · 0 DDL EN PRODUCCIÓN · NO GO |
| 135 | NUT-59 · PWA ANTIGUA / JWT COACH + DIARIO ALUMNO | Validar que clientes anteriores no pueden alterar objetivos y guías ya publicados y que diario de alumno sigue aislado por usuario | 5/5 CI SAME HEAD SUCCESS · NUT-59 JWT REAL LOCAL Y PWA LEGACY RLS PASS · SOLO CANDIDATA · NO GO |
| 136 | SEC-08 · AUDITORÍA COMPLETA METADATA DE 19 RPC PRIVILEGIADAS | Revisar SECURITY DEFINER actuales y dejar matriz de roles sin modificar acceso productivo | REVISIÓN ESTÁTICA 19/19 · FALTA JWT E2E Y AUTH SETTINGS · RELEASE NO GO |
| 137 | NUT-60 · AUTOGESTIÓN / ROL PERSONAL INDEPENDIENTE | Diseñar modalidad sin coach con aislamiento de datos y sin inventar organizaciones | DISEÑO AISLAMIENTO DOCUMENTADO · IMPLEMENTACIÓN PENDIENTE · RELEASE NO GO |
| 138 | CLIN-01 · SEMÁFORO DIETÉTICO CONSERVADOR (SINTÉTICO) | Avanzar infraestructura de colores sin clasificar alimentos reales sin evidencia médica | LOGICA SINTÉTICA PREPARADA · REVISIÓN MÉDICA/FUENTES/UI PENDIENTE · NO GO |
| 139 | LEG-07 · PAQUETE PARA REVISIÓN DE TÉRMINOS Y PRIVACIDAD | Preparar revisión jurídica real de datos sensibles, consentimiento versionado y derechos de usuarios en Argentina | PAQUETE REVISIÓN REDACTADO · APROBACIÓN LEGAL Y CONSENTIMIENTO REAL PENDIENTES · NO GO |
| 140 | NUT-60 · AUTOGESTIÓN AISLADA CON REGISTRO PERSONAL Y JWT LOCAL | Implementar primer backend ficticio para usuarios Personal sin coach, con aislamiento, aceptación legal y metas propias versionadas | NUT60 AUTH LOCAL JWT Y RLS REACEPTACIÓN PASS SHA ae0900 · PG17 NO MARKER PASS · CI HEAD EN PROCESO · NO GO |
| 141 | NUT-60 / SEC-09 · BLOQUEAR ESCRITURA DE PERSONAL INACTIVO | Separación entre sesión JWT firmada aún vigente y autorización actual en perfiles servidor | AUTH LOCAL JWT PASÓ · 5/5 HEAD DOCUMENTAL POR VERIFICAR · NO GO |
| 142 | SEC-10 · OTP NO EQUIVALE A CONSENTIMIENTO DE COMPARTIR DATOS | Evitar consentimiento implícito de información nutricional y salud durante login | MITIGACIÓN EN CANDIDATA · E2E/CONSENTIMIENTOS HISTÓRICOS PENDIENTES · NO GO |
| 143 | NUT-60 · AISLAR ROL PERSONAL NO IMPLEMENTADO DE PANTALLAS ADMIN | Impedir mostrar Admin/Coach y acceso a sus flujos cuando un backend futuro devuelve role=personal | FALLBACK ADMIN MITIGADO · UI PERSONAL NO IMPLEMENTADA · RELEASE NO GO |
| 144 | NUT-60 · GUÍA PRIVADA VERSIONADA DE 5 COMIDAS (SOLO STAGING) | Crear contrato técnico independiente de guías para Personal sin Coach ni organizaciones inventadas | BACKEND BORRADOR AÑADIDO · NUEVO CI PENDIENTE · CLÍNICA Y UI NO GO |
| 145 | NUT-60 · PANEL AUTOGESTIÓN INDEPENDIENTE (LECTURA, APAGADO) | Comenzar UI propia del rol Personal sin heredar Student/Coach/Admin ni habilitar datos o recomendaciones no autorizadas | CÓDIGO INTEGRADO EN CANDIDATA · OFF · CI 5/5 SHA 92e07695 · NUEVO CI PENDIENTE · RELEASE NO GO |
| 146 | NUT-61 · FICHA PRIVADA DE AUTOGESTIÓN (DRAFT SIN GUARDADO) | Diseñar ficha completa y conservadora del perfil Personal, con diferenciación entre patrones elegidos y condiciones de salud | BORRADOR SINTÉTICO · NO CONECTADO · RELEASE NO GO |
| 147 | NUT-60 · COMIDAS PERSONAL POR GRUPOS SIN DOBLE CONTEO (OFF) | Preparar el modelo de edición futura de diario Personal con guía educativa de 5 ingestas | PREPARADO EN RAMA · OFF · CI FINAL PENDIENTE · NO GO |
| 148 | SEC-08 · AUDITORÍA DE 30 FUNCIONES PRIVILEGIADAS EN SUPABASE ALOJADA (METADATOS) | Medir exposición de funciones SECURITY DEFINER sin ejecutar RPC de negocio ni modificar usuarios | INVENTARIO TERMINADO · PRUEBA JWT DINÁMICA PENDIENTE · NO GO |
| 149 | NUT-62 · FICHA→CÁLCULO→DISTRIBUCIÓN 5 COMIDAS (OFF) | Conectar los borradores seguros de la ficha Personal con el motor científico existente sin escribir metas ni prescribir una dieta | CÓDIGO CANDIDATO PREPARADO · CI EN COLA · NO GO |
| 150 | NUT-63 · RESOLVER FALTANTES PERSONAL 1/3 MEDIA TARDE + 2/3 CENA (OFF) | Producir balance provisional entre objetivos de ficha NUT62 y registro de cinco comidas, sin duplicar platos ni recomendar cantidades n | BORRADOR PURO IMPLEMENTADO · FLAG OFF · PR DRAFT · NO GO |
| 151 | NUT-63 · QA VISUAL INDEPENDIENTE PERSONAL EN CHROMIUM/WEBKIT (OFF) | Probar visualmente panel Personal con cinco comidas, cálculo y balance, sin usuarios ni sesión ni datos médicos reales | AUTOMATIZACIÓN VISUAL AGREGADA · ÚLTIMO CI PENDIENTE · NO GO |
| 152 | COACH-RELAUNCH · PILOTOS REPITEN FICHA NUEVA AL REINGRESAR (PRIORIDAD MÁXIMA) | En actualización Nutrition Coach, todos los alumnos de prueba, incluso históricos con plan/ficha anterior, vuelven a completar/revisar  | REQUISITO DE LANZAMIENTO PRIORITARIO · CONTRATO DRAFT OFF · NO GO |
| 153 | COACH NUT64 · REINGRESO VERSIONADO DE PILOTOS Y FICHA NUEVA (STAGING/OFF) | Exigir nueva ficha nutricional Coach tras términos y privacidad vigentes al alumno piloto viejo/nuevo, sin restaurar datos compartidos  | BACKEND LOCAL DRAFT + UI OFF · JWT RERUN PENDIENTE · NO GO |
| 154 | COACH NUT64 · JWT LOCAL A/B REINGRESO APROBADO + QA VISUAL EN CANDIDATA | Certificar en entorno descartable que fichas Coach versionadas no rompen historial ni autorizaciones; preparar pantallas del relanzamie | JWT MULTIORGANIZACIÓN LOCAL APROBADO · REINGRESO AÚN OFF · NO GO |
| 155 | COACH REINGRESO · LECTURA SOLO VERSIÓN ACTUAL + VISUAL PREMIUM | Impedir que un Coach o alumno vea como actual la ficha vieja; validar vista de nueva ficha, estados legales y móvil antes de habilitar  | QA ANTERIOR 5/5 APROBADO · ÚLTIMO SHA PENDIENTE · CIRCUITO OFF · NO GO |
| 156 | COACH65 · EDICIÓN, REVOCACIÓN Y VACIADO DE NUEVA FICHA SIN PÉRDIDA HISTÓRICA | Completar los controles de privacidad de reingreso Coach para alumnos piloto después de guardar la ficha versionada. | IMPLEMENTADO EN PR DRAFT / FLAG OFF · CI 5/5 FINAL PENDIENTE · NO GO |
| 157 | COACH65 · PREFILL COACH BLOQUEA FICHA ANTIGUA / RLS EDICIÓN JWT LOCAL | Al preparar el plan con ficha recibida, no usar una versión histórica compartida ni una revisión obsoleta; validar que el alumno pueda  | TESTS JWT LOCALES APROBADOS · UI/LEGAL OFF · QA HEAD PENDIENTE · NO GO |
| 158 | COACH66 · PREVENIR PUBLICACIÓN DE PLAN BASADO EN FICHA ANTIGUA EN GRAN ACTUALIZACIÓN | Detectar y bloquear incompatibilidad entre ficha Coach nueva versionada y SQL actual de draft/publicación atómica, antes de poder publi | CONFLICTO CRÍTICO PROTEGIDO POR FLAG OFF · MIGRACIÓN REAL PENDIENTE · NO GO |
| 159 | COACH67 · PUENTE LEGAL REAL VERSIONES/HASH ACEPTACIÓN EXPLÍCITA (STAGED OFF) | Preparar el flujo Términos + Privacidad vigente desde la base con lectura completa y aceptación real, sin engañar al alumno piloto ni r | PUENTE CANDIDATO PROBADO CON DATOS FICTICIOS · FLAGS OFF · NO GO |
| 160 | COACH67 · RUTA DOCUMENTOS ACTUALES → ACEPTACIÓN → FICHA NUEVA (OFF) | Conectar paso legal versionado de Nutrition Coach sin saltear autorización ni crear consentimientos de antiguos alumnos, preservando pl | INTEGRACIÓN DE CANDIDATA PREPARADA / FLAGS OFF / NO GO |
| 161 | COACH68 · SQL PUBLICACIÓN ATÓMICA POR FICHA VERSIONADA + PG17 ROLLBACK | Eliminar incompatibilidad crítica: guardar y publicar objetivo+guía Coach mediante ficha del relanzamiento correcta, con protección con | COMPILACIÓN + CHECKS CON CLAIMS SIMULADOS PG17 APROBADOS · JWT NUEVAS RPC PENDIENTE · NO GO |
| 162 | COACH69 · GO TRUE JWT REAL LOCAL → BORRADOR VERSIONADO → PUBLICACIÓN ATÓMICA | Test crítico firmado para el circuito Coach que al relanzarse debe usar la nueva ficha de cada alumno, no la antigua, aprobar juntos ma | JWT REAL LOCAL CRÍTICO APROBADO · NO CERTIFICA PRODUCCIÓN/CLÍNICA/LEGAL · NO GO |
| 163 | COACH69 · DOS SOLICITUDES SIMULTÁNEAS CON MISMA CLAVE NO DUPLICAN PLAN | Validar doble toque/conexión inestable durante aprobación Coach y que objetivo+guía de 5 comidas no se publiquen dos veces. | CONCURRENCIA REAL JWT LOCAL APROBADA · 5/5 CI MISMO SHA SUCCESS · NO GO POR CLÍNICA/LEGAL/STAGING/UAT |
| 164 | SEC08 · INVENTARIO PRIVILEGIOS HOSTED Y 7 COMPONENTES DE RELANZAMIENTO AUSENTES | Auditar antes de actualizar Nutrition Coach: exposición pública de 19 RPC SECURITY DEFINER y 2 tablas servicio RLS sin políticas, y con | CATÁLOGO REAL AUDITADO / 19 JWT ROL PENDIENTES / 7 COMPONENTES MISSING / NO GO |
| 165 | COACH70 · 15 TABLAS HOSTED METADATA ALINEADAS / 16 FINGERPRINT HISTORIAL RESTORE | Demostrar compatibilidad de migración de Nutrition Coach con el esquema real, sin leer ni alterar alumnos, registros ni pagos alojados. | PARIDAD 15 COLUMNAS + RLS ENABLE / RESTORE SINTÉTICO APROBADOS · PARIDAD COMPLETA REAL NO GO |
| 166 | COACH71 · METADATA 15 TABLAS / 40 POLICIES / 8 TRIGGERS / 39 ÍNDICES / 38 CHECK / 27 FK Y  | Inspección estructura de Supabase hosted + gate de comparación estricta, sin datos personales, sin costo ni escritura alojada. | INVENTARIO REAL + GATE ESTRICTO PREPARADOS · PARIDAD RESTORE REAL NO GO |
| 167 | SEC08 · GRANTS/RLS + 6 RPC PRIVILEGIADAS · 30/10/2026 | Verificar escritura directa, escalada de roles y permisos de coach sin datos reales ni producción modificada. | ESTÁTICA REVISADA · RLS ESCRITURAS DIRECTAS CRÍTICAS RESTRINGIDAS · NO GO |
| 168 | COACH72 · GATE DE MIGRACIÓN RECHAZA FIXTURE INCOMPLETO · 30/10/2026 | Impedir que pase como restauración fiel una base ficticia que coincide en columnas pero no reproduce políticas, triggers, FK, índices y | NEGATIVE GATE PASS · MISMO SHA 5/5 CI SUCCESS · RESTORE HOSTED REAL NO GO |
| 169 | COACH73 · LEGAL TERMS/PRIVACY Y REVISION FICHA FAIL-CLOSED · 30/10/2026 | Evitar que dos aceptaciones del mismo tipo o un marcador de versión sin revisión positiva permitan el acceso a MI DÍA tras actualizació | 5/5 CI SUCCESS MISMO SHA · RELEASE NO GO |
| 170 | SEC-11 · AISLAMIENTO FICHA SALUD VS DATOS ADMINISTRATIVOS · 30/10/2026 | Verificar que la visibilidad administrativa de estudiantes no se convierta en lectura de ficha nutricional sensible tras revocación o s | FICHA NUEVA RESGUARDADA EN SQL CANDIDATO · RESTORE/JWT HOSTED PENDIENTE · NO GO |
| 171 | SEC12 / COACH74 · 19 RPC HOSTED INVENTARIADAS Y GATE DE PARIDAD ESTRICTO · 30/10/2026 | Identificar deriva de funciones SECURITY DEFINER reales, sus firmas y permisos antes de intentar migración Coach; sin tocar personas ni | SEC12/COACH74 BASELINE Y GATE VALIDADOS · CI MISMO SHA 5/5 SUCCESS · RESTORE REAL NO GO |
| 172 | REPORT-LUX · INFORME SEMANAL LUXURY PRO + CIENCIA + RESPUESTA A COACH · 30/10/2026 | Implementar diseño premium y análisis semanal basado en datos reales (no inferir falta de ingesta cuando faltan registros), edición/pre | REPORT-LUX E2E SINTÉTICO + VISUAL CHROMIUM/WEBKIT + 5/5 CI SAME SHA SUCCESS · REAL RESTORE / FÍSICO NO GO |
| 173 | REPORT-LUX-76 · BORRADOR COACH + PREVIEW EXACTA FAIL-CLOSED · 30/10/2026 | Evitar que un coach publique una conclusión distinta de la vista en Luxury Pro o pierda el borrador al redibujarse la pantalla; impedir | REPORT-LUX-76 · CI 5/5 SUCCESS SHA dd3ac63a · RELEASE NO GO (restore y QA físico pendientes) |
| 174 | ANDROID-QA · PIXEL 7/GALAXY Y EXPERIENCIA COACH EN CELULARES · 30/10/2026 | Comprobar que la gran actualización funcione en Android, tanto la app alumno/coach/admin como informe Luxury Pro, chat, toque, tamaño t | ANDROID EMULADO 3/3 SUCCESS · HEAD 9f216b99 CI TOTAL 5/5 SUCCESS · ANDROID FÍSICO NO GO |
| 175 | CLIN-GUT-01/02 · LACTOSA + SIBO FICHA / DIETA BASE / SEMÁFORO · 30/10/2026 | Incorporar opciones digestivas en nueva ficha Coach, guías de 5 ingestas por condición y decisión conservadora por alimento; no confund | CLIN-GUT-01/02 CÓDIGO+VISUAL 5/5 CI SUCCESS · CLÍNICA EN OFF · RELEASE NO GO |
| 176 | CLIN-GUT-03 · RPC DATOS DE SALUD SEPARADOS/REVOKE/NO REPLAY + UAT · 30/10 | Crear esquema clínico separado que no filtre diagnósticos por ficha general y pueda revocarse por alumno, previo al relanzamiento Luxur | IMPLEMENTADO STAGING-ONLY · JWT CI FINAL PENDIENTE · CLÍNICA OFF · NO GO |
| 177 | CLIN-GUT-03 PASÓ JWT LOCAL / PG17 GATE + LEG-HEALTH-01 · 30/10 | Probar datos clínicos independientes, JWT roles A/B, consentimiento y revocación; fijar bloqueo jurídico por tratamiento de salud en Ar | CLIN-GUT-03 SEGURIDAD LOCAL JWT PASS · LEGAL SENSIBLE BLOQUEADO · RELEASE NO GO |
| 178 | COACH-PILOT-10 + REPORT-LUX-77 · PROMOCIÓN CARLA Y CONCLUSIÓN HUMANA · 30/10 | Permitir desde admin EFG convertir la misma cuenta de alumno existente a coach piloto de 10 plazas, conservar MI DÍA e historial, grati | IMPLEMENTADO CANDIDATO · PG17 PASS + PREMIUM PASS · ACTIVACIÓN OFF · RELEASE NO GO |
| 179 | COACH-PILOT-10-JWT · PROMOCIÓN EXISTENTE 10 CUPOS · 30/10 | Ampliar prueba de promoción Carla desde admin con tokens GoTrue firmados reales LOCALES y verificar identidad, MI DÍA, aislamiento, per | JWT LOCAL PROMOCIÓN PASS · 5/5 CI HEAD EXACTO SUCCESS · FÍSICO/RESTORE PENDIENTES · RELEASE NO GO |
| 180 | COACH-GO-01 · CARLA POST-GO / BACKUP RESTORE Y SCOPE · 30/10 | Separar habilitación de Carla como Coach piloto posterior (NO admin) y comprobar alcance del relanzamiento sin habilitar funciones sens | NO GO · CARLA POST-GO NO BLOQUEANTE · 3/5 CI PASS AL REGISTRAR |
| 181 | SEC-13 · MATRIZ COMPLETA DE 19 RPC PRIVILEGIADAS · 30/10 | Inventariar y preparar test dinámico JWT de todas las 19 funciones SECURITY DEFINER alojadas, con roles, organizaciones, pagos y revoca | 19/19 PLAN DE PRUEBA PASS · SEGURIDAD DINÁMICA PENDIENTE · RELEASE NO GO |
| 182 | CLIN-SEM-UX-01 · SEMÁFORO ORIENTATIVO Y TEXTO LEGAL BREVE · 30/10 | Presentar semáforo como guía, mantener decisión de consumo por alumno sin negar responsabilidad legal ni asimilar color verde a garantí | BORRADOR ACTUALIZADO · CLÍNICA OFF · RELEASE NO GO |
| 183 | COACH-RELEASE-REV-01 · FICHA VERSIONADA → BORRADOR COACH · 30/10 | Impedir publicar o restaurar una dieta sobre una ficha reeditada desde otra sesión con mismo timestamp pero revisión distinta. Mantener | CAMBIO CANDIDATO + 3/4 CI PASS AL REGISTRAR · SIN DEPLOY · RELEASE NO GO |
| 184 | COACH-RELEASE-REV-02 · JWT LOCAL FICHA REEDITADA SIN REVOCAR COMPARTIR · 30/10 | Probar en backend local real con tokens GoTrue firmados que alumno puede reeditar su ficha sin revocar compartir, pero el coach NO reut | 3/5 CI COMPLETOS AL REGISTRAR · TEST JWT AUTH PENDIENTE · RELEASE NO GO |
| 185 | COACH-CI-JWT-01 · CINCO WORKFLOWS Y JWT REAL LOCAL · 30/10 | Resolver ausencia quinta batería GitHub Actions JWT; ejecutar auth real en Supabase LOCAL y eliminar carga duplicada sin modificar prod | 5/5 CI GREEN EXACT SHA · LOCAL QA COMPLETADA · RELEASE NO GO (STAGING + DISPOSITIVOS REALES PENDIENTES) |
| 186 | COACH72 · RESTORE REAL + STORAGE PRIVADO SHA256 + QA FÍSICA · 30/10 | Dar evidencia reproducible y fail closed de archivos restaurados distintos del inventario de metadatos: SHA-256 origen/destino, sin exp | 4/5 CI PASS EXACT SHA; VISUAL PENDIENTE · RESTORE REAL NO EJECUTADO · NO GO |
| 187 | COACH72-COST-01 · COTIZACIÓN SUPABASE STAGING AISLADO · 30/10 | Consultar precio proyecto/branch en organización actual sin contratar recursos ni tocar EFG Nutrition productiva. | PENDIENTE APROBACIÓN EXPRESA USD 10/MES + CONSUMOS · RELEASE NO GO |
| 188 | EDUCATION-01/02 · NUTRICIÓN CON CIENCIA EN ALUMNO Y COACH · 30/10 | Implementar pestaña didáctica con respaldo OMS/NIH/ISSN: calorías, 4/4/9, función de los 3 macros, exceso relativo de proteína/grasa, c | 5/5 CI SUCCESS MISMO SHA · NUTRICIÓN CON CIENCIA ALUMNO+COACH IMPLEMENTADA EN CANDIDATA · NO PUBLICADO |
| 189 | COACH75 · 11/12 OBJETOS HOSTED AUSENTES + TIMESTAMP FICHA REPARADO · 30/10 | Delimitar bloqueo real para lanzamiento PWA piloto de Nutrition Coach: legal publicado, ficha versionada, objetivo+guía atómicos, preve | RELEASE NO GO · 11/12 ESQUEMA HOSTED AUSENTE · FIX FICHA CANDIDATA · CI FINAL PENDIENTE |
| 190 | BRAND-76 · NUTRICIÓN CON-CIENCIA SECCIÓN + CAMBIO GLOBAL PENDIENTE · 30/10 | Verificar contenido educativo, nombre Con-Ciencia en pestaña alumno/coach y programar rebranding total y PDF ilustrado en PWA antes de  | CAMBIO PARCIAL EN CANDIDATA; REBRANDING GLOBAL+ILUSTRACIONES PENDIENTES · RELEASE NO GO |
| 191 | BRAND-77 · INTRO 1 VEZ POR CUENTA + TAB CON-CIENCIA · 30/10 | Decisión visual: usar propuesta ilustrada aprobada EXACTA como página larga vertical responsive; apertura automática en primer ingreso  | ESPECIFICACIÓN APROBADA · IMPLEMENTACIÓN Y QA PENDIENTES · RELEASE NO GO |
| 192 | BRAND-77B · INTRO ÚNICA POR DIAPOSITIVAS + TAB VERTICAL · 30/10 | Especificación corregida expresamente: primera visita CON PRESENTACIÓN de 8 pantallas ilustradas y Siguiente/Anterior/progreso; después | PENDIENTE IMPLEMENTACIÓN, BACKEND Y QA · RELEASE NO GO |
| 193 | BRAND-78 · WELCOME 8 PANTALLAS + REBRANDING VISIBLE + QA EN COLA · 30/10 | Completar en candidata BRAND77B: intro navegable una sola vez por cuenta, biblioteca vertical permanente, experiencia alumno/coach y ma | IMPLEMENTADO COMO CANDIDATO · BANDERA OFF · CI QUEUED · RELEASE NO GO |
| 194 | COACH-79 · META PRIVADA EN EDITOR 5 COMIDAS + AUDITORÍA HOSTED · 30/10 | Evitar que edición de menú del coach cambie desvíos o porciones contra meta antigua durante preparación atómica; mantener historia del  | FIX EN CANDIDATA + REGRESIÓN ESTÁTICA · BACKEND 13/14 AUSENTE · RELEASE NO GO |
| 195 | COACH-80 · CORREGIR DOS FALLOS CI + STORAGE PRIVADO · 30/10 | Localizar y corregir aserciones caducas de bienvenida y marca tras nueva actualización candidata, sin desactivar controles; inventariar | FIX 2 TESTS EN CANDIDATA / STORAGE INVENTARIADO · RELEASE NO GO |
| 196 | COACH-81 · CI REPARA ASERCIÓN REBALANCE DE GRAMOS · 30/10 | Probar que editar gramos en guía privada Coach se recalcule respecto de propuesta vigente y no de la meta aprobada anterior. | FIX PR37 DRAFT · DOS CHECKS PASARON, TRES EN CURSO · RELEASE NO GO |
| 197 | COACH-82 · ANDROID GBOARD COMPOSICIÓN IME PROTEGIDA · 30/10 | Evitar que Enter/confirmación del teclado virtual Gboard elija automáticamente una sugerencia al componer texto en el buscador de comid | FIX CANDIDATA · DOS CHECKS OK, TRES PENDIENTES · RELEASE NO GO |
| 198 | COACH-83 · REGRESIÓN NUT50 + CONCURRENCIA PR37 · 30/10 | Evitar tests caducados tras selección de meta privada y preservar integridad de commits simultáneos en la rama. | TEST REGRESIÓN CORREGIDO · PR DRAFT · NO GO |
| 199 | COACH-84 · QA PARCIAL 3/5 Y REGRESIONES MARCA ARREGLADAS · 30/10 | Completar regreso de marca y privacidad/educación, corrigiendo pruebas de nombre antiguo sin anular controles de accesibilidad o seguri | 3 DE 5 CI SUCCESS · RESTANTES EN CURSO · GRAN ACTUALIZACIÓN NO GO |
| 200 | BRAND-78 · SEROTONINA BIENESTAR PANTALLA 8/8 + AUTH FIX · 30/10 | Incorporar visual aprobado de serotonina al cierre educativo 8/8 con mismo contenido en página vertical, y corregir fixture Auth local  | CI SAME HEAD AÚN INCOMPLETO · RELEASE NO GO |
| 201 | COACH-85 · FICHA ORG RLS UPDATE/DELETE + MIGRACIÓN 8 MÓDULOS · 30/10 | Evitar acceso cruzado a ficha y comprobar que el alumno pueda eliminar su ficha opcional sin borrar otros históricos antes de migración | PARCHE SEGURIDAD CANDIDATA · 3/5 CI CHECKS SUCCESS · NO GO |
| 202 | COACH-86 · RECOVERY LEGACY SIN ROMPER SEGURIDAD · 30/10 | Ensayar retorno seguro a Coach anterior después de migración que revoca permisos viejos; no reactivar RPC obsoleta nueva que no existe  | PG17 RECOVERY SINTÉTICO PASS · RELEASE NO GO |
| 203 | COACH-87 · NINGUNA FICHA SIN TÉRMINOS Y PRIVACIDAD · 30/10 | Verificar en el ensayo integrado que el alumno no pueda guardar ficha nueva sin documentos legales actuales y aceptación explícita, y q | CI PARCIAL 3/5 / CONSENTIMIENTO PENDIENTE · NO GO |
| 204 | COACH-88 · COACH TAMBIÉN DEBE ACEPTAR LEGAL / CI INFRA · 30/10 | Cerrar omisión de flujo legal del coach: la política atomic exige consentimiento vigente de ambos pero UI inicial solo cubría alumno. | 3 PASS / 1 FAIL INFRA / 1 EN CURSO — GRAN ACTUALIZACIÓN NO GO |
| 205 | COACH-89 · CACHE PWA Y REVALIDACIÓN SEGURA EN REFRESH · 30/10 | Evitar que la PWA anterior confunda recursos con el relanzamiento, y que refrescar vistas saltee términos/ficha vigentes o recupere bor | PWA BUILD RECONOCIBLE + REFRESH REVALIDADO / CI PENDIENTE · NO GO |
| 206 | COACH-90 · HEAD EXACTO 5/5 + AUDITORÍA READ-ONLY 13/14 · 30/10 | Verificar PR37 actual y 5 CI; comprobar dependencias backend hosted, paquete SQL de ocho módulos y bloqueo respaldo/aceptación legal si | 5/5 CI SAME HEAD SUCCESS (LOCAL/SINTÉTICO) · SCHEMA HOSTED 13/14 AUSENTE · RELEASE NO GO |
| 207 | COACH-91 · MÉTODO RAW PG_DUMP OBSOLETO | Método COACH91 de captura/restauración generic pg_dump RETIRADO por incompatibilidad con Supabase administrado; no utilizar con datos r | PROCEDIMIENTO OBSOLETO / NO EJECUTAR · RESGUARDO COACH94 PASÓ TEST SINTÉTICO · RECUPERACIÓN REAL NO EJECUTADA |
| 208 | COACH-92 | Protocolo UAT físico del piloto Nutrition Coach y aceptación legal simulada | UAT FÍSICO NO EJECUTADO · HEAD 464fd999 CI 4/5 PASSED · RESTANTES EN PROCESO · NO GO |
| 209 | COACH-93 | Preparar paquete de prueba sin merge ni deploy ni proyecto adicional | CANDIDATA QA AUTOMÁTICA 5/5 SAME HEAD · RESTORE REAL + UAT FÍSICA PENDIENTES · NO GO |
| 210 | COACH-94 · BACKUP SUPABASE CORREGIDO Y ANTIGUO BLOQUEADO · 30/10 | Corregir procedimiento de recuperación privada para no usar pg_dump genérico de plataforma Supabase. | COACH94 TEST SINTÉTICO PASS · CI 4/5 HEAD, VISUAL RUN EN PROCESO · RESTORE REAL PENDIENTE · NO GO |
| 211 | COACH-95 · PREFLIGHT MAC PRIVADA SIN SECRETOS · 30/10 | Preparar Mac y carpeta local cifrada para export read-only Supabase CLI sin poner passwords ni datos en GitHub o chat. | PREPARACIÓN EN GITHUB · CI NUEVO PENDIENTE · NO BACKUP REAL NI UAT · NO GO |
| 212 | COACH-96 · CAMBIO DE ALCANCE GRAN ACTUALIZACIÓN · 30/10 | Priorizar publicación de las mejoras disponibles; ejecutar backup integral privado desde Mac después de la actualización por decisión e | ALCANCE ACTUALIZADO · PREPARACIÓN RELEASE COMPATIBLE EN REVISIÓN · NO DEPLOY TODAVÍA |
| 213 | COACH-96 · PR38 RELEASE PARCIAL SIN MIGRACIÓN · 30/10 | Preparar publicación con lo ya disponible sin usar Mac ni migraciones. Evitar fusionar PR37 (250 archivos) con backend sin instalar. | PR38 QA 2/3 PASS + SCIENCE CHROMIUM PASS · WEBKIT/UI EN CURSO · NO DEPLOY |
| 214 | COACH-97-01 | Candidata integrada PR37 | PASS AUTOMÁTICO (AISLADO) |
| 215 | COACH-97-02 | Supabase esquema existente | BLOQUEANTE 13/14 AUSENTES |
| 216 | COACH-97-03 | Módulos SQL del relanzamiento | PASS LOCAL / NO LISTO HOSTED |
| 217 | COACH-97-04 | Términos de uso piloto y Privacidad | PENDIENTE INTEGRACIÓN |
| 218 | COACH-97-05 | Ficha inicial de ingreso y reingreso | PENDIENTE HOSTED |
| 219 | COACH-97-06 | Consentimiento compartir datos con coach | PENDIENTE E2E |
| 220 | COACH-97-07 | Meta nutricional + dieta guía juntas | PENDIENTE HOSTED |
| 221 | COACH-97-08 | Presentación Nutrición Con-Ciencia una vez | CÓDIGO CORREGIDO EN PR37 · SERVIDOR RECEIPTS EXISTE CON 0 VISTOS · FLAG OFF · QA/UAT PENDIENTE |
| 222 | COACH-97-09 | Biblioteca vertical ciencia + serotonina | PR37: PESTAÑA MULTIROL + VISTA VERTICAL · QA VISUAL/UAT PENDIENTE · NO PUBLICADO |
| 223 | COACH-97-10 | Registro 5 comidas y elección guiada | PASS AUTOMÁTICO / UAT FÍSICA PENDIENTE |
| 224 | COACH-97-11 | Comidas habituales/recetas y catálogo | PASS AUTOMÁTICO / UAT PENDIENTE |
| 225 | COACH-97-12 | Cálculo científico, metas y margen 5% | PASS AUTOMÁTICO / UAT PENDIENTE |
| 226 | COACH-97-13 | Informe Luxury Pro humano | PASS AUTOMÁTICO / UAT PENDIENTE |
| 227 | COACH-97-14 | Chat, campana y recordatorios | PASS AUTOMÁTICO / E2E PENDIENTE |
| 228 | COACH-97-15 | Pagos, alias y comprobantes | E2E PENDIENTE |
| 229 | COACH-97-16 | Acceso OTP/sesión/PWA Android-iPhone | UAT FÍSICA PENDIENTE |
| 230 | COACH-97-17 | Integridad datos productivos | BASELINE PASS / PARIDAD POST PENDIENTE |
| 231 | COACH-97-18 | Permisos RLS y RPCs | BLOQUEANTE DE PERMISOS |
| 232 | COACH-97-19 | Funciones fuera alcance del relanzamiento | SEMÁFORO CONTEXTUAL CANDIDATO · ACTIVO EN CÓDIGO PR37, PERO SIN DATOS PARA VERDES/ROJOS NI E2E FÍSICO |
| 233 | COACH-97-20 | Publicación e instalación de la Gran Actualización | PENDIENTE GO |
| 234 | COACH-98 · AUTORIZACIÓN PROVISIONAL PILOTO FICTICIA · 30/10/2026 | Se solicitó texto ficticio para que la persona autorice la participación en la prueba; NO representar aceptación legal definitiva ni co | DISEÑO PROVISIONAL IMPLEMENTADO · SIN PERSISTENCIA / SIN ACTIVACIÓN REAL · TEST PENDIENTE |
| 235 | COACH-99 · DOS CONSENTIMIENTOS REQUERIDOS Y NO BORRAR USUARIOS | Exigir participación piloto Y compartir ficha al coach antes de continuar; reiniciar ficha de todos sin eliminar cuentas ni registros h | CÓDIGO Y CONTRATOS PREPARADOS · CI 5/5 EN COLA · SIN ACTIVAR NI PUBLICAR |
| 236 | COACH-100 · FICHA SALUD → ENVÍO COACH → PLAN ATÓMICO → DESBLOQUEO MI DÍA | Alumno ingresa, 2 autorizaciones, ficha de salud/nutrición de versión actual, envío al coach; espera mientras se construye plan; MI DÍA | CONTRATO Y TEST SINTÉTICOS AGREGADOS · NO ACTIVADO · BACKEND/PRUEBA REAL PENDIENTE |
| 237 | COACH102 D-45 · COACH101 | SEMÁFORO + PLAN | CÓDIGO + BD PREPARADOS · NO HAY FUENTES REVISADAS REALES |
| 238 | COACH102 D-39, PRO-63, COACH100 | FICHA SALUD GENERAL | BACKEND/ACTIVACIÓN PENDIENTES |
| 239 | COACH102 CLIN-GUT-01/03, D-39/D-41 | SALUD SENSIBLE Y SIBO/LACTOSA | CLÍNICA OFF · PENDIENTE REVISIÓN/CONSENTIMIENTO REAL |
| 240 | COACH102 COACH98/99 | DOS AUTORIZACIONES | DEMO CI · REGISTRO REAL PENDIENTE |
| 241 | COACH102 COACH100, QA-COACH2 | PLAN ANTES MI DÍA | INTEGRACIÓN DE BACKEND PENDIENTE |
| 242 | COACH102 D-46 PRO-17 G-01:G-06 | GUÍA DINÁMICA CINCO COMIDAS | MOTOR AUTOMÁTICO PASS · PUBLICACIÓN E2E PENDIENTE |
| 243 | COACH102 PRO-38, COACH97-10 | METODOLOGÍA MAIN MEALS | AUTOMÁTICO PASS · ANDROID/IPHONE FÍSICOS PENDIENTES |
| 244 | COACH102 PRO-37, PRO-41, COACH97-12 | REGLA 5% + PREMIO | PASS AUTOMÁTICO · UAT PENDIENTE |
| 245 | COACH102 PRO01 PRO02 D09 | MACROS / TDEE / OBJETIVOS | PASS SINTÉTICO · VALIDACIÓN CON ALUMNO PILOTO PENDIENTE |
| 246 | COACH102 PRO-26/27/29/36 | CATÁLOGO Y PREPARADOS | BIBLIOTECA FUNCIONAL · REVISIÓN DE DATOS PENDIENTE |
| 247 | COACH102 PRO-31, PRO-47 | HABITUALES Y ACCESO RÁPIDO | REGRESIÓN LOCAL PASS · E2E PENDIENTE |
| 248 | COACH102 PRO-21, PRO-10, REPORT-LUX | INFORME SEMANAL HUMANO | PASS AUTOMÁTICO · ENVÍO/RESPUESTA REAL PENDIENTE |
| 249 | COACH102 PRO-19/20/49/51 | MENSAJERÍA Y CAMPANA | PASS AUTOMÁTICO · MULTIUSUARIO E2E PENDIENTE |
| 250 | COACH102 PRO-12/13/45/46 | COBRO, LICENCIAS, COMPROBANTES | FUNCIONES LEGADAS OPERATIVAS · CIRCUITO EXTREMO PENDIENTE |
| 251 | COACH102 COACH-PILOT-10, COACH-GO-01 | COACH PILOTO CARLA | POSTACTUALIZACIÓN POR DECISIÓN EXPRESA |
| 252 | COACH102 PRO-35/40, BRAND78 | MARCA Y PANTALLAS PREMIUM | VISUAL AUTOMÁTICO PASS · QA FÍSICA PENDIENTE |
| 253 | COACH102 BRAND77B/78, EDUCATION01/02 | EDUCACIÓN 8 PASOS + VERTICAL | BD INTRO CONFIRMADA · 0 RECEIPTS · CÓDIGO PR37 PARA PENDING/COACH/ADMIN AJUSTADO · FLAG OFF · CI ÚLTIMO HEAD EN CURSO |
| 254 | COACH102 PRO64, D36, PRO60 | CALIDAD NUTRICIONAL Y TIP | POSTGO / NO BLOQUEA NUTRITION COACH BASE |
| 255 | COACH102 PRO18/23/24/25, QA-M01 | PWA, ESTABILIDAD Y VERSIÓN | TESTS AUTOMÁTICOS · FÍSICO PENDIENTE |
| 256 | COACH102 SEG01/02, COACH85-94, COACH97-17/18 | INTEGRIDAD Y PERMISOS | NO-GO HASTA PRUEBA HOSTED INTEGRADA |
| 257 | COACH102 PRO55/56, MOB01-03, D26 | AUTOGESTIÓN Y TIENDAS | DIFERIDO POST NUTRITION COACH |
| 258 | COACH103 · CONTINUACIÓN TRAS CORTE: SEMÁFORO EN SELECTORES + PRUEBAS CI | Se reconectó luego del corte del chat; cerrar integración semáforo D-45 en selección alimentos alumno y coach, verificar lo ya auditado | COACH103: UI SEMÁFORO MULTIROL + BORRADO CACHÉ COMMIT 5c0d910; CI 5/5 EN CURSO; FALTA PERSISTENCIA PERFIL CLÍNICO/REVISIÓN REAL |
| 259 | QA-ANDROID-TOUCH · REPORTE USUARIO 29/10 | Android MI DÍA solo dejaba desplazar tocando zona inferior; el pull refresh interceptaba desplazamiento. | REGRESIÓN SINTÉTICA DISPONIBLE · FÍSICO PENDIENTE |
| 260 | QA-HABITUAL-REAL · REPORTE USUARIO 29/10 | Guardar habitual no mostraba las opciones al reingresar; usuario pide varios habituales por horario y primera selección de desayuno vál | PRUEBA ALMACÉN FICTICIO · NO E2E REAL IOS/ANDROID |
| 261 | QA-DIETAS-KETO-AYUNO · RECONCILIACIÓN DEL PLAN MAESTRO | Usuario recuerda patrones omnívora, mediterránea, DASH, vegetariana, vegana, pescetariana, flexitariana, Portfolio, low carb y keto + v | PATRONES EN CANDIDATA · NO PUBLICADO · E2E BACKEND PENDIENTE |
| 262 | QA-RESTRICCIONES + SEMÁFORO · 30/10 | Semáforo en búsqueda y selector de alimentos del alumno y catálogo Coach; restricciones alimentarias y planes elegidos con verde/amaril | VISUAL INTERFAZ CANDIDATA · SIN VERDES/ROJOS REALES · SALUD CLÍNICA OFF |
| 263 | COACH106 · DOS AUTORIZACIONES PILOTO PERSISTIDAS | Dos checkboxes separados, desmarcados y obligatorios; registrar ambas decisiones al instante del clic mediante UID autenticado y fecha  | BACKEND ALOJADO VERIFICADO · UI OFF / JWT REAL PENDIENTE |
| 264 | COACH107 · FICHA GENERAL VERSIONADA EN HOSTED | Todos los alumnos completan versión nueva con preferencias, actividad, peso, talla, keto, DASH, Portfolio, ayuno 12:12/14:10/16:8 y env | BACKEND FICHA GENERAL OK · SALUD SENSIBLE/FRONT/JWT/PLAN ATÓMICO PENDIENTES |
| 265 | COACH108 · BORRADOR COACH PRIVADO Y VERSIONADO | Coach edita objetivos+guía de cinco comidas sin alterar publicaciones ni objetivos históricos, y con consentimiento actual. | BACKEND HOSTED · JWT REAL/FRONT/PUBLISH PENDIENTE |
| 266 | COACH109 · ESTADO DE ACCESO AL NUEVO PLAN | Todos los alumnos actuales repiten ficha; plan histórico no se toma como autorización para nueva experiencia MI DÍA. | LEDGER HOSTED · PUBLICACIÓN CONJUNTA AÚN AUSENTE |
| 267 | COACH110 · AVISO COACH AL COMPARTIR FICHA NUEVA | Coach recibe notificación de nuevo alumno o ficha general actualizada solamente si alumno decide compartirla. | TRIGGER HOSTED · SIN ENVÍOS REALES / JWT PENDIENTE |
| 268 | COACH111 · RPC ESTADO DE INGRESO DE ALUMNO FIRMADO | Supabase calcula estado propio: participación piloto→ficha general compartida→plan en preparación→MI DÍA listo solo cuando meta+guía co | BACKEND HOSTED · UI OFF / PUBLICACIÓN ATÓMICA PENDIENTE |
| 269 | COACH112 · FICHA GENERAL REAL CLIENTE / CAS OPTIMISTA | Alumno autenticado consulta/comparte nueva ficha con keto, DASH, Portfolio y ayuno, sólo después de dos autorizaciones registradas, rev | CÓDIGO EN PR37 · UI OFF / QA Y JWT REALES PENDIENTES |
| 270 | COACH113 · PANTALLAS INGRESO PILOTO FIRMADO Y CHAT MIENTRAS ESPERA | Conectar dos checkboxes sin premarcar → recibo Supabase → ficha general nueva y envío Coach → pantalla de espera con mensajería hasta p | CÓDIGO CONECTADO EN PR37 · BANDERA OFF · CI NUEVO SHA EN CURSO · SIN PUBLICAR |
| 271 | COACH114 · FUENTE DE COMPOSICIÓN NUTRICIONAL REVISADA Y PROTEGIDA | Evitar que el navegador declare macros inventados o aptitud clínica cuando el Coach publica dieta guía; prevalidar las 5 comidas contra | BACKEND HOSTED / FAIL CLOSED · FUENTES VERIFICADAS VACÍAS · ATÓMICO AÚN PENDIENTE |
| 272 | SPORT-STEP-01 · PASOS, KM Y KCAL POR RITMO | Visualizar 3 ritmos, convertir pasos a km con altura opcional y calcular calorías activas aproximadas con peso, sin descontar del objet | IMPLEMENTACIÓN EN CANDIDATA · BASE MIGRADA · QA FINAL Y UAT PENDIENTES |
| 273 | HABITUAL-VISIBLE-01 · NUEVO HABITUAL VISIBLE DESPUÉS DE GUARDAR | Al tocar Guardar habitual en un horario, mantener abierta la comida actual, seleccionar automáticamente el nuevo habitual y mostrar su  | CÓDIGO EN PR37 · QA NUEVO SHA Y UAT REAL PENDIENTE |
| 274 | COACH115-117 · TÉRMINOS/PRIVACIDAD REALES + WEBKIT 390 RESUELTO | Corregir desbordamiento horizontal en ficha de primer ingreso WebKit 390 y añadir versiones legales reales, dos autorizaciones explícit | CORRECCIÓN VISUAL 5/5 EN SHA ANTERIOR; HOSTED LEGAL FAIL-CLOSED; CI ÚLTIMO SHA EN CURSO / NO PUBLICAR |
| 275 | COACH118 · BLOQUEO DE ESCRITURA DIARIO POR PLAN PUBLICADO | No basta con esconder MI DÍA: API REST de diarios vieja debe verificar estado servidor y publicación Coach atómica, incluso desde clien | HOSTED GATE INSTALADO OFF · NO INTERFIERE LEGADO · QA EN CI / NO PUBLICADO |
| 276 | COACH119 · PUBLICACIÓN OBJETIVO + GUÍA ATÓMICA EN CANDIDATA | Crear una sola operación SQL coach-signed para publicar meta, guía de 5 ingestas, estado published y un aviso único (además receipt ide | SQL EN PR37 / NO INSTALADO / SIN E2E PG REALES / NO PUBLICAR |
| 277 | UX35-SESSION01 · AVISO DE GRAN ACTUALIZACIÓN + CIERRE DE SESIÓN EN MÓVIL | Verificar texto preciso de UX-35: preview no cierra, REAUTH solo gran versión realmente publicada y por acción expresa, OTP+T&C/Privaci | IMPLEMENTADO PARCIAL EN PR37 · CI NUEVO HEAD EN EJECUCIÓN · FLUJO GRAN RELANZAMIENTO OFF · NO PUBLICADO |
| 278 | COACH120-121 UX35 · MANIFIESTO FIRMADO Y RELANZAMIENTO ÚNICO POR USUARIO | Verificar secuencia PREVIEW→re-auth firmado y build published→OTP nuevo→legal docs actuales→What’s New una vez; despliegues menores sil | HOSTED INERTE · SIN NOTIFICACIONES NI CIERRES · CI ÚLTIMO SHA EN EJECUCIÓN · NO PUBLICAR |
| 279 | COACH122 / UX35 · ACTUALIZACIÓN SIN ATAJOS ENTRE DOS DISPOSITIVOS | Probar que la sesión de dispositivo B anterior al lanzamiento nunca omite OTP aunque A haya confirmado el aviso y reingresado. Cambios  | BACKEND INSTALADO OFF · VERIFICACIÓN SQL PASÓ · TEST E2E JWT DOS DISPOSITIVOS PENDIENTE |
| 280 | REL-ALL-20261030 / QA FILA POR FILA + EDUCATION01/02 | Auditar las 114 filas Plan Maestro, 273 controles QA y cruce con PR37, sin deducir que estado histórico=verificación nueva. Antes de pu | REVISIÓN COMPLETA DE REGISTRO · CÓDIGO CANDIDATO · CI HEAD EN EJECUCIÓN · PR37 DRAFT / NO PUBLICADO · NO UAT FÍSICA |
| 281 | COACH119-HISTORY · RETENCIÓN TRANSACCIONAL DE GUÍAS (PR37, SIN PUBLICAR) | Asegurar que una nueva guía de cinco comidas publicada NO destruya la guía anterior ni las metas históricas; mantener privacidad y atom | CÓDIGO CORREGIDO EN CANDIDATA · QA POSTGRES REAL PENDIENTE · NO GO |

**Total Control QA:** 275 filas con ID. Las primeras pueden ser reemplazadas por evidencia más nueva.

## Bloqueos del GO (anotados sin confundir con postactualización)

1. Dos textos legales reales y aceptaciones versionadas. Piloto informativo no equivale a consentimiento sanitario.
2. Ficha versión nueva para alumnos existentes y nuevos, coach autorizado, estado pendiente y publicación objetivo+5 comidas verdaderamente atómica.
3. Semáforo por datos revisados; 0 elementos validados, no habilitar recomendaciones clínicas ni inventar clasificación verde/roja.
4. Aviso major solo con release firmado y publicado, OTP por dispositivo; presentación de ocho pantallas una sola vez + sección vertical permanente.
5. Habituales, selector, Gboard y desplazamiento Android; informes Luxury, chat, pagos, licencias, catálogo, pasos. Requieren prueba funcional real.
6. Cinco CI mismo HEAD, JWT A/B y UAT físico sin borrar históricos; publicación solo tras GO propietario.

**Postactualización según decisión del propietario:** respaldo/restauración integral Mac BKP-19, endurecimiento adicional y planes Personal/tiendas/Carla. No deshabilita autorización, permisos, ley de datos sensibles ni atomicidad.

**Estado GitHub verificado:** PR DRAFT, base productiva `9000e4d8e08bd9483770209a863b1cdba2141c43`, sin merge ni despliegue autorizado.

**Interpretación:** Las tablas de arriba demuestran lectura fila por fila. No acreditan implementación de 389 funciones distintas: muchas son registros repetidos y cambios supersedidos.
