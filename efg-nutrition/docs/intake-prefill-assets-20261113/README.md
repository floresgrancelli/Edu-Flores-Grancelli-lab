# Precarga de ficha y estilos · candidata

Base verificada: cccc1c09fc4c7ad444c99a0fd7e3838b8a28063d (PR121).

El botón explícito Preparar plan desde la ficha reaplica únicamente los campos producidos por createCoachCalculatorPrefill, después del render que conserva borradores. Conserva otras elecciones del coach y protege el contexto de alumno/vista. No modifica captureViewContinuity ni restoreViewContinuity, cálculos, permisos o datos nutricionales.

Tres hojas de estilo dinámicas usan las mismas URLs que index.html. Conserva ambos nodos y su orden para mantener la cascada; los contenidos CSS no cambian.

La prueba compara producción y candidata en la PWA con transporte RAM ficticio y verifica Chromium/WebKit, 320/390/1280, coach/admin: cinco valores exactos, opciones ajenas conservadas, borrador/cálculo tras render normal, nueva aplicación explícita, aislamiento de otro alumno y sesión y una solicitud por hoja. No representa Auth/RLS alojado o uso físico.

El guard de catálogo incorpora una excepción textual exacta para este delta, respaldada por una comparación completa de pilot.js contra la producción anterior: toda otra semántica y el catálogo deben permanecer exactos. No se quitan comprobaciones.

AssetVersion ncc-intake-prefill-assets-r1-20261113. Servidor ncc-pilot-3a40474052be intacto. NO PUBLICADA; pendiente de capturas y nueva aprobación visual de Edu.
