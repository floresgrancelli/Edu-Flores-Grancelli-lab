# P29H — Una revisión agrupada para cerrar las fuentes

**PROPUESTA: pendiente de revisión humana. No cargada en el catálogo ni en Supabase.**

Valores por100g, excepto café por100ml. P/HC/G/Fibra en gramos. Las capturas USDA nuevas son datos oficiales; los valores TBCA son calculados y sus hidratos asumidos por la propia fuente.

| ID | kcal | P | HC | G | Fibra | Fuente |
|---|---:|---:|---:|---:|---:|---|
| apple | 52 | 0.26 | 13.81 | 0.17 | 2.4 | [171688](https://api.nal.usda.gov/fdc/v1/food/171688) |
| banana | 89 | 1.09 | 22.84 | 0.33 | 2.6 | [173944](https://api.nal.usda.gov/fdc/v1/food/173944) |
| brownrice | 123 | 2.74 | 25.58 | 0.97 | 1.6 | [169704](https://api.nal.usda.gov/fdc/v1/food/169704) |
| coffee_black | 1.0009 | 0.1201 | 0 | 0.02 | 0 | [171890](https://api.nal.usda.gov/fdc/v1/food/171890) |
| egg | 148 | 12.4 | 0.96 | 9.96 | 0 | [748967](https://api.nal.usda.gov/fdc/v1/food/748967) |
| egg_white | 52 | 10.9 | 0.73 | 0.17 | 0 | [172183](https://api.nal.usda.gov/fdc/v1/food/172183) |
| fish_hake | 99 | 19.3 | 0 | 2.42 | 0 | [BRC0190E](https://tbca.net.br/base-dados-en/int_statistical_composition.php?cod_produto=BRC0190E) |
| mandarin | 53 | 0.81 | 13.34 | 0.31 | 1.8 | [169105](https://api.nal.usda.gov/fdc/v1/food/169105) |
| oil | 884 | 0 | 0 | 100 | 0 | [171413](https://api.nal.usda.gov/fdc/v1/food/171413) |
| potato | 86 | 1.71 | 20.01 | 0.1 | 1.8 | [170440](https://api.nal.usda.gov/fdc/v1/food/170440) |
| pumpkin | 40 | 0.9 | 10.49 | 0.09 | 3.2 | [169296](https://api.nal.usda.gov/fdc/v1/food/169296) |
| rocket | 25 | 2.58 | 3.65 | 0.66 | 1.6 | [169387](https://api.nal.usda.gov/fdc/v1/food/169387) |
| tofu_firm | 144 | 17.27 | 2.78 | 8.72 | 2.3 | [172475](https://api.nal.usda.gov/fdc/v1/food/172475) |

## Decisiones concretas incluidas

- Clara: usar ficha SR Legacy172183 completa (52kcal/P10,9/HC0,73/G0,17/fibra0), reemplazando la referencia Foundation parcial. No completar la fibra de Foundation con un dato de otro registro.
- Arroz integral: ficha169704 completa, fibra1,6 y HC25,58.
- Tofu: referencia explícita firme con sulfato cálcico,144kcal/P17,27. No representar todos los tofu como ese producto.
- Calabaza: identificar como anco/butternut al horno sin sal ni aceite, ficha169296 (40kcal/fibra3,2); no mezclar variedades ni hervido.
- Café: preparado con agua; conversión trazada29,6g por fl oz /29,5735ml. Es una aproximación por medida doméstica, no densidad medida ni espresso.
- Merluza: cocida/escurrida sin aceite/sal,99kcal/P19,3. Ajustar la descripción de cena que actualmente dice al horno. La referencia cruda de ARGENFOODS no se usó como cocida.

## Efecto con las cantidades actuales (sin recalcular)

| Magnitud | Antes | Con propuesta |
|---|---:|---:|
| k | 2446.88 | 2461.60 |
| p | 151.28 | 148.99 |
| c | 321.28 | 322.52 |
| f | 68.57 | 72.71 |
| fi | 35.52 | 39.46 |

Esta comparación no afirma cumplimiento de metas. Las cantidades de la receta100g+100g se conservan. Después de la revisión se prepara un borrador nuevo y se recalcula; v1 e históricos quedan intactos.

## Revisión requerida

La persona revisora debe aceptar o corregir las13filas y las seis decisiones anteriores, identificándose y dejando fecha real. Los campos decision/reviewer/reviewedAt siguen null. Una orden genérica de continuar no equivale a aprobar esta propuesta. No se inserta reviewed hasta tener revisión explícita.

No se redujo catálogo, no se excluyeron alimentos y no se repitieron pruebas funcionales aprobadas.
