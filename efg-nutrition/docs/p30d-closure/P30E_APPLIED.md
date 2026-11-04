# P30E — reparación de lectura aplicada y verificada

2026-11-04. Edu autorizó expresamente la reparación puntual: «Si autorizado». No autoriza GO, merge, despliegue ni activación global.

Migración alojada `p30e_coach_access_read_policy_fix` aplicada con éxito. El SQL histórico `access_read_fix_NOT_APPLIED.sql` **YA ESTÁ APLICADO; no repetirlo**. Se conservó su contenido histórico y hash guard. Preflight: política MD5 `3b9559c3abae4095554cf24e8a588421`, helper existente exacto, filas acceso MD5 `eb5cada27d724a20612a3d23620156ba`.

Postflight: política exige `coach_id=auth.uid()` y `efg_private.coach_pilot_share_active(student_id,organization_id)`. No nuevos grants/roles/funciones; recibos privados sin cambios. Hash de todas las filas de acceso igual al anterior. Tres switches globales OFF y cero manifiestos.

PASS ALOJADO CON SESIÓN FIRMADA: Coach QA A abre Ingresos; Plan publicado pasa de0a1, muestra NCC QA Ingreso20261104 / Plan publicado · acceso completo. Objetivos existentes pasa1a0. Borrador QA antiguo permanece1 y fichas compartidas2. No publicación/republicación, edición de plan o alteración histórica.

Runtime y paquete P30D permanecen `f47cad0f7cb36fac1ca45552e5d181f3be06f88d`, build `ncc-pilot-f47cad0f7cb3`; parche y SQL de lanzamiento siguen NO APLICADOS. El nuevo commit solo documenta. Última consulta CI: runtime5SUCCESS/Visual41896799257encurso; documental1df3cef4SUCCESS/Auth41897616870yVisual41897616893encurso. No reruns.

Pendientes: sesiones alumno/admin para pagos ficticios, recepción/respuesta del mensaje QA y gestión; circuito comercial no certificado por cuenta gratuita. Diferidos del propietario intactos. Próximo GO FINAL aún no solicitado.
