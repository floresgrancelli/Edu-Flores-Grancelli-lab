# P29W — Paquete regenerado, NO aplicado

Base runtime exacta: 0277ae9109c6f04f93fa038a41119d6bdc16aec3.
Build propuesto: ncc-pilot-0277ae9109c6. Manifiesto: major_ncc_0277ae9109c6.

Sustituye técnicamente el patch P29V tras cambios runtime de fuentes del piloto. P29V permanece histórico.
44 archivos propuestos, 98 módulos recorridos, 25 CSS; 10 flags ON propuestos y 5 OFF, incluido QA_REVIEWED_SOURCES_ENABLED.
`git apply --check P29W_activation.patch`: PASS sobre esta base exacta. Preparador y test de hashes/imports/CSS: PASS. No se aplicó patch a runtime ni se distribuyó preview.

- P29W_asset_manifest.json: hashes exactos de entrada y salida.
- P29W_activation.patch: diff revisable sin aplicación.
- P29W_activate_NOT_APPLIED.sql / P29W_recover_NOT_APPLIED.sql: mismos controles ensayados P29V, nuevos identificadores de build. Generados desde prepareActivation; no se repitió ensayo funcional P29V sin cambios de lógica.
- P29W_sources_candidate_NOT_APPLIED.sql: cambio de fuentes aparte, NO instalado. No confundir activación del recorrido con instalación/aprobación de fuentes.

Prerequisitos siguen abiertos: expediente de fuentes adicionales (5 en muestra equilibrada, 15 entre5perfiles), aprobación humana productiva concreta, validación integral e instalación controlada del backend de fuentes, restantes matriz y nuevo GO. Variables de atestación NO prueban esos hechos ni deben usarse para saltarlos. Una aprobación limitada a13referencias no cubre todas las guías.

CI base964e1ce:5SUCCESS/VisualFAIL. Corrección de fixture7→10flags incluida en0277ae9; CI de ese SHA se consulta por separado. Navegador local no instalado en este runtime: no se afirma PASS visual local; CI ejecuta Chromium/WebKit.

Sin cambios Supabase, Render, fuentes QA, históricos o flags globales. Merge sigue disparando autoDeploy y requiere nuevo GO explícito.
