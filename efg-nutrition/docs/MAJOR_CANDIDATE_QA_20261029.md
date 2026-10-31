# Candidata mayor — 29/10/2026 — NO PUBLICAR

PR de integración: https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/pull/37
Rama remota: `efg-major-integration-20261029`.
Primer commit integrado: `3ba64a8cdaccf9e8e2a44190d10db82e2d90a364`.
Árbol verificado local/remoto: `03005ba3bee14689ab95f82d1226939414209f99`.
Este documento acompaña una segunda entrega: release-flow + prueba aislada (OFF).

## Procedencia conservada
| PR | HEAD integrado |
|---|---|
|33 UX|c82a9b061e1b86b9f748c8d76ec6e7dfae86cb6c|
|35 catálogo|d683de64daee8171f6cc269b14f263b4726db32f|
|34 Coach/legal|6d1d0d93d1e874c61d8fc94c63ba926ef2f361b9|
|36 patrones|5b410f4521cdff1faf8897d5b7b77dc9e7d78384|

Conflictos resueltos: index.html (versión de entrada candidata); pilot.js (combinar habitualSelection con campos de ficha y limpiar ambos en logout); workflow Premium (conservar pruebas UX y Coach/legal). Sin conflicto pendiente en el árbol integrado. PR originales sin modificaciones de sus ramas.

## Matriz de aceptación
| Control | Resultado real | Evidencia / límite |
|---|---|---|
|Regresiones locales de código integrado|21 suites PASS|local-qa-20261029.json; no JWT real|
|Orquestador relanzamiento|PASS sintético, cuatro roles|tests/release-flow.mjs; sin adapter de backend real|
|Seguridad estática primer HEAD|PASS CI|40933045737|
|Premium QA primer HEAD|PASS CI|40933045656|
|Chromium/WebKit primer HEAD|Consultar resultado del run|40933046008; no equivale a dispositivo físico|
|Navegador local|BLOQUEADO|Binarios ausentes; descarga Playwright devuelve ZIP inválido; chromium no arranca|
|Fichas/guías|PASS tests sintéticos|SQL DRAFT no aplicado; RLS/RPC JWT pendientes|
|Semáforo|PARCIAL OFF|Motor puro nuevo con evidencia por identidad/fuente/fecha; no conectado a selectores ni catálogo real. Evidencia sintética example.test NO es fuente nutricional|
|Restricciones clínicas|NO IMPLEMENTADAS|Celiaquía/alergias/condiciones quedan amarillo; ninguna inferencia de seguridad. Requiere reglas revisadas e información confiable|
|Sin restricciones|PASS sintético|Neutral independientemente de calorías/macros; distintivo de plan aparte; registro siempre permitido|
|Legal backend / tokens antiguos|PENDIENTE|Contrato y UI borrador; sin persistencia real ni enforcement SQL|
|Avisos grandes|PARCIAL OFF|Separación preview/reauth/live, copy por rol, orquestación con guardas; falta backend, registro confiable y diseño visual premium ilustrado|
|Actualizaciones menores|IMPLEMENTADO en candidata|No banner/confirm/recarga desde version-notice. Mantiene detección no-store y diagnóstico manual inline; no altera service worker|
|Personal|BASE TÉCNICA|Sin entitlement backend ni experiencia completa|
|Restauración|NO EJECUTADA|No backup restaurado ni migración de ensayo|
|Producción|SIN CAMBIOS|Render LIVE 9000e4d8e08bd9483770209a863b1cdba2141c43; rama productiva no tocada|

## Staging y recuperación: procedimiento concreto pendiente
1. Proyecto productivo `cyjvddhimbsfipjfctsl` ACTIVE_HEALTHY; list_branches devuelve []. Crear rama solo después de confirmar moneda, alcance y autorización de costo: herramienta devuelve amount 0.01344 / hourly sin moneda explícita. No se creó recurso.
2. Alternativa sin costo cloud: Supabase local en máquina con Docker, CLI/versiones fijadas; en esta sesión no se inicializó. No importar datos personales productivos.
3. Crear dos organizaciones ficticias A/B con coach y alumno de ensayo, un admin, un alumno histórico y uno nuevo; UUID reales de Auth de staging. No registrar correos reales. OTP por buzón de ensayo local o cuentas autorizadas.
4. Inventariar migraciones de producción y reproducir solo esquema en staging; revisar disparadores, cron, Edge Functions y canales antes de cargar fixtures. Deshabilitar todos los envíos externos en el entorno aislado.
5. Capturar baseline: conteos de fixtures, permisos, funciones, políticas, metas, diarios y hashes de guías. Respaldar staging y verificar restauración en una segunda instancia vacía, ANTES del nuevo SQL.
6. Ejecutar matriz existente `../COACH_STAGING_TEST_MATRIX.md` y casos del contrato `../legal/LEGAL_ACCEPTANCE_BACKEND_CONTRACT_DRAFT.md` mediante HTTP con JWT reales. Probar bypass REST/RPC, cambio de organización, revocación, expiración y reintentos.
7. Ensayar migración fallida deliberadamente solo en staging, restaurar backup, comparar baseline de fixtures. Registrar comandos/versiones, tiempos y resultado; no confundir rollback transaccional con restauración.
8. Nunca habilitar flags legales, Personal, compatibilidad o campaña antes de pruebas independientes de servidor y aprobación jurídica/científica. El backend debe decidir identidad, versión/hash y timestamp; recibos del adapter JS no reemplazan políticas RLS.

## Inventario leído de funciones privilegiadas
Consulta de catálogo pg_proc/pg_namespace (solo SELECT; sin datos de usuarios): RPC públicas efg_* de negocio no daban EXECUTE a anon; varias sí a authenticated y requieren auditoría de cuerpo/roles. `efg_private.verify_guide_goal` apareció SECURITY DEFINER con privilegio de ejecución anon: es inventario, NO prueba de endpoint explotable; verificar tipo trigger, permisos USAGE del esquema y cuerpo antes de cambiarlo. No se corrigió un supuesto problema no demostrado.

## Condiciones de salida
Publicación continúa congelada. No SQL nuevo ni Auth en producción, no cierre de sesiones reales, no envíos. Falta revisar capturas del HEAD final, dispositivos físicos, backend legal/campaña/Personal, fuentes de alimentos, diseño premium e ilustraciones y circuito completo de staging/restauración. Completar responsable contractual, CUIT/domicilio/contacto, pagos/retención y revisión jurídica argentina. Autorización de lanzamiento posterior e independiente.
