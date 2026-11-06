> Registro histórico de R1/R2. El estado vigente y los nuevos resultados están en `DUAL_WORKSPACE_R3_20261106.md`.

# Coach piloto y doble espacio: revisión R2

Preparada en carpeta separada. R1 y su ZIP se conservaron sin modificaciones. No se tocó PR #61, cuentas reales, permisos efectivos ni servicios de producción.

## Avances frente a R1

- Adaptador de integración que mantiene `state.profile` y `state.org` personales intactos. El espacio profesional conserva su propio contexto y lista, sin fingir que la alumna cambió a rol coach.
- Panel modular de administrador para alta piloto y edición de cupo; selector personal/profesional; consentimiento profesional explícito y consulta de lista básica sin datos de salud.
- Patch de punto de entrada preparado y aplicado solamente a una copia temporal de la referencia fijada. Permanece `NCC_DUAL_WORKSPACE_CANDIDATE_ENABLED=false`; no llama a RPC ni carga el panel mientras está apagado.
- Aceptación profesional separada del consentimiento y aceptación personal. La simulación impide invitaciones/listado hasta aceptar ambas versiones ficticias. La propuesta SQL refleja esta condición y conserva las RPC sin permisos concedidos.
- Protección de borradores personales sin guardar al cambiar de espacio.
- Respuestas y recibos tardíos rechazados cuando cambia el espacio, además de los cambios de usuario/sesión ya cubiertos.
- Lista profesional validada por organización y por campos permitidos: identidad, apodo, actividad y estado del consentimiento; no admite fichas de salud dentro del resultado.
- Demo autocontenida generada reproduciblemente, con CSP de hash exacto para su script y sin conexiones externas. No fue abierta ni validada visualmente debido a la política del navegador.

## Integración propuesta

`integration/pilot-entrypoint.patch` se basa en `282ce9f8aa204a93be092f0f2d704b36ed667fc5`; los SHA-256 de entrada y salida constan en `integration/base.json`. Se comprobó `git apply --check`, aplicación a copia temporal y sintaxis del resultado. No se aplicó al checkout ni a la rama real. Antes de integrarlo con una revisión más reciente deben revalidarse contexto y regresiones.

El panel usa las nuevas RPC candidatas, no reutiliza handlers que exigen `role='coach'`. Las operaciones de fichas, guías, mensajes y pagos permanecen cerradas en el adaptador hasta completar sus reglas de servidor. El perfil personal y la navegación original no se reescriben.

El consentimiento profesional es exclusivamente ficticio en esta revisión. No representa aceptación de términos reales ni crea un permiso o vínculo real.

## Validación

- **35 pruebas Node PASS**: comportamiento, negativas, transiciones, recibos, contratos estáticos, sintaxis del script autocontenido y hash CSP.
- **Sintaxis JS PASS**, incluido el `pilot.js` temporal con el patch OFF.
- **Aplicación de patch a referencia fijada PASS** y SHA del resultado comprobado.
- **SQL runtime NO EJECUTADO**: no se encontró PostgreSQL, PGlite, Docker/Podman ni un parser PostgreSQL instalado. No se instaló software. Se preparó el ensayo PostgreSQL 17, pero sus resultados no se atribuyen a las pruebas Node.
- **Browser NO EJECUTADO/BLOQUEADO**: el lanzamiento local existente falla por `socket() failed: Operation not permitted`; la interfaz del navegador administrado rechazó la URL `file://` por política, que admite solo HTTP/HTTPS. No se cambió esa política ni se publicó un servidor nuevo. El Mac disponible figura offline y no hay otro entorno conectado para este ensayo.

## Lo que sigue pendiente

1. Ejecutar SQL y carreras de transacciones en un entorno efímero autorizado con motor existente.
2. Probar la UI en navegador permitido, incluyendo panel montado en la app completa, cambios de sesión, revocaciones concurrentes y tamaños móvil/escritorio.
3. Revisar/integrar todas las rutas de servidor: roster, consentimiento, fichas, publicaciones, mensajes, pagos, reclamación, bajas y reactivaciones con cupos.
4. Validar JWT/RLS reales con cuentas sintéticas y esquema equivalente, sin datos personales.
5. Obtener autorización específica antes de aplicar migraciones/RLS/grants, habilitar cuentas reales, fusionar o publicar. La autorización de preparación y pruebas aisladas no se convierte en autorización de acceso nuevo efectivo.

Esta revisión avanza la integración, pero **no habilita coaches en la app real**.
