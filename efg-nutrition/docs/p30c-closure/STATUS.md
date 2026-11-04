# P30C — cierre ejecutado sin publicación

2026-11-04. Runtime 1223936995dab750f90e504c860abc21c15e29c6. PR53 sigue DRAFT. No GO, merge, despliegue ni activación global.

## CI
Los seis workflows de 27f44063049f84ce634a2cc12dbad6c9f93edd0e finalizaron SUCCESS, consultados sin relanzar. El nuevo runtime tiene cuatro SUCCESS y Auth/JWT y Visual en curso al preparar este registro; no hereda resultados del SHA anterior.

## Defecto alojado resuelto: actividad
La UI enviaba walking_distance_km, walking_duration_minutes y walking_avg_heart_rate_bpm, ausentes en efg_activities. Se validó el SQL existente NCC_WALKING_V2_STAGING_ONLY.sql en PostgreSQL17/PGlite: preservación, límites, rechazo de reinstalación y RLS conservada. Luego se instaló como p30c_walking_session_fields. El archivo histórico STAGING_ONLY está YA APLICADO; no repetir.

Cuatro filas previas preservadas: hash de columnas originales 4a7003e85cc07dd12a4129987308b86b; políticas antes/después 43e2018669e5292f85cb09406c118560.

Sesión firmada Coach QA A (69f78429-face-4c55-a28c-357cca35d452): guardado ficticio 2026-11-04,5000pasos,3.50km,45min,70kg, sin pulso. UI147kcal activas aproximadas. Readback SQL y recarga completa de sesión recuperan los valores. No se creó ingesta ni se modificó objetivo alimentario.

## Cupos y notificaciones
Texto de licencia piloto corregido: ya no promete10cupos. Remite a Mis alumnos; capacidad real2, usados2, libres0. UI verificada tras recarga. Sintaxis y diff PASS. No cambio de permisos/cupos/cobros.
Bandeja coach muestra3notificaciones; abrir la del03/11 navega Ingresos y reduce contador a2. Persistencia tras recarga PASS:2sinleer. Solo datos QA, sin mensajes enviados.

## Paquete regenerado
Base runtime1223936995dab750f90e504c860abc21c15e29c6; build ncc-pilot-1223936995da; manifiesto major_ncc_1223936995da.44archivos,98módulos,25CSS;10flagsONpropuestos,5OFFincluidoQA. git apply --check y ncc-pwa-asset-cutover-pre-go PASS. Parche y SQL NO APLICADOS. Usar este paquete en lugar de P29V/P30B para este runtime. Las atestaciones SQL requieren hechos comprobados y GO explícito.

## Estado de producción comprobado
Render mantiene LIVE dep-dbl75l8m7kps739fm1pg, SHAab7c241cdfa376cab9954fc9b8f12750d2f905d7; static_site,autoDeploy=yes por commit,branch efg-nutrition-app,publishPath efg-nutrition. Merge dispara publicación. Supabase19:08:46Z:3switchesOFF,0manifiestos,18referencias aprobadas vigentes. No se cambiaron estos controles.

## Alcance y pendientes precisos
No55/55. Se preserva evidencia previa sin repetirla. Pendientes por rol: pago alumno→coach, validación comercial/admin y organizaciones; envío/recepción de mensajes no probado aquí. PWA física y cambio de sesión durante escritura no certificados. Ingresos conserva textos antiguos de próxima implementación y su resumen no acredita publicación: no usar ese resumen como prueba del plan del alumno.
Se respetan los diferidos:9referencias extra,lectura alumno del plan2100,reintento firmado de publicación,PDF posterior. Las18referencias no certifican todo el catálogo. No ocultar alimentos ni eliminar alcance QA vencido.
Conector fetch_pr sigue fallando Transport closed; descripción PR no sobrescrita con copia obsoleta. Evidencia guardada en documentos y Plan Maestro.
