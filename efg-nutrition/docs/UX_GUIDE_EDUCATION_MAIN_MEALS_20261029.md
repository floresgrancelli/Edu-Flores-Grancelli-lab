# UX-GUIDE-01 · Dietas guía explicadas por grupos de alimentos
29/10/2026 · EFG Nutrition Pro · PR #37 DRAFT · **NO GO / NO PUBLICAR**

## Pedido y alcance
Una persona que comienza a organizar su alimentación necesita distinguir las fuentes de **proteína** y **hidratos de carbono** en la guía de ejemplo, no solamente ver una lista de ingredientes. La misma explicación debe ser coherente entre el borrador editable que revisa el coach y la guía publicada que consulta el alumno. El motor de Autogestión deberá reutilizar esta presentación cuando su circuito sea implementado y aprobado; este cambio **no implica** que Autogestión ya esté habilitada.

### Comidas que cambian de presentación (solo UX)
- **Desayuno, almuerzo y cena:** secciones siempre visibles «🥚 Proteínas» y «🍞 Hidratos de carbono». Cuando corresponda se agregan «🍕 Plato preparado» y «🥗 Verduras y otros».
- **Media mañana y merienda:** conservan la lista clásica y el flujo existente. El registro **media tarde** también conserva su comportamiento clásico; no se agrega selección obligatoria de grupos a ningún horario intermedio.
- Un grupo sin una fuente separada puede estar vacío; se explica sin convertirlo en un alimento ficticio.
- La clasificación explica cómo identificar una **fuente alimentaria**, no afirma que un alimento aporte exclusivamente un macronutriente. La composición nutricional real siempre incluye energía, proteína, hidratos, grasas y fibra del ingrediente o plato.
- **Plato preparado:** tarta de atún, pizza, sushi, empanadas y otras preparaciones mixtas van a su sección y se muestran/contabilizan una sola vez.
- Las **grasas se calculan automáticamente** a partir de TODOS los ingredientes y preparaciones; el usuario no tiene que elegir una fuente de grasa separada.

## Implementación en PR37
- `pilot/guide-meal-education.js`: agrupación pura, independiente de sesiones y DB, apoyada en `guided-meal-picker.js`; preserva referencias y **índice original** de cada ingrediente del plan.
- `pilot/pilot.js`: `guidedDayContents` renderiza cada grupo y una explicación en desayuno/almuerzo/cena, en ambas modalidades `editable=true` y `editable=false`. El coach sigue editando con `data-guideqty=slot:originalIndex` y `data-guideswap=slot:originalIndex`.
- `pilot/guided-meal-picker.css`: diseño de buena lectura en móviles y escritorio; estilos neutros **no constituyen el semáforo médico/dietario**.
- `pilot/index.html`: cambio de versión de módulos y estilos para evitar PWA parcialmente cacheada.
- `tests/guided-meal-picker.mjs`: casos de platos mixtos, ausencia de grupos, 100% de ingredientes preservados con su índice, cifras nutricionales sin cambios y colaciones sin alteración.
- `tests/premium-visual-smoke.mjs`: invoca el renderizador real en modo coach y alumno con datos **ficticios en RAM**, comprueba conteos, índices, ausencia de grupos en colaciones, plato mixto sin duplicar, macros intactos y captura a 390 px y 1280 px en Chromium/WebKit.

## Seguridad y límites
**No se modificó** el generador de planes, el algoritmo de optimización, los cálculos de macros, el formato JSONB de guías, tablas históricas, usuarios, permisos RLS, mensajes, notificaciones, ni contenido ya aprobado. La clasificación es visual y educativa, **no** un indicador de compatibilidad con restricciones médicas ni una recomendación clínica individual.

Faltan QA de dispositivos físicos MacBook/Safari, iPhone y Android y la integración legal/nutricional/DB completa NUT-57. Las pruebas en navegador de CI usan perfiles ficticios, no prueban datos productivos. PR37 sigue DRAFT. `COACH_ATOMIC_PLAN_UI_ENABLED=false`. **Prohibido fusionar, publicar o migrar producción sin autorización explícita.**
