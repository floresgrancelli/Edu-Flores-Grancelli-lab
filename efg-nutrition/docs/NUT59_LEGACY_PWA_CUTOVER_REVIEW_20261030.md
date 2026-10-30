# NUT-59 — PWA antigua ↔ nuevo backend atómico: riesgo de corte y ensayos

**Fecha:** 30/10/2026  
**Repositorio:** PR #37 DRAFT, rama `efg-major-integration-20261029`  
**Estado de publicación:** **NO GO**. No se autoriza un despliegue parcial, cambio de permisos ni SQL en Supabase hospedado.

## Evidencia del cliente publicado, revisada en rama de producción

Se leyó el JavaScript efectivamente incluido en la rama `efg-nutrition-app`, commit de producción conocido `9000e4d8`, **sin usar usuarios reales**. El cliente anterior realiza operaciones REST directas con las tablas existentes:

| Función antigua | Operación observada en `pilot/pilot.js` producción | Efecto tras NUT-57 |
|---|---|---|
| Coach: asignar/revisar objetivo | `.from("efg_goals").insert(...)` (dos rutas) | NUT-57 revoca INSERT directo; tab obsoleta recibe error y NO puede crear objetivo aislado |
| Coach: editar opciones de alimentos | `.from("efg_food_plans").upsert(...)` | NUT-57 revoca operaciones directas; tab obsoleta no podrá cambiar la guía mediante REST |
| Coach: aprobar dieta guía | `.from("efg_food_plans").upsert(...).select(...)` | Operación anterior debe FALLAR EN CERRADO; solo la RPC atómica podrá publicar |
| Alumno: registrar comidas | `.from("efg_daily_logs").upsert(...)` | Debe seguir permitido **si** el alumno conserva acceso vigente y cumple RLS; no se revocan las escrituras diarias como parte del endurecimiento de objetivo/guía |

La versión antigua no incluye por definición una lógica capaz de presentar un aviso agregado DESPUÉS a `pilot/version-notice.js`; no se puede actualizar remotamente una pestaña vieja ya ejecutando JavaScript en memoria. El cambio de versión HTML/JS/CSS y la reapertura mejoran las nuevas sesiones, pero **no demuestran que todos los dispositivos ya instalados se hayan recargado**.

## Riesgo para el alumno y el coach

- **Integridad:** lo importante es que una pestaña antigua no pueda sobrescribir la meta o guía ni saltarse controles médicos/legales o emitir dos notificaciones.
- **Disponibilidad/UX:** si la pestaña vieja intenta guardar un objetivo, la operación debe fallar; el coach debe conservar la meta anterior y recibir instrucciones de cerrar y volver a abrir la PWA, sin prometer que el formulario no guardado sobreviva.
- **Disponibilidad Alumno:** el registro de ingestas, la consulta del plan vigente, el peso, mensajería y pagos deben comprobarse por separado y seguir funcionando según sus permisos y consentimientos.
- **Confianza/seguridad:** no habilitar un GRANT de escritura directa antigua para mantener compatibilidad; permitiría eludir la publicación atómica y la revisión de alimentos. El aviso de cliente jamás sustituye controles server-side.

## Pruebas concretas agregadas, sin desplegar

`tests/coach-auth-local-e2e.mjs` ahora usa **GoTrue local con JWT firmados** para simular un coach A con una publicación válida de objetivo + guía:

1. Enviar un `POST efg_goals` idéntico al de una PWA anterior y exigir denegación.
2. Enviar un `PATCH`/un `POST efg_food_plans` desde la pestaña antigua y exigir denegación.
3. Confirmar que **coach y alumno del mismo grupo** siguen pudiendo leer el objetivo y la guía vigentes.
4. Confirmar que **coach de otra organización** no puede leer el objetivo.
5. Revalidar que quedan exactamente **1 meta, 1 guía, 1 notificación y 1 recibo** tras los intentos obsoletos, sin alteración del objetivo ni sus cantidades.

Estas pruebas complementan los checks NUT-57 PostgreSQL 17 de antiguos vs. nuevos y no suponen acceso a la base real. Los datos de pruebas, aceptación legal y evidencia nutricional siguen **FICTICIOS**.

## Corte/recuperación — decisiones necesarias ANTES de GO

1. Revisar paridad total con el Supabase real y validar `GRANT`, RLS, dueños y funciones con JWT de roles reales **en staging aislado**.
2. Mantener un solo lanzamiento y preparar ventana controlada de cambio, con mensajes para coaches que estén editando; definir qué hacer con formularios antiguos no guardados.
3. Requerir reconexión/reapertura de clientes instalados antes de aprobar nuevos planes. No confiar en detectar versión del cliente desde SQL antiguo: sus escrituras REST no envían un marcador que se pueda autenticar inequívocamente.
4. Verificar en **iPhone PWA, Android PWA y escritorio Safari/Mac** la experiencia de cambio con una pestaña antigua abierta, así como registro de ingestas de alumnos, consulta, pagos y mensajería.
5. Probar restauración posterior a COMMIT de todo el proyecto de staging autorizado, con objetivos RPO/RTO y gestión de escrituras concurrentes, y plan de reversión de Render.
6. Revisión clínica de restricciones, términos/privacidad válidos, y Autogestión completa. Solicitar **GO expreso del propietario** antes de fusionar o aplicar migraciones.

**Nunca declarar listo para publicar basándose únicamente en las pruebas sintéticas.** Supabase alojado y Render productivo siguen intactos.
