# EFG Nutrition Pro · actualización mayor para pruebas (release candidate, NO autorización de despliegue)

**Fecha de preparación: 29/10/2026. Producción actual conocida `9000e4d8e08bd9483770209a863b1cdba2141c43`.**

## Orden comprobable
| Ola | PR | Alcance | Entrada obligatoria | Aprobación |
| --- | --- | --- | --- | --- |
| 1 · segura | #33 | Mensajes, notificaciones, UX móvil, habituales, accesibilidad y recetas | Work verifica manualmente cuentas ficticias/roles y móviles; CI 3/3 en HEAD exacto; revisión visual; autorización del propietario | No autorizada todavía |
| 2 · catálogo | #35 | Panadería, golosinas, proteínas vegetales y alias | Rebase sobre ola 1 real, resolver conflictos, CI 3/3 integrado, test de buscador/cantidades, fuente genérica explícita; autorización | No autorizada todavía |
| 3 · Coach | #34 | Ficha voluntaria, compartir/revocar, guía 5 comidas, recálculo y publicación explícita del plan | Staging aislado con 2 org/2 coaches/usuarios nuevos e históricos, backup/restauración, RLS/RPC, validación de guía, QA visual autenticada, revisión legal y profesional | BLOQUEADA |
| 4 · legal activa | Dentro #34, *solo después de revisión* | T&C/privacidad versionados, aceptación en servidor, nueva UI accesible | Responsable identificado, condiciones comerciales/retención/plazos, textos revisados, backend legal validado con JWT y control de rol, doble aceptación y rollback | BLOQUEADA |
| Futuro | #36 | Autogestión, motor de patrones y restricciones clínicas | Habilitación propia de Personal, revisión médico-legal, RLS y QA independiente | BLOQUEADA |

## Qué puede probar el propietario mañana
- Si la ola 1 recibe validación y aprobación de publicación: navegación, mensajería, habitual, recetas y notificaciones de la **versión pública realmente desplegada**.
- Si luego se publica la ola 2: buscador, alimentos incorporados, porciones, etiquetas de estimación.
- La ficha, guía dinámico y aceptación legal **no estarán disponibles en la versión pública** mientras ola 3/4 continúen sin staging, validación y despliegue. Pueden revisarse con tests aislados en la rama, pero no hay preview público que represente backend real.

## Stop conditions
- Work no completó revisión PR33 o hay fallas de rol/UX: STOP para publicar PR33/35 encadenados.
- Staging no disponible o costo no aprobado, backup no restaurado, RLS no comprobado con JWT: STOP PR34.
- Términos no revisados por abogado local o faltan identidad/tarifas/retención: STOP aceptación legal obligatoria.
- Macros y restricciones clínicas sin fuentes suficientes: STOP cualquier etiqueta verde de seguridad o dieta clínica.
- CI del HEAD exacto no aprobó 3/3, QA visual manual falló o nueva integración no se probó: STOP.

## Verificación post despliegue (sólo si autorizada)
Registrar SHA/URL `live` de Render; validar vista y PWA cache/version, login OTP, apertura/cierre sesión, roles alumno/coach/admin, diarios, pagos, chats, notificaciones, favoritos y mensajes, revisión móvil. Ante incidente, no borrar datos ni improvisar SQL; documentar rollback del **código** y analizar migración por separado.

**Este archivo no autoriza automáticamente merge, SQL, uso de service_role ni deploy.**
