# P29U — Paquete de activación preparado, no ejecutado
Base revisada: cde69db29efee1e3df3855597616d7482a8e5985. Producción recuperada: ab7c241cdfa376cab9954fc9b8f12750d2f905d7.
La preparación no autoriza merge, despliegue, switches globales, manifiesto activo ni cierre de sesiones.

## Inventario exacto
Ver activation-manifest.json: nueve archivos leídos directamente del HEAD remoto, con SHA Git blob.
Seis flags del recorrido: pasar a true solo en el commit final autorizado. MAJOR_RELEASE_FLOW_ENABLED y RELEASE_COMMUNICATIONS_ENABLED también requieren habilitación para aviso/reingreso: aún no ensayados en este paquete.
QA_REVIEWED_SOURCES_ENABLED permanece false. Nunca distribuir la copia del preview: contiene configuración QA y aprobaciones restringidas.
COACH_VERSIONED_INTAKE_ENABLED se deriva de STUDENT_JOURNEY; no es un séptimo switch independiente.
No encender indiscriminadamente los demás flags false (autogestión, ensayos clínicos y recorridos alternativos).

## Servidor observado
Lectura administrativa 04nov2026: los tres switches están false; major_release_manifests tiene cero filas.
Por lo tanto, copiar únicamente los flags de Work NO completa el lanzamiento.
Las instalaciones P28G, trigger de alumnos nuevos, scope QA, RPC de recetas compartidas y tabla de informes ya existen. Los nombres NOT_APPLIED históricos no autorizan reinstalarlas.

## Secuencia de corte propuesta
1. Resolver alcance real de revisión de alimentos y decisiones de la matriz. La aprobación de 13 fuentes QA con vencimiento no habilita catálogo productivo.
2. Preparar y ensayar manifiesto de relanzamiento con ID nuevo, build final exacto, roles y reautenticación por dispositivo; conservar recibos previos. No reutilizar el GO del03nov.
3. Leer configuración actual Render: rama, comando de build/start, raíz, autodeploy y despliegue live. Esta preparación no los verificó; no asumir que merge es inocuo frente a autodeploy.
4. Generar commit de activación desde candidata remota exacta, jamás desde checkout local sucio ni dist de preview. Actualizar identidad del build/caché según mecanismo real del proyecto y verificar assets servidos. Ejecutar solo controles afectados por ese cambio.
5. Presentar diff final, SHA final, manifiesto y transacción de switches para GO explícito. No hay autorización implícita por preparar este documento.
6. Tras GO, coordinar despliegue y activación: no habilitar publicación antes de controles de salud/diario. Cambiar los tres switches juntos en una transacción validada; no dejar una ventana con solo publicación ON. Confirmar UI/build nuevo antes de exigir reingreso. Secuencia exacta pendiente del ensayo del manifiesto.
7. Smoke real por roles: ingreso, presentación correcta por cuenta/versión, ficha/espera, coach, plan/guía, Mi Día/Balance restante, seis horarios y datos existentes.
8. Ante fallo, detener activación. Rollback del frontend al SHA estable NO deshace switches ni manifiesto: restaurar configuración anterior registrada mediante procedimiento validado; conservar objetivos, guías, diarios y recibos creados. Nunca revertir datos de usuarios para simular rollback.

## Herramienta de comprobación
check-activation.mjs comprueba hashes y constantes de los nueve archivos de una copia del HEAD base. No cambia archivos, no conecta servicios, no despliega y no habilita nada. Falla si recibe copia de preview o archivos divergentes. La comprobación acredita integridad del paquete, no autorización ni aptitud del lanzamiento.

## Alcance de cierre
Inventario y controles preparados. Activación productiva NO lista todavía: faltan ensayo de manifiesto/build/caché, lectura Render y prerrequisitos arriba. P29T publicación2500→2100 sigue aprobada; no repetirla. PDF diferido por Edu.
