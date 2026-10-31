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
