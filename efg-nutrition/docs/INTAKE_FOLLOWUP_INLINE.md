# Autorización de seguimiento desde la ficha inicial

El paso 4 permite autorizar el seguimiento sin salir de la ficha. Se reutiliza el consentimiento existente: el alumno confirma explícitamente el alcance y el envío de la ficha es otro toque. Cancelar o un error al guardar la autorización dejan los campos tal como estaban. Si ya se había autorizado, aparece directamente el envío.

No cambia el contrato de términos, participación, autorización específica de salud, acceso del coach ni las comprobaciones del servidor. No introduce permisos automáticos ni modifica políticas de base de datos. El permiso separado de compartir en el piloto sigue siendo necesario.

Pruebas de contrato:
- `node --test efg-nutrition/tests/intake-send-on-save.test.mjs`
- `node efg-nutrition/tests/coach112-pilot-general-intake.mjs`
- `node efg-nutrition/tests/approved-release-flags.mjs`

Prueba móvil y escritorio con datos ficticios y sin acceso remoto: `node efg-nutrition/tests/intake-followup-browser.mjs` (requiere Playwright y Chromium). Comprueba que cancelar no autoriza, un error conserva el formulario y autorizar no envía hasta el clic explícito.
