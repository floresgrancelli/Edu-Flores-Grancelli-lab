# P29W — Decisión agrupada sobre 13 referencias para el piloto real

**Propuesta pendiente. No es una aprobación registrada ni un GO de despliegue.**

Las 13 referencias son exactamente las de P29H aprobadas solo para QA en P29I. Se propone autorizar esas mismas identidades, unidades y composiciones para guías de alumnos reales del piloto, durante 90 días desde la decisión explícita (plazo operativo propuesto, no caducidad científica). No se modifican ni renuevan las filas QA. Se crearían nuevas referencias versionadas en el registro independiente, con fecha real, responsable, texto de aprobación y vencimiento.

La aprobación se limita a datos de composición y preparación. No certifica todo el catálogo, compatibilidad médica, ausencia de alérgenos ni todas las variantes de un alimento. Cada guía seguirá requiriendo revisión del coach y validación del servidor.

## Valores propuestos
Valores por 100 g, excepto café por 100 ml. Diferencia frente al catálogo indicada en orden kcal / proteína / HC / grasa / fibra.

| ID e identidad exacta | kcal | P | HC | G | Fibra | Diferencia frente al catálogo | Fuente |
|---|---:|---:|---:|---:|---:|---|---|
| apple — Apples, raw, with skin (Includes foods for USDA's Food Distribution Program) | 52.0 | 0.26 | 13.81 | 0.17 | 2.4 | +0 / +0 / +0 / +0 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/171688) |
| banana — Bananas, raw | 89.0 | 1.09 | 22.84 | 0.33 | 2.6 | +0 / +0 / +0 / +0 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/173944) |
| brownrice — Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program) | 123.0 | 2.74 | 25.58 | 0.97 | 1.6 | +0 / +0.04 / -0.02 / -0.03 / -0.2 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/169704) |
| coffee_black — Beverages, coffee, brewed, prepared with tap water | 1.00089607 | 0.12010753 | 0.0 | 0.02001792 | 0.0 | +0.6009 / +0.02011 / +0 / +0.02002 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/171890) |
| egg — Eggs, Grade A, Large, egg whole | 148.0 | 12.4 | 0.96 | 9.96 | 0.0 | +0 / +0 / +0 / +0 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/748967) |
| egg_white — Egg, white, raw, fresh | 52.0 | 10.9 | 0.73 | 0.17 | 0.0 | -3 / +0.2 / -1.63 / +0.17 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/172183) |
| fish_hake — Merluza (Merlucius hubbsi según TBCA), cocida y escurrida, sin aceite ni sal; peso comestible cocido | 99 | 19.3 | 0 | 2.42 | 0 | -8.7 / -4.7 / +0 / +1.12 / +0 | [Referencia](https://tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0190E) |
| mandarin — Tangerines, (mandarin oranges), raw | 53.0 | 0.81 | 13.34 | 0.31 | 1.8 | +0 / +0.01 / +0.04 / +0.01 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/169105) |
| oil — Oil, olive, salad or cooking | 884.0 | 0.0 | 0.0 | 100.0 | 0.0 | +0 / +0 / +0 / +0 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/171413) |
| potato — Potatoes, boiled, cooked without skin, flesh, without salt | 86.0 | 1.71 | 20.01 | 0.1 | 1.8 | +0 / +0 / +0 / +0 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/170440) |
| pumpkin — Squash, winter, butternut, cooked, baked, without salt | 40.0 | 0.9 | 10.49 | 0.09 | 3.2 | +6 / -0.1 / +2.49 / -0.01 / +2.2 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/169296) |
| rocket — Arugula, raw | 25.0 | 2.58 | 3.65 | 0.66 | 1.6 | +0 / -0.02 / -0.05 / -0.04 / +0 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/169387) |
| tofu_firm — Tofu, raw, firm, prepared with calcium sulfate | 144.0 | 17.27 | 2.78 | 8.72 | 2.3 | +25 / +5.27 / +0.78 / +1.72 / +1.3 | [Referencia](https://api.nal.usda.gov/fdc/v1/food/172475) |

## Preparaciones y límites de las fuentes

- Clara: SR Legacy 172183 completa; peso crudo antes de cocinar. No mezclar fibra de otra ficha.
- Arroz integral: cocido, grano largo, ficha 169704; no peso seco.
- Tofu: firme con sulfato cálcico. No representa todo tofu.
- Anco: butternut horneado sin sal ni aceite; no otras variedades ni hervido.
- Café: preparado con agua. Conversión aproximada 29,6 g por fl oz / 29,5735 ml; no espresso ni densidad medida.
- Merluza: cocida y escurrida, sin aceite ni sal; TBCA BRC0190E contiene valores calculados e hidratos asumidos por la fuente. No equiparar al horno ni peso crudo.

## Cobertura real del generador

Comparación reproducible con catálogo real de 560 entradas y meta sintética 2500/P150/HC322/G68/Fi35. No certifica todos los objetivos ni todos los perfiles. Las guías siguen usando el catálogo completo; no se fuerza una selección reducida para pasar controles.

| Perfil de ensayo | Ingredientes distintos | Sin referencia en este paquete |
|---|---:|---|
| balanced | 16 | bread, cheese, milk_skim, yogurt, oats_raw |
| celiac | 13 | Ninguno en esta muestra |
| lactose | 15 | bread, oats_raw |
| vegan | 15 | bread, tempeh, chickpeas_cooked, walnuts, oats_raw, soy_textured_hydrated, rice |
| keto | 12 | strawberry, cheese, yogurt, avocado, chicken, zucchini, tempeh |

**Aprobar estas 13 referencias NO habilitaría todas las guías automáticas.** Faltan referencias concretas de 14 IDs en las muestras: avocado, bread, cheese, chicken, chickpeas_cooked, milk_skim, oats_raw, rice, soy_textured_hydrated, strawberry, tempeh, walnuts, yogurt, zucchini. La guía equilibrada requiere cinco de ellos. Permanecen seleccionables; una guía que los incluya no podrá publicarse hasta completar su propia revisión. No se solicita aprobar estos faltantes sin expediente.

## Decisión solicitada y registro

Aceptar o corregir conjuntamente el uso de estas 13 referencias y seis precisiones para alumnos reales del piloto durante los 90 días propuestos. La decisión deberá indicar el alcance de piloto real. Esto no autoriza merge, deploy ni activación global.

Campos actuales: decision=null; reviewer=null; reviewedAt=null; expiresAt=null; productionGo=false. El texto previo «Aprobado» permanece asociado exclusivamente a P29I/QA.

Capturas y trazabilidad de valores: `docs/p29h-review/proposal.json`, `usda-capture-projections.json`, y paquete P29H; sin sustitución de evidencia histórica.
