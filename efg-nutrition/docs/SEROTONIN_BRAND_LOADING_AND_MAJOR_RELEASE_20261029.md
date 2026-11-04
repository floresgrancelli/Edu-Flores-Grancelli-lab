# EFG Nutrition Pro · Serotonina animada como identidad de carga y presentación mayor
**Decisión del titular: 29/10/2026 · PR #37 (DRAFT) · No publicar sin autorización final**

## Identidad visual aprobada
La **molécula de serotonina original en acuarela** (`pilot/assets/serotonina-acuarela.avif`) es la marca visual de las esperas de EFG Nutrition. Preservar proporción, delicadeza y nitidez; no sustituir por icono anónimo, emoji o gif externo. Uso obligatorio para **alumno de coach, coach, administrador y autogestión/Personal** cuando el estado visual lo requiera. El perfil se determina por sesión, nunca con selector manual.

### 1. Pantalla inicial / apertura de sesión
- Mostrar marca EFG Nutrition y serotonina de inmediato en el HTML estático, incluso antes de ejecutar `pilot.js`.
- Movimiento orbital y rotación **suaves y contenidos**, sin desplazamiento invasivo por encima de controles; estado de carga indicado con `role="status"` y texto accesible. La imagen es decorativa (`alt=""`).
- Reutilizar el símbolo para el spinner de arranque; el plato/foto ilustrativa existente puede convivir y no se elimina sin revisión visual.
- Cuando falla login, red o permisos, ofrecer error comprensible y acción de reintento; no mostrar una animación eterna ni ocultar la causa.

### 2. Indicadores de espera dentro de la aplicación
- **Un solo lenguaje visual**: módulo CSS `pilot/serotonin-loading.css`, clase `.efg-serotonin-spinner` y compatibilidad visual con `.spin` existente. Tamaños pequeños proporcionados al contexto.
- Integrar progresivamente con botones al guardar comidas, cargar fichas, aprobar guías, mensajes, informes, navegación y cambios de datos. Conservar siempre el texto/contexto de la acción (por ej. «Guardando tu desayuno…»); un símbolo no confirma éxito.
- Evitar loader cuando no hay espera perceptible; para operaciones rápidas el estado puede ser inmediato sin animación prolongada. No impedir interacción no relacionada.
- No usar progreso ficticio: si la operación tarda, indicarlo, permitir reintentar si corresponde y bloquear únicamente la acción duplicada.
- Componentes con `aria-busy` y región de estado cuando proceda; no emitir anuncios repetitivos. Los cierres de sesión jamás son una consecuencia de un loader.

### 3. Presentación especial de gran actualización
- Exclusivamente en la experiencia mayor `release-communications.js` / `release-flow.js`, que sigue **OFF** y requiere backend listo, autorización del dueño, sesión y aceptación legal cuando aplique.
- La serotonina se mueve suavemente sobre la ilustración de bienvenida, con textos adaptados automáticamente a cada rol. Un botón explícito permite avanzar; sin auto-logout, sin pantalla bloqueante permanente.
- Aparecer **una vez por persona y versión cuando el servidor confirma la vista**; no utilizar `localStorage` como fuente de verdad. El anuncio previo no constituye consentimiento legal.
- Cambios menores: aplicar actualización silenciosa con aviso de versión sin repetir la pantalla grande ni forzar login.

### 4. Accesibilidad y rendimiento
- `prefers-reduced-motion: reduce`: molécula **estática**, siempre visible, sin transformaciones forzadas; respeto a ahorro de energía.
- Diseño responsive en iPhone, Android y escritorio; verificar contraste, recortes del logo, giro legible, layout sin saltos, Safari/WebKit/Chromium y sesiones reales.
- Animar solo `transform` para evitar reflow; no usar vídeos ni GIFs pesados, librerías extra o conexiones externas; asset local compartido. No forzar tiempos de espera artificiales.
- Respetar `aria-hidden` en ilustraciones decorativas y disponer de `role=status`/texto en procesos reales.

### Implementación en PR #37 (candidata, no producción)
- `pilot/index.html`: serotonina en el arranque; conserva imagen inicial y estado accesible.
- `pilot/serotonin-loading.css`: animación orbital suave del logo, símbolo de carga de 36 px, soporte `prefers-reduced-motion`, variante de presentación.
- `pilot/release-communications.js`: añade logo real a la ilustración de la presentación mayor; flag `RELEASE_COMMUNICATIONS_ENABLED=false` permanece inalterado.
- `tests/serotonin-brand-loading.mjs`: contrato estático de identidad, motion, accesibilidad, asset real y control OFF. No sustituye evaluación visual humana.

### Criterios de aceptación para GO
1. Logo exacto (acuarela original) visible en apertura antes de JS, legible y responsive, sin salto de layout.
2. Spinners existentes y nuevos homogéneos; auditar todos los indicadores de carga de cada rol, ninguna espera infinita, errores y reintentos claros.
3. Mayor sólo aparece con **autorización, backend y recibo por usuario/versión**; jamás en menores.
4. Capturas comparativas de iPhone Safari, Android Chrome y escritorio para normal/reduced-motion, light/dark cuando aplique.
5. CI de seguridad, Premium y Visual sobre mismo SHA + QA humano; junto a staging JWT/2 organizaciones, restore, atomicidad Coach, legal, semáforo y Personal. **La identidad visual no modifica la decisión actual NO GO.**

## Estado y limitaciones
Se trata de una **implementación parcial en PR DRAFT**: el símbolo ya está montado en el HTML inicial y en la presentación mayor OFF; el CSS cubre `.spin` y ofrece clase reutilizable para nuevos loaders. Resta auditar y conectar cada indicador interno en flujos reales, evaluar visualmente en dispositivos y verificar errores de carga. **No afirmar cobertura 100%, GO ni publicación.**
