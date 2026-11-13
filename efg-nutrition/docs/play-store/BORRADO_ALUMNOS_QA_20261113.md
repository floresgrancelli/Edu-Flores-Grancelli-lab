# Borrado de alumnos — evidencia de preparación

13/11/2026. Rama de trabajo de PR #123. Sin aplicar el candidato a producción.

## Resultado aprobado

https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/43485512465

Pasaron ambos jobs:

1. PostgreSQL 17 aislado y siete pruebas Node de la operación del servidor.
2. Supabase LOCAL desechable con servicios GoTrue, PostgREST y Storage reales,
   usuarios ficticios, JWT firmados y archivos de texto de prueba.

No se crearon proyectos alojados ni recursos pagos. No se usaron credenciales
alojadas, historiales de alumnos reales ni SMTP externo. El stack local se
eliminó al terminar. Sus claves efímeras no se imprimen ni se adjuntan al reporte.

## Qué se comprobó

| Caso | Resultado |
|---|---|
| Solicitud creada por el alumno con JWT real | Se crea para su propia identidad |
| Otra persona intenta pedir el borrado de ese alumno | Rechazado por permisos |
| Un navegador intenta ejecutar la operación reservada al servidor | Rechazado |
| Archivos y registros del alumno elegido | Eliminados mediante API de Storage y transacción SQL |
| Registro en Auth | Eliminado por Auth Admin y ausencia confirmada independientemente |
| Archivo eliminado | Ya no se puede descargar por la API |
| JWT anterior durante el procesamiento | No puede agregar datos ni archivos |
| JWT anterior después de eliminar Auth | No puede recrear datos ni archivos |
| Otro alumno | Sigue autenticando, conserva mensajes y archivos, y puede subir archivos |
| Coach | Sigue autenticando y conserva su organización |
| Identidad Auth válida, todavía sin perfil de app | No se la confunde con una cuenta eliminada |
| Cuenta coach/admin, pagos o vínculos profesionales ajenos | La prueba SQL exige revisión manual antes de borrar |
| Modelo de datos cambiado sin revisar | Se rechaza la ejecución |
| Error de archivos o base de datos | Las pruebas del servidor impiden avanzar al borrado de Auth |
| Timeout de API o verificación inconclusa | No se declara éxito sin comprobar que Auth ya no contiene la cuenta |

Se añadió una comprobación privada de existencia de la identidad del llamador
para tratar los JWT anteriores. No requiere guardar una lista permanente de
IDs personales borrados y no bloquea por sí misma el ingreso previo a crear perfil.

## Alcance exacto

Es un candidato funcional para alumnos elegibles del modelo revisado. No está
activado en la app publicada y no cubre automáticamente todos los roles/casos.
La prueba reproduce columnas, nulabilidad y FKs observadas, pero no todas las
políticas, funciones de negocio y condiciones del proyecto alojado.

Antes de activar se debe ensayar contra la configuración completa de seguridad
en un entorno aislado equivalente, revisar concurrencia y dispositivos, resolver
casos profesionales/financieros y cerrar la política de respaldos/restauración.
No debe habilitarse un botón que prometa borrado automático de cualquier cuenta
usando esta evidencia como si también cubriera coaches y doble rol.

## Implementación

- privacy/backend/erase-student.mjs: operación del servidor con APIs administrativas.
- privacy/backend/student-erasure.candidate.sql: preparación, bloqueo de escrituras y limpieza transaccional.
- privacy/tests/erase-student-local-api.mjs: integración local real, sin dependencias de un proyecto alojado.
- privacy/backend/erasure-scenarios.sql: permisos, referencias, reintentos y cambios de esquema con datos ficticios.

La política pública continúa en revisión. Los datos de contacto y domicilio
confirmados por Edu ya están incorporados; no se cambiaron los consentimientos
vigentes del piloto.
