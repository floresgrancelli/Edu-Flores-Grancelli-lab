# Actualización controlada sin servicios adicionales — paquete backend de piloto
**Nutrición Con-Ciencia · 02/11/2026 · PR43 DRAFT · PREPARADO, NO EJECUTADO.**

## Resultado
Se agregó el generador `efg-nutrition/tools/prepare-pilot-coach119-release.mjs` para unir exactamente cuatro scripts **ya existentes** (SEC09 → OPT01 → corrección URL alimento → COACH119 general) en **una sola transacción PostgreSQL**. Verifica el Git blob SHA1 de cada fuente, rechaza cambios no revisados y exige confirmación explícita **solo para emitir SQL**. No tiene conexión ni credenciales a Supabase, no ejecuta ninguna consulta, no crea ramas de pago ni despliega Render.

La transacción conserva el flag `pilot_coach_atomic_publication` desactivado y aborta con rollback antes de commit si falla alguno de los controles estructurales internos. Esto limita el riesgo de que queden instaladas solo algunas de las cuatro correcciones. **No demuestra que los datos estén respaldados ni revierte cambios ya desplegados anteriormente.**

### Fuente y límites
- `20261031_coach_relaunch_owner_org_rls_fix_NOT_APPLIED.sql` — RLS de propietario con organización correcta.
- `20261031_coach_optional_sharing_NOT_APPLIED.sql` — compartir voluntario y revocable.
- `20261031_coach_reviewed_food_url_constraint_fix_NOT_APPLIED.sql` — URL de fuentes válidas.
- `COACH119_HOSTED_ATOMIC_RELEASE_CANDIDATE_NOT_APPLIED.sql` — publicación conjunta de meta, guía, acceso y aviso, con switch OFF.
- **No incluir** el paquete `private-installation/installation/` con módulos clínicos, ni publicaciones Health/Personal/autogestión. Los 55 requisitos siguen presentes; clínica es POST-GO OFF.

## Generar e inspeccionar el archivo (sin conectarse)
Desde la raíz del checkout de PR43, revisada la rama y commit:
```bash
node efg-nutrition/tools/prepare-pilot-coach119-release.mjs --check
node efg-nutrition/tools/prepare-pilot-coach119-release.mjs --emit --ack=PREPARE_ONLY_NOT_GO > ncc-pilot-coach119-operator-review.sql
```
**Es solo una propuesta para lectura humana:** el segundo comando NO aplica SQL y no implica GO. Verificar su hash SHA256 y compararlo con el reporte `--check`. Conservar el SQL y los respaldos fuera de repositorios públicos; el SQL no lleva secretos, pero no debe confundirse con un release aprobado.

## Bloqueantes antes de ejecutar sobre el Supabase actual
1. **Autorización GO expresa de Edu** para cambios de schema productivos. Esta aprobación todavía NO fue otorgada.
2. **Backup fechado y recuperable** de PostgreSQL/Auth; verificar separadamente los objetos físicos de `efg-receipts` y cómo revertir, sin exponer credenciales ni descargar datos sensibles a GitHub. Los recuentos de filas no son backup.
3. Preflight de solo lectura contra esquema real; comparar metadata actual y verificar ninguna migración inesperada entre preparación y ejecución. En un único mantenimiento acordado, operar con usuario autorizado y `ON_ERROR_STOP`; comprobar estado de la transacción y flags OFF. No copiar SQL en el frontend.
4. Posinstalación: `efg-nutrition/tests/sql/coach119-postinstall-readonly-preflight.sql` y JWT A/B de cuentas de prueba autorizadas. **Los checks de documentos y fuentes seguirán en falso** hasta tener avisos reales y menú aprobado: no activarlos por el solo hecho de que el DDL terminó.
5. Solo después: documentos Términos/Privacidad PILOTO con responsable, domicilio/contacto y retención reales; dos aceptaciones persistidas; referencias alimentarias exactamente cotejadas en el menú; E2E nuevo/existente; UAT iPhone/Android/desktop; aceptación y GO para habilitación de interfaz/flags y despliegue final.

**NO APLICAR** en producción automáticamente: el generador prepara SQL, no lo ejecuta. No promete rollback de un despliegue confirmado ni copia completa de Storage. Mantener Render producción en `9000e4d8` hasta GO.
