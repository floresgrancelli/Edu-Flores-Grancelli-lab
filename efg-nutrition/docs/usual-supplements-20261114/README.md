# Suplementación habitual

Candidata: solapa Habitual en Suplementos. Guarda la lista de suplementos realmente registrada hoy como plantilla con producto, cantidad, unidad y momento. El botón Registrar habitual hoy agrega los faltantes, con composición actual del catálogo y copia de la etiqueta de micronutrientes. No hay registro automático. Guardar/reemplazar/eliminar la plantilla no borra consumos históricos.

Persistencia en la cuenta usando el JSONB existente `efg_daily_logs.skipped._supplementRoutineV1`, sin migraciones. Se lee la última fila con esa clave, por `updated_at`, sin límite de 90 días; una lista vacía es una eliminación explícita que impide recuperar versiones antiguas. Solo se escribe en el diario vigente propio mediante el flujo existente, bloqueo global de escritura y rollback ante rechazo. La plantilla no se incluye en `sports` ni suma calorías o micronutrientes por sí sola. Se requieren confirmaciones de reemplazo y eliminación.

No duplica productos ya registrados en el mismo momento: cuenta ocurrencias por producto/momento y conserva la cantidad real incluso si difiere de la plantilla. Horarios distintos se mantienen separados. Cambios de cuenta y respuestas tardías usan propietario, época y token; no comparten rutinas. Se validan catálogo, unidades, cantidades y fechas al recuperar datos.

Pruebas: módulo puro para validación, cantidades/horarios, dosis repetidas, cantidades diferentes, eliminación y snapshots. Navegadores con app real y adaptador sintético local: tres roles, 390/320 px, guardar, aplicar, reintentar, reemplazar y eliminar, preservación de etiqueta y otros consumos. No se escriben cuentas reales durante QA.
