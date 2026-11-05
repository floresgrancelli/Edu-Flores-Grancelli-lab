# Dieta Guía: recuperación y corrección del 5 de noviembre

Base verificada: `b373fdf5c90a920c9e1971d5c2d8c98531e0a14a`, producción sin avanzar durante la recuperación. Copia r4 SHA-256 `fc1d33b47d2a8a839c589c4cf57587ef39f30d545867b4c4c6f46057902728a5`. No se obtuvo r5 ni se le atribuye su SHA a esta entrega. Se reconstruyeron los originales del parche y se verificaron 141 archivos contra sus blobs Git. Se usó el acceso GitHub habilitado; sin acceso directo a la Mac ni elusión del bloqueo anterior.

## Comportamiento

- Volver a Alumnos únicamente tras confirmación validada de publicación. Cancelar o fallar conserva el borrador y la clave de reintento. Fallar al renderizar después del commit no invita a reenviar.
- Huevos independientes en unidades enteras; fracciones exactas en recetas. Recálculo acotado con los alimentos existentes, sin fabricar nutrientes ni alterar manuales inválidos silenciosamente.
- Editor y revisión de guía conservan desplazamiento táctil nativo, incluso al comenzar el gesto en el borde superior. Se conserva la actualización deliberada fuera de la guía.
- Fuentes del piloto resueltas antes de aprobar las cantidades finales. Errores de referencias, contexto o declaración de salud se muestran sin afirmar envío.
- Identidad del servidor conservada y assets con versión `ncc-pilot-3a40474052be-guide-return-r6`, grafo completo y manifiesto exacto.

## Verificación local

35 pruebas Node sobre cantidades, restricciones, fuentes, resultados de publicación, gesto y manifiesto; contratos existentes de borradores, selector, guías de cinco/seis comidas, viabilidad de cantidades, aviso de actualización y semáforo. Experimento original r4: 1000 planes con score/violación exactamente iguales y 16 rebalances adversos con salida completa idéntica. La prueba histórica que aceptaba 65 g de huevo fijado ahora exige corregir explícitamente a 2 unidades; mantiene el caso de fracción en receta y diagnóstico de inviabilidad.

No navegador local: la descarga de Chromium devolvió un ZIP inválido. QA visual preparada en CI para Chromium/WebKit, coach/admin, 360/390/1280 px y eventos táctiles; el estado final del CI corresponde al SHA del PR, nunca a esta documentación. No Android físico.

## Backend alojado: bloqueo comprobado

Lectura de funciones y estado: publicación atómica activada y 18 referencias de alimentos vigentes. Un borrador actual incluye pollo/cerdo sin referencias aprobadas; se preserva la denegación.

Dos ensayos SQL transaccionales, usando contexto de rol `authenticated` y ROLLBACK, sin JWT HTTP firmado: el primero fue rechazado por una asignación antigua; el segundo, con guía sintética generada a partir del registro vigente, superó las referencias pero fue rechazado por el trigger `P28: current shared health declaration required`. No se falsificaron aceptaciones, aprobaciones ni declaraciones. Las revisiones/estados de borradores y la ausencia de recibos de ensayo se verificaron después. No se enviaron notificaciones persistentes.

**No publicar mientras falte verificar un envío alojado autorizado con declaración actual compartida.** La autorización de Edu es condicional a funcionamiento y comprobaciones satisfactorias; no se reutiliza como prueba técnica. No se cambió ningún flag, permiso, migración ni infraestructura. Candidata conservada en rama independiente y PR #56.

## Corrección adicional: administrador como coach titular

La lectura de restricciones y el semáforo omitían al administrador aunque fuera el coach titular de una organización de prueba, mientras el backend sí permite exactamente ese caso. La candidata ahora replica esa condición: perfil activo, identidad firmada coincidente, organización propia y de prueba para admin, ficha compartida y seguimiento autorizado; respuesta sanitaria ligada a alumno, organización y viewer, con ambos consentimientos, revisión y contexto vigentes. No se habilita acceso administrador global. 17 pruebas ejecutan los guards reales y el lector del perfil, incluidos acceso ajeno, organización no de prueba, revocación, respuestas cruzadas y cambio de sesión. No sustituye la declaración expresa del alumno ausente en el ensayo alojado.
