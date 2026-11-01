# COACH-92 · Ejecución UAT de piloto — Nutrition Coach

**30/10/2026 | PR #37 DRAFT | protocolo para pruebas físicas, NO acta aprobada**

## Qué se puede probar hoy y qué NO

La candidata incluye suites automáticas Chromium/WebKit, emulación Android y Supabase GoTrue JWT/SQL local con usuarios ficticios. **No se ha confirmado uso físico real del nuevo circuito en iPhone, Android ni escritorio**. El backend nuevo no existe todavía en Supabase alojado (auditoría previa 13/14 requisitos ausentes). No usar la URL productiva actual para simular un relanzamiento que NO está desplegado.

**Piloto legal:** en entorno aislado, usar textos de prueba inequívocamente marcados «SIMULACIÓN / NO VIGENTE», y verificar pantalla, botones separados Términos y Privacidad, prueba de rechazo, aceptación por identidad/versión/hash/fecha de servidor y reaceptación ante versión nueva. **No registrar aceptación ficticia en cuentas productivas**. Para pilotos con personas reales hace falta una información mínima de tratamiento de datos válida, con responsable y canal de contacto reales; el contrato comercial definitivo y el módulo de datos clínicos quedan para otra etapa. Los documentos editoriales v0.9 NO son textos vigentes.

## Requisitos del ensayo en dispositivos reales

- Previo: restore real DB+Auth+Storage privado verificado o entorno segregado y autorizado, usuario/coach de prueba, datos NO clínicos, textos de prueba y flags del circuito coordinados únicamente en staging.
- Identificar evidencias por IDs `UAT-01`…`UAT-12`, con fecha, equipo, sistema/versión, navegador, modo Safari/Chrome vs PWA instalada, commit exacto, PASS/FAIL/BLOCKED y resultado observado.
- Capturar solo pantallas con cuentas ficticias, sin correo real, datos de peso/salud reales, tokens, comprobantes auténticos ni claves.
- Repetir cada escenario crítico en **iPhone Safari+PWA**, **Android Chrome+PWA**, y escritorio. Emulación Playwright/WebKit/Pixel no sustituye resultado de teléfono físico.
- Si falla una prueba crítica, NO activar flags en producción, NO fusionar PR, NO desplegar.

| ID | Prueba concreta | Resultado esperado | Estado inicial |
|---|---|---|---|
| UAT-01 | OTP, nueva sesión, sesión recordada y logout | Acceso correcto, roles preservados y ninguna sesión ajena | PENDIENTE FÍSICO |
| UAT-02 | Términos simulados, Privacidad simulada, rechazo/reaceptación | Sin aceptación premarcada; cada documento requiere acción explícita; hash/version son de servidor | PENDIENTE FÍSICO |
| UAT-03 | Alumno antiguo entra por primera vez a versión Coach mayor | Ficha nueva vacía; conserva diarios, metas, habituales, mensajes y pagos anteriores | PENDIENTE FÍSICO |
| UAT-04 | Alumno conserva ficha privada, comparte, revoca | Coach solo recibe ficha compartida de su organización; revocación corta acceso | PENDIENTE FÍSICO |
| UAT-05 | Bienvenida Nutrición Con-Ciencia 8 pasos | Una sola vez por cuenta, botones de avance y pestaña vertical permanente; último panel serotonina | PENDIENTE FÍSICO |
| UAT-06 | Coach modifica meta y 5 comidas; publica y reintenta | Publicación atómica + aviso único; conserva plan anterior hasta aprobación; evita duplicados | PENDIENTE FÍSICO |
| UAT-07 | Mientras Coach edita, alumno revisa/revoca ficha | Fallo seguro por revisión o permiso desactualizado, sin publicación parcial | PENDIENTE FÍSICO |
| UAT-08 | Diario diario: grupos, omitir, plato preparado, búsquedas y habitual | Calorías/macros correctos, ninguna entrada duplicada, guardado persistente | PENDIENTE FÍSICO |
| UAT-09 | Android Gboard, gestos MI DÍA, pull-to-refresh y actualización PWA | Composición IME sin pérdida; scroll en toda la pantalla; no recarga ni pérdida de borradores | PENDIENTE FÍSICO |
| UAT-10 | Mensajería, 🔔, informe semanal y respuesta | Chat por alumno/rol, espacio celeste, vista/PDF sin cortes y respuesta entregada | PENDIENTE FÍSICO |
| UAT-11 | Pagos ficticios y Storage privado | Subida/lectura autorizadas; denegación por cuenta/org ajena; fichero real restaurado comparable | PENDIENTE RESTORE |
| UAT-12 | Simulacro corte + frontend antiguo | Cache/cliente antiguo no bypass legal/plan; rollback preserva Auth, registros y recibos | PENDIENTE RESTORE |

## Plan de registros de evidencia

Utilizar matriz en `Control QA` del Plan Maestro con número UAT, estado y vínculo a evidencia privada desidentificada. Si una prueba no se ejecutó, marcar `BLOCKED` o `NOT RUN`; NO crear un PASS por deducción de CI o por capturas sintéticas. La evidencia de un escenario debe corresponder al **mismo commit** destinado a publicar, y anotar Safari/Chrome instalado y versión.

## Política de GO del piloto

Aprobación técnica solo cuando haya: 5 workflows verdes del mismo commit final, restauración auténtica de PostgreSQL/Auth y bytes Storage en entorno aislado con seguridad verificada, migración Coach ensayada sin pérdida, pruebas físicas críticas aprobadas, contenido de privacidad piloto adecuado y GO específico del titular. **Cualquier cambio posterior de código vuelve a requerir CI en el nuevo HEAD**. La promoción de Carla y Autogestión quedan fuera.
