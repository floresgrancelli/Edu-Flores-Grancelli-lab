# Catálogo de restaurantes — 14/11/2026

152 opciones de 15 cadenas para registrar consumos en Mi Día. No es una carta exhaustiva ni un menú de precios. Disponibilidad y composición pueden variar por sucursal y fecha.

- 43 fichas oficiales de McDonald’s Argentina: peso, energía, proteínas, hidratos, grasas y fibra copiados de las tablas web de cada producto. Se conserva la energía declarada sin reemplazarla por 4/4/9. Se excluyeron fichas sin peso o sin datos completos y filas con peso cero. Las cantidades declaradas pueden incluir inconsistencias o redondeos de origen; por ejemplo, la hamburguesa simple conserva el dato oficial sin corregirlo silenciosamente.
- 109 modelos explícitamente estimados para Burger King, Mostaza, Starbucks, Café Martínez, Tienda de Café, Kansas, Havanna, Bonafide, Wendy’s, KFC, Subway, SushiClub, Fabric Sushi e Ishidan Sushi. Las cartas identifican los productos; NO aportan los valores nutricionales de estos modelos. Pesos, recetas y sustituciones son supuestos documentados, calculados con referencias genéricas del catálogo. No presentarlos como datos oficiales, recetas exactas ni mediciones de las cadenas.
- Cada modelo detalla cantidades de componentes, rendimiento supuesto y URL de carta o canal comercial. Los modelos de cafés usan leche entera salvo indicación; los jarabes, panes, aderezos y porciones pueden diferir del local. Las carnes se expresan en peso comestible cocido, no en peso bruto con hueso.
- Sushi se registra por pieza o gramos; no se interpreta un roll entero o una tabla como una sola pieza. Los rolls sin arroz no usan un modelo con arroz. Salsas adicionales se cargan aparte.
- Los platos incluyen únicamente las guarniciones indicadas en su nombre. No se añaden bebidas ni acompañamientos de forma automática.
- No se infiere aptitud para alergias, condiciones de salud o restricciones por el nombre comercial. No se fabrican micronutrientes.
- Estas referencias se marcan `diaryOnly`: no amplían el catálogo de prescripción del backend ni se incorporan a sugerencias automáticas. No hay cambios de base de datos.

Archivos de auditoría: `mcdonalds-official.json` (hechos nutricionales y enlaces individuales), `reference-models.json` (supuestos), `food-restaurants-20261114.js` (composición ejecutable).

Validación: contratos de identidad, porciones, procedencia y energía; integración en registro/edición, búsquedas de las 15 cadenas y frutos secos pesados en gramos, mediante Chromium/WebKit con datos sintéticos. No equivale a ensayo físico iPhone/Android ni altera cuentas reales.


## Combos de sushi
Se agregan nueve combinados de SushiClub, Fabric e Ishidan, con número de piezas publicado y porción de un combo completo o fracción. Las cantidades y mezclas nutricionales son modelos ilustrativos por equivalencia; no recetas oficiales. Las bebidas y salsas extra se registran aparte.
