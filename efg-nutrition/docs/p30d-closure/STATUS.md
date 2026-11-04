# P30D — cierre CI P30C, textos de Ingresos y diagnóstico preciso

2026-11-04. Runtime f47cad0f7cb36fac1ca45552e5d181f3be06f88d. Sin GO, merge, despliegue o activación global. No 55/55.

## CI por SHA
- 1223936995dab750f90e504c860abc21c15e29c6: seis SUCCESS, incluidos Auth41895052778 y Visual41895052861.
- a45e9085acdaf48e20a76e8de1e80f3f4bb64fb8: seis SUCCESS; runtime idéntico a1223936 comprobado por diff.
- f47cad0: Security41896799438, PG41896799317, Premium41896799486, Auth41896799267, Educational41896799266 SUCCESS; Visual41896799257 en curso en este registro. Consultar cierre, no heredar resultados. Ningún rerun solicitado.

## Ingresos
Sesión Coach QA A recuperada en preview4173. UI indicaba 0publicados mientras SQL confirma alumno09f08bd9 publicado18:00:33Z. Causa: política efg_access_coach_linked consulta directamente recibos efg_pilot_participation_receipts, cuya RLS solo permite lectura al alumno. No cambiar planes ni históricos para hacer coincidir la vista.
Corregidos textos obsoletos de próxima implementación, ficha futura y mensaje que equiparaba ausencia de filas visibles a ausencia de publicación. Sintaxis, coach-intake-nav, coach-intake-flow y DOM real posterior a recarga PASS. Esta corrección no resuelve por sí sola la lectura alojada.
Preparada access_read_fix_NOT_APPLIED.sql: reutiliza helper PRIVADO YA EXISTENTE coach_pilot_share_active(student,org), conserva coach_id=auth.uid(), no agrega grants, roles, funciones ni lectura directa de recibos. Política con hash guard. NO APLICADA porque el propietario excluye cambios de permisos para obtener PASS; requiere decisión explícita sobre esta reparación concreta.
Ensayo PostgreSQL17/PGlite AISLADO PASS con definiciones reales de ambos helpers: reproduce defecto, coach vinculado recupera estado, otro coach0, recibos privados0, revocación compartir/consentimiento0, alumno inactivo/transferido0, datos preservados y reinstalación rechazada. No JWT alojado. Hash alojado de filas de acceso anterior eb5cada27d724a20612a3d23620156ba.

## Mensajes
Coach QA A envió por UI únicamente a NCC QA Alumno521b41b5 el texto ficticio P30D QA. ID e7ecf163-cea3-49ab-a61f-b5fe1903268b. UI muestra Enviado y SQL confirma actor/coach/alumno/cuerpo exactos. read_atNULL: NO certificar lectura alumno ni respuesta. Primer intento de input falló sin escribir; el segundo envío único fue confirmado. Sin personas reales ni emails externos.

## Pagos y roles
Vista firmada Coach QA A: piloto gratuito, no formulario de pago ni bandeja comercial. Código contiene return temprano para coach/is_test. No habilitar licencia/cobros/cupos para fabricar PASS. Pago alumno→coach, validación admin y organizaciones requieren sus sesiones; no disponibles en el preview actual. Render mantiene sesión CoachQA B, runtime estable: no usarla para certificar candidata. Autenticación por canal seguro; no OTP/secretos en chat. No cobros ni pagos realizados.

## Paquete regenerado, NO APLICADO
Base f47cad0; build ncc-pilot-f47cad0f7cb3; manifiesto major_ncc_f47cad0f7cb3. 44archivos/98módulos/25CSS/10ONpropuestos/5OFFincluidoQA. Manifest hashes y SQLactivate/recover nuevos. git apply --check PASS; ncc-pwa-asset-cutover-pre-go PASS. Generación preliminar ASSETS_ONLY descartada; paquete final PILOT_UI_ACTIVATION_PROPOSAL_NOT_GO. No distribuir preview/dist.

## Estado alojado leído
Render LIVE dep-dbl75l8m7kps739fm1pg, ab7c241cdfa376cab9954fc9b8f12750d2f905d7. autoDeployyes por commit sobre efg-nutrition-app: merge dispara deploy. Supabase:3switchesOFF/0manifiestos;18referenciaspilot_realvigentes hasta2027-02-02T18:44:15.671883Z. Sin modificaciones SQL alojadas en P30D. Solo mensaje QA por sesión firmada.

## Continuar sin reiniciar
Resolver lectura de estado con la reparación concreta propuesta si Edu la autoriza; luego refresh CoachQA y readback sin volver a publicar. Completar alumno/admin por autenticación segura, mensajes recepción/respuesta y pagos ficticios sin habilitar cobros reales. Consultar CI del HEAD documental y runtime exactos. Nuevo GO FINAL solo al resolver pendientes; todavía no solicitado como autorización de despliegue.
Diferidos intactos:9fuentes,lectura alumno2100,reintento firmado plan,PDFposactualización,UATfísica,habitualesdía siguiente,cambio sesión durante escritura. No repetir informe/formato aprobado ni pruebas P30C sin cambios.
