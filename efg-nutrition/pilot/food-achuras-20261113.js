// Additive cooked offal references and an explicitly estimated vasca recipe.
export const ACHURAS_FOODS=[
  {
    "id": "chinchulines_grilled",
    "name": "Chinchulines a la parrilla · carne vacuna",
    "category": "protein",
    "unit": "g",
    "k": 2.7,
    "p": 0.138,
    "c": 0.0,
    "f": 0.239,
    "fi": 0.0,
    "sourceType": "sara2",
    "sourceId": "SARA2-2022-table7A-p82",
    "sourceUrl": "https://iah.msal.gov.ar/doc/720.pdf",
    "validationStatus": "tabla_referenciada",
    "source": "Ministerio de Salud, SARA 2 (2022), tabla 7.A, página impresa 82. Valores por 100 g de parte comestible cocida a la parrilla/horno, sin aceite ni sal adicionales. Energía publicada; no se recalcula por 4-4-9. Chinchulines usa la referencia conjunta de chinchulines/tripa gorda.",
    "servingGrams": 100
  },
  {
    "id": "kidney_beef_grilled",
    "name": "Riñón a la parrilla · carne vacuna",
    "category": "protein",
    "unit": "g",
    "k": 1.51,
    "p": 0.273,
    "c": 0.0,
    "f": 0.047,
    "fi": 0.0,
    "sourceType": "sara2",
    "sourceId": "SARA2-2022-table7A-p88",
    "sourceUrl": "https://iah.msal.gov.ar/doc/720.pdf",
    "validationStatus": "tabla_referenciada",
    "source": "Ministerio de Salud, SARA 2 (2022), tabla 7.A, página impresa 88. Valores por 100 g de parte comestible cocida, sin aceite ni sal adicionales. Energía publicada; no se recalcula por 4-4-9.",
    "servingGrams": 100
  },
  {
    "id": "sweetbreads_beef_grilled",
    "name": "Molleja a la parrilla · carne vacuna",
    "category": "protein",
    "unit": "g",
    "k": 3.12,
    "p": 0.21899999999999997,
    "c": 0.0,
    "f": 0.25,
    "fi": 0.0,
    "sourceType": "sara2",
    "sourceId": "SARA2-2022-table7A-p86",
    "sourceUrl": "https://iah.msal.gov.ar/doc/720.pdf",
    "validationStatus": "tabla_referenciada",
    "source": "Ministerio de Salud, SARA 2 (2022), tabla 7.A, página impresa 86. Valores por 100 g de parte comestible cocida, sin aceite ni sal adicionales. Energía publicada; no se recalcula por 4-4-9.",
    "servingGrams": 100
  },
  {
    "id": "morcilla_vasca_estimate",
    "name": "Morcilla vasca de cerdo con pasas y nueces (estimación)",
    "category": "protein",
    "unit": "g",
    "k": 3.0463999999999998,
    "p": 0.12960000000000002,
    "c": 0.21350000000000002,
    "f": 0.18599999999999997,
    "fi": 0.007200000000000001,
    "sourceType": "recipe_estimate",
    "sourceId": "ncc-morcilla-vasca-model-85-10-5",
    "sourceUrl": "https://www.lafrancisca.com/productos/morcilla-vasca-38",
    "validationStatus": "receta_estimado",
    "source": "Modelo orientativo por 100 g: 85 g de morcilla cocida, 10 g de pasas y 5 g de nueces, usando la composición genérica vigente del catálogo. Las proporciones son un modelo explícito, NO una receta verificada ni etiqueta de fabricante. La referencia enlazada confirma ingredientes habituales, no cantidades ni macros de este modelo. Ajustar al envase o receta real. Puede contener frutos secos y otros alérgenos; no acredita aptitud sin gluten. No completa micronutrientes ausentes.",
    "servingGrams": 100
  }
];
export const ACHURAS_PORTIONS={
  "chinchulines_grilled": {
    "grams": 100,
    "label": "porción pesada de 100 g"
  },
  "kidney_beef_grilled": {
    "grams": 100,
    "label": "porción pesada de 100 g"
  },
  "sweetbreads_beef_grilled": {
    "grams": 100,
    "label": "porción pesada de 100 g"
  },
  "morcilla_vasca_estimate": {
    "grams": 100,
    "label": "porción pesada de 100 g"
  }
};
export const ACHURAS_ALIASES={
  "chorizo_cooked": [
    "achuras",
    "asado",
    "parrillada",
    "chorizo",
    "chorizos",
    "chori sin pan"
  ],
  "morcilla_cooked": [
    "achuras",
    "asado",
    "parrillada",
    "morcilla",
    "morcilla comun",
    "morcilla común"
  ],
  "chinchulines_grilled": [
    "achuras",
    "asado",
    "parrillada",
    "chinchulin",
    "chinchulín",
    "chinchulines",
    "chinchus"
  ],
  "kidney_beef_grilled": [
    "achuras",
    "asado",
    "parrillada",
    "riñon",
    "riñón",
    "rinon",
    "rinones",
    "riñones"
  ],
  "sweetbreads_beef_grilled": [
    "achuras",
    "asado",
    "parrillada",
    "molleja",
    "mollejas",
    "molleja vacuna"
  ],
  "morcilla_vasca_estimate": [
    "achuras",
    "asado",
    "parrillada",
    "morcilla vasca",
    "morcilla dulce",
    "vasca con pasas y nueces"
  ]
};
