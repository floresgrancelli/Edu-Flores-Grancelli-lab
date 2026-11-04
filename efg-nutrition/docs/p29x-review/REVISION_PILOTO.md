# P29X — decisión nutricional pendiente, piloto real

Propuesta pendiente: 18 referencias concretas durante 90 días desde una aprobación expresa. Las 13 referencias anteriores mantienen únicamente su aprobación histórica QA; este documento NO las convierte en productivas. No autoriza despliegue, no inserta aprobaciones ni modifica el catálogo.

## Cinco referencias adicionales

Valores por 100 g, salvo leche por 100 ml. Orden: kcal / proteínas / hidratos / grasas / fibra.

| Alimento y fuente | Catálogo actual | Propuesta |
|---|---|---|
| [Pan integral comercial, referencia USDA FDC 172688](https://fdc.nal.usda.gov/food-details/172688/nutrients) | 247.0 / 13.0 / 41.0 / 4.2 / 7.0 | 252 / 12.45 / 42.71 / 3.5 / 6 |
| [Avena arrollada regular/rápida seca sin fortificar, USDA FDC 173904](https://fdc.nal.usda.gov/food-details/173904/nutrients) | 379.0 / 13.2 / 67.7 / 6.5 / 10.1 | 379 / 13.15 / 67.7 / 6.52 / 10.1 |
| [Yogur natural descremado, referencia USDA SR Legacy FDC 170887](https://fdc.nal.usda.gov/food-details/170887/nutrients) | 50.0 / 4.2 / 8.1 / 0.087 / 0 | 56 / 5.73 / 7.68 / 0.18 / 0 |
| [Port Salut reducido en grasa La Serenísima, etiqueta verde, venta al peso](https://www.laserenisima.com.ar/images/tablas/tablaportsaludverde.jpg) | 217.0 / 27.0 / 1.7 / 12.0 / 0 | 219 / 27 / 0.5 / 12 / 0 |
| [Leche UAT 0% La Serenísima, referencia de etiqueta por 100 ml](https://www.laserenisima.com.ar/images/tablas/9523620tabla0.png) | 36.05 / 3.4711 / 5.0058 / 0.1854 / 0 | 36 / 3 / 4.9 / 0.5 / 0 |

## Decisiones explícitas incluidas

- Yogur: se propone el registro completo SR Legacy 170887. Foundation 2647437 no informa fibra; no se completa con datos de otro registro.
- Leche: se usa la columna directa de 100 ml del fabricante. Se abandona para esta referencia la conversión genérica por densidad 1,03. La tabla declara 0,5 g de grasa/100 ml aunque el nombre comercial diga 0%.
- Queso: referencia exclusiva al Port Salut reducido en grasa, etiqueta verde de La Serenísima; no equivale a cualquier Port Salut light. La columna de 100 g evita multiplicar redondeos de la porción.
- Queso y leche: fibra 0 operativa por la declaración de cantidad no significativa. No es una medición de cero. Esta aproximación forma parte de la decisión solicitada.
- Las identidades específicas se mostrarán en la guía al aplicar referencias. No se certifican otras marcas ni se convierten estas fuentes en reglas de alergias o del semáforo.
- Se descartaron etiquetas del sitio staging y tablas antiguas: se conservan las imágenes del sitio público enlazadas por sus fichas de producto.

## Alcance y límites

El JSON adjunto contiene las 18 identidades, unidades, fuentes y diferencias. Las primeras 13 conservan el detalle P29H/P29W, incluida merluza cocida/escurrida y conversión documentada de café. Ninguna decisión humana está rellenada.

Estas 18 referencias cubren los alimentos seleccionados en los ejemplos estándar, celíaco y sin lactosa de P29W; no certifican todas las restricciones, recetas ni los 560 alimentos del catálogo. Los ejemplos vegano/keto siguen necesitando otras 9 referencias: avocado, chicken, chickpeas_cooked, rice, soy_textured_hydrated, strawberry, tempeh, walnuts, zucchini. Consultar cobertura P29W; la elegibilidad se verifica alimento por alimento.

El catálogo completo sigue disponible para el diario. Una guía con una referencia faltante, vencida o no aprobada queda bloqueada para publicación; no se eliminan alimentos para obtener PASS.

## Ensayo técnico

p29x-full-atomic-sources-pglite.mjs ejecuta la función atómica exacta y la migración candidata en PostgreSQL aislado: bloqueo con switches OFF/fuentes ausentes, rollback total ante fallo final, consentimiento e intake obsoletos rechazados, publicación única y reintento sin duplicados, diario intacto. Dependencias y aprobaciones son ficticias. No es prueba JWT alojada, RLS completa, concurrencia ni autorización humana.

P29W: seis CI SUCCESS para d3028e237a20b95a0539642f38333e776240c775. Este lote agrega documentación y pruebas; no cambia runtime ni aplica el SQL alojado. El paquete de activación basado en 0277ae9 conserva su base; no se aplicó.

## Decisión agrupada a registrar

Aprobar o corregir las 18 referencias para guías del piloto real, durante 90 días desde la decisión, incluyendo identidades específicas, preparaciones, conversiones y fibra operativa de queso/leche. Esta decisión NO es GO de producción ni aprobación del catálogo completo.

Recálculo estándar con 18 referencias ficticiamente habilitadas en memoria: 2471,75 kcal; P151,79; HC321,81; G67,86; fibra35,10 para objetivo2500/P150/HC322/G68/fibra35. Desviación máxima1,20%. No publicación ni autorización real.
