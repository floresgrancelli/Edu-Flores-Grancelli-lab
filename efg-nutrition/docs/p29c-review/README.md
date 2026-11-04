# P29C — Revisión del borrador QA guardado

Fecha: 4 de noviembre de 2026. Datos ficticios. Borrador versión 1, ficha revisión 2. Lectura administrativa; no prueba de sesión firmada. Se retiraron identificadores de cuenta/organización y referencias sanitarias del fixture exportado. No se alteró el borrador alojado.

La guía contiene 6 horarios, 23 componentes y 13 alimentos distintos. SHA256 de selección: `625e3aa089a4a42166b21d0bd3f020a124eda1cbb898f5a3b70be8f496e7a275`. Esta huella identifica horarios, alimentos y cantidades; no constituye autorización.

## Resultado del cotejo local

| Alimento | Evidencia disponible | Referencia FDC |
|---|---|---|
| Manzana con cáscara | ARCHIVE_CAPTURE_PENDING_OPERATOR | 171688 |
| Banana cruda sin cáscara | ARCHIVE_CAPTURE_PENDING_OPERATOR | 173944 |
| Arroz integral cocido | RECONCILIATION_REQUIRED | 169704 |
| Café solo sin azúcar | NO_EXACT_PRIMARY_SOURCE | Pendiente |
| Huevo entero sin cáscara (referencia crudo) | CATALOG_FDC_REFERENCE_ONLY | 748967 |
| Clara de huevo | CATALOG_FDC_REFERENCE_ONLY | 747997 |
| Merluza cocida | NO_EXACT_PRIMARY_SOURCE | Pendiente |
| Mandarina | NO_EXACT_PRIMARY_SOURCE | Pendiente |
| Aceite de oliva (gramos) | ARCHIVE_CAPTURE_PENDING_OPERATOR | 171413 |
| Papa hervida sin piel y sin sal | ARCHIVE_CAPTURE_PENDING_OPERATOR | 170440 |
| Calabaza cocida | NO_EXACT_PRIMARY_SOURCE | Pendiente |
| Rúcula | NO_EXACT_PRIMARY_SOURCE | Pendiente |
| Tofu firme | NEW_SELECTED_ID_REQUIRES_SOURCE_REVIEW | Pendiente |

Las capturas previas corresponden a manzana, banana, aceite y papa. Sus diferencias numéricas están en el CSV. Arroz integral requiere conciliación: fibra 1,8 g/100 g en la app frente a 1,6 g/100 g en la captura. Huevo y clara tienen referencias del catálogo, sin captura certificada en este expediente. Café, merluza, mandarina, calabaza, rúcula y tofu aún requieren fuente exacta. No se consultaron nuevas fuentes externas en esta etapa.

## Corrección ejecutada

El exportador ahora conserva referencias FDC numéricas de alimentos seleccionados fuera del lote inicial, como clara 747997. No inventa captura, valores de fuente, diferencias ni aprobación. Regresión ncc-source-review-batch.mjs PASS; sintaxis y diff PASS.

## Pendientes y continuidad

Los seis CI de 1f021b9 continuaban queued al consultar. PostgreSQL 41863364575 / job126691034323 sin pasos ejecutados. Workflow usa ubuntu-latest y no declara concurrency. No hay evidencia suficiente para atribuir la causa de la cola. No se relanzó.
La migración de acceso futuro y la reparación aditiva QA siguen sin aplicar hasta validación PostgreSQL. No se cambió Supabase, el catálogo, el preview ni Render. Publicación, idempotencia, historial y Mi Día alojados continúan pendientes.
El CSV deja en blanco decisión, operador y fecha. Primero resolver correspondencia de alimento/preparación/unidad y cifras; después revisión humana documentada. Nunca cargar estos datos como reviewed automáticamente.
