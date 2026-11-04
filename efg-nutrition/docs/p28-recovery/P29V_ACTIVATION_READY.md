# P29V — Preparación de activación cerrada; NO desplegada

Fecha: 2026-11-04. Base runtime exacta: e7142df9e75b04d66fe584bb55660e863fe897aa.
Este paquete sustituye el inventario incompleto P29U. Cierra la preparación técnica del punto1, no los prerrequisitos nutricionales, la matriz funcional ni el GO de producción.

## Render verificado por conector
- Servicio existente srv-dbfle40ae00c738hf0v0, static_site; repositorio correcto.
- Rama efg-nutrition-app; autoDeploy yes, trigger commit. Fusionar dispara despliegue: el merge pertenece al corte autorizado.
- rootDir vacío; buildCommand `echo 'EFG Nutrition static prototype ready'`; publishPath efg-nutrition. No hay compilador que transforme flags por nosotros.
- Previews OFF. Live dep-dbl75l8m7kps739fm1pg, SHA ab7c241cdfa376cab9954fc9b8f12750d2f905d7. Sin cambios Render.

## Archivos concretos revisables
- P29V_activation.patch: propuesta aplicable sobre la base, comprobada con git apply --check; NO aplicada al runtime candidato. 44 archivos cambian, 97 módulos recorridos y 25 CSS versionados. Build `ncc-pilot-e7142df9e75b` coherente con meta HTML, entrada y dependencias locales. Preserva fotografías originales y catálogo.
- P29V_asset_manifest.json: hashes de entrada/salida y rutas; comprobación reproducible con prepare-ncc-pwa-assets-pre-go.mjs.
- Diez flags ON en la propuesta: SCIENCE_WELCOME_ENABLED, COACH_STUDENT_JOURNEY_ENABLED, PRIVATE_HEALTH_DECLARATION_UI_ENABLED, COACH_ATOMIC_PLAN_UI_ENABLED, COACH_RELAUNCH_VERSIONED_PLAN_BACKEND_VERIFIED, COACH_SHARED_STUDENT_RECIPES_UI_ENABLED, COACH_RELAUNCH_LEGAL_BRIDGE_ENABLED, LEGAL_ONBOARDING_ENABLED, MAJOR_RELEASE_FLOW_ENABLED, RELEASE_COMMUNICATIONS_ENABLED. Los dos puentes legales eran dependencias del preparador existente y faltaban en inventario P29U. No se suman rutas de ingreso alternativas.
- QA_REVIEWED_SOURCES_ENABLED sigue OFF; también ruta relaunch alternativa, workspace adaptado/Personal y participación demo. No distribuir dist del preview.
- P29V_activate_NOT_APPLIED.sql: manifiesto `major_ncc_e7142df9e75b`, roles alumno/coach/admin/personal, fase live con corte OTP a transaction_timestamp(); tres switches juntos. Falla sin tres atestaciones del operador para el build exacto: GO, comprobación live y revisión productiva de fuentes. Estas variables NO son prueba automática de esas condiciones: no establecerlas hasta verificarlas realmente.
- P29V_recover_NOT_APPLIED.sql: desactiva solo ese manifiesto/build y los tres switches; exige autorización de recuperación y estado esperado. Retiene manifiesto, recibos y todos los datos.

## Ensayo ejecutado
PostgreSQL17 PGlite aislado, migraciones COACH120/121/122 originales y definición exacta de status capturada del servidor (P29V_hosted_major_status.sql). Auth/usuarios/términos son fixtures, NO sesión JWT alojada.
PASS: rechazo sin atestaciones; fallo después de escrituras revierte manifiesto y tres switches; activación conjunta; reintento de activación rechazado; sesión vieja/ausente exige reingreso; sesión nueva permite novedades; términos faltantes llevan a legal; recuperación sin autorización rechazada; recuperación autorizada deja switchesOFF/manifiesto inactivo y conserva recibos y datos sintéticos.
PASS preparador de assets: hashes/entrada/importaciones/CSS consistentes, destinos externos, SHA incorrecto rechazado, flags QA OFF, fuentes runtime sin editar. Se agregó rechazo de checkout runtime sucio.
No se repitieron pruebas funcionales ya aprobadas. No migraciones ni switches alojados modificados.

## Corte final, cuando estén resueltos puntos2/3 y exista GO
1. Verificar que el runtime no cambió respecto a hashes del paquete. Si cambió, regenerar propuesta/build y SQL desde el nuevo SHA; no reutilizar un manifiesto obsoleto.
2. Revisar diff activación y conservar estos scripts de recuperación. Confirmar GO que cubra merge/despliegue y activación servidor. El GO del03nov no sirve.
3. Aplicar patch revisado en candidata y validar cambios afectados. Merge solo tras GO: Render despliega automáticamente. No habilitar servidor si el despliegue falla.
4. Verificar LIVE commit esperado y archivos publicados: meta efg-build, entrada y flags/digests del manifiesto. Antes de esa verificación los switches y el manifiesto permanecen OFF; puede existir una ventana de recorrido bloqueado, nunca se promete corte sin interrupción.
5. Con fuentes productivas verificadas y GO vigente, ejecutar transacción de activación con atestaciones exactas. No reaplicar migraciones instaladas. La publicación y sus controles sanitarios/diario se habilitan juntos.
6. Smoke por roles del build publicado. Reingreso es por aviso y sesión del dispositivo; no se revocan todos los usuarios ni se aceptan términos automáticamente.
7. Ante fallo, ejecutar recuperación validada del servidor antes de rollback de assets; devolver frontend al SHA estable. No borrar planes, diarios, recibos ni otros históricos. Si hay deriva de estado, abortar la recuperación automática y revisar diferencias.

No ejecutar ni establecer GO por el solo hecho de que estas pruebas sean PASS. Publicación nutricional fuera QA y cierre de matriz siguen pendientes separados. PDF diferido por Edu; informe aprobado no reabierto.
