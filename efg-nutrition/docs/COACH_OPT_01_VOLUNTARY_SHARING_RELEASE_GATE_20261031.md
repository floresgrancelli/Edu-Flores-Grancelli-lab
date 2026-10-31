# COACH-OPT-01 · Participación voluntaria y ficha Coach privada
Fecha: 31/10/2026 · PR #37 DRAFT · **NO PUBLICAR**

## Hallazgo
El circuito COACH106/107/111/116 tenía una contradicción con la decisión del propietario:
el checkbox de compartir se exigía para participar, el esquema imponía
`sharing_accepted=true`, el RPC rechazaba `p_sharing=false`, y el estado
`intake` se repetía si el alumno guardaba una ficha privada. Además, el cliente
impedía un primer guardado sin compartir. La aceptación legal general y el
OTP no pueden interpretarse como autorización de seguimiento.

## Corrección preparada en la candidata, con flags OFF
- Dos decisiones independientes: participación afirmativa y permiso de
  compartir **booleano explícito** (puede ser false). Nunca premarcar.
- Recibo versionado: `participation_accepted=true` con `sharing_accepted=false`
  es válido y permite guardar una ficha propia. El coach no recibe esa ficha.
- COACH107 exige permiso de seguimiento y recibo de compartir **solo** si
  `p_share_with_coach=true`. La escritura privada no implica consentimiento.
- COACH111/116 diferencian `intake` pendiente de `private` ya guardada;
  `private` nunca autoriza nuevas escrituras de diario ni una publicación
  de dieta. Revocar el recibo de compartir también revoca `ready` y
  `general_intake_shared`, incluso si quedó `shared_at` antiguo.
- El cliente reconoce `private`, permite editar/revocar/borrar campos de la
  ficha y mantiene acceso a mensajes y educación. No expone la ficha al coach.
- `migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql` prepara
  en una sola transacción el cambio del CHECK y los tres RPC existentes.
  Exige antes la reparación COACH-SEC-09 de ambas policies RLS.
- La migración NO se aplicó a Supabase alojada; no se activaron flags, no se
  cambiaron usuarios, planes, diarios, pagos ni documentos legales.

## QA
- Pruebas Premium de UI, selección independiente, recibos, estado privado y
  regresiones de rechazo; Auth local GoTrue con identidades ficticias, opt-out
  seguido de opt-in y aislamiento RLS; contrato estático del SQL correctivo.
- Consultar **5/5 CI del mismo HEAD final** y logs de los tests antes de
  declarar PASS. No equivale a staging fiel, restauración, UAT física o GO.

## Pendientes reales
1. Ensayar migración correctiva sobre copia fiel aislada del esquema hospedado,
   después de COACH-SEC-09, con JWT A/B y cambio de organización.
2. Verificar el estado privado y el plan anterior en iPhone, Android y PC;
   ofrecer lectura de historia y guía previa sin permitir escrituras no
   autorizadas ni obligar a compartir. Actualmente la pantalla privada es
   mínima y **NO satisface todavía el acceso histórico completo**.
3. Completar texto jurídico aprobado, fuentes nutricionales revisadas,
   publicación atómica COACH119, restauración DB/Auth/Storage y QA de 55
   requisitos. Datos clínicos siguen OFF.
4. Conservar Autogestión OFF y Carla post-GO. No merge, no deploy, no
   modificaciones hosted ni gastos sin GO expreso.

**Resultado de esta etapa:** corrección candidata preparada, no instalada ni
certificada para producción. **NO GO**.

## Corrección adicional de auditoría · 31/10/2026 (COACH-OPT-02)

Se detectó una contradicción concreta en **dos** archivos SQL: aunque el
texto decía que compartir era opcional, el primer guard de
`efg_submit_coach_relaunch_intake` exigía `r.sharing_accepted` aun cuando
`p_share_with_coach=false`. Esto impedía guardar una ficha privada con un
recibo válido de participación y rechazo explícito de compartir.

Corregidos SOLO en PR37 DRAFT:
- `migrations/20261030_coach_relaunch_general_pilot_intake.sql`.
- `migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql`.

El guard inicial ahora exige **participación vigente, misma identidad y
organización, y recibo no revocado**, sin exigir compartir. El segundo guard
mantiene `sharing_accepted=true` y consentimiento de seguimiento cuando
`p_share_with_coach=true`. Se agregó regresión estática al test
`tests/coach-optional-sharing-contract.mjs` para impedir que vuelva a
introducirse el bloqueo incondicional.

**Alcance de evidencia:** cambio de fuente y prueba estática añadida;
verificar CI del SHA final y ejecutar ensayo PostgreSQL/JWT sobre la
migración correctiva y una copia fiel antes de considerar funcional el flujo.
NO SQL hospedado, NO GO, sin activar banderas ni publicar.

## Corrección de seguridad adicional · COACH-OPT-03 · 31/10/2026

Hallazgo de lectura: la policy `efg_coach_relaunch_shared_coach_select`
permitía SELECT al coach cuando `shared_at` seguía presente y el permiso de
seguimiento estaba vigente, aunque el alumno ya hubiera cambiado el recibo
independiente a `sharing_accepted=false`. La ruta privada COACH116 sí
bloqueaba `ready`, pero eso NO revocaba por sí solo la visibilidad SQL.

- La definición de la policy en
  `migrations/20261030_coach_relaunch_general_pilot_intake.sql` ahora
  exige `r.sharing_accepted is true`, además de identidad, organización,
  participación y seguimiento.
- La migración correctiva
  `migrations/20261031_coach_optional_sharing_NOT_APPLIED.sql`
  incluye `ALTER POLICY` transaccional para instalaciones anteriores, con
  preflight de la policy. No borra `shared_at`, fichas ni historial.
- `tests/coach-opt-out-rls-auth-local-e2e.mjs` verifica con GoTrue/JWT
  ficticios: coach puede leer tras compartir; opt-out del recibo impide
  SELECT **inmediatamente**, sin reescribir la ficha; propietario conserva
  revisión; re-opt-in restaura permiso y revocación de participación lo
  retira otra vez. La nueva etapa del workflow aplica COACH111/116 y
  el correctivo sobre un Supabase LOCAL descartable con CHECK legacy
  reproducido; NO sobre el proyecto alojado.

**Estado:** código y prueba incorporados a PR37 DRAFT; resultado del nuevo
SHA CI por confirmar. La reproducción de CHECK en una base sintética
NO equivale a una restauración fiel de DB/Auth/Storage ni a autorización
para ejecutar la migración alojada. COACH-SEC-09, legal, clínica, UAT y
COACH119 siguen siendo bloqueantes. NO GO.
