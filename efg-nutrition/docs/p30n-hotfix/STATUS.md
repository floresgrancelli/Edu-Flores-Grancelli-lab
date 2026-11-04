# P30N — ficha privada y permiso de compartir

Incidente observado en video del propietario después de P30M. Logs PostgreSQL 2026-11-04T21:28:38–21:29:30Z confirman `Separate pilot coach-sharing permission required`. La casilla de compartir de la ficha no sustituye el permiso separado del piloto.

Corrección limitada a frontend: comprobar el recibo vigente antes del RPC cuando se solicita compartir; mostrar una instrucción concreta dentro del formulario, conservar campos y permitir guardar privado con la casilla desmarcada. El recorrido existente Privacidad → Revisar permiso del piloto permite autorizar compartir por decisión explícita. Sin consentimientos automáticos, cambios SQL, históricos, roles, cupos ni costos.

Versionadas únicamente la entrada y las dos dependencias modificadas con `ncc-pilot-3a40474052be-intakefix1`. El identificador de release del servidor se conserva para evitar otra reautenticación. Manifiesto P30K original intacto; cuatro diferencias de runtime quedan fijadas en asset-overrides.json y verificadas en el contrato de release.

Pruebas dirigidas: falta de permiso no llama al RPC; guardado privado conserva revisión; permiso explícito posterior permite compartir la revisión siguiente; autorización de seguimiento independiente; cambios de cuenta, datos sensibles y conflictos siguen bloqueados. Resultado sintético PASS. No se modificaron permisos de usuarios reales para simular el éxito. Verificar despliegue y reintento del propietario antes de afirmar que su ficha real quedó guardada.

## Continuación P30N — coherencia PWA (2026-11-04)

Se retomó exclusivamente PR #54 / `hotfix/ncc-intake-sharing-permission-20261104`, padre `60a7e089d1d253a751f233dd07650b962ffaddf0`. El hilo anterior figuraba idle y el remoto conservaba ese SHA antes de editar; no se abrió otra rama ni se modificó producción.

Premium 41917819646 falló por igualdad literal build/entry en `version-notice-opt-in`; Visual 41917819637 falló por la misma premisa en el preparador PWA, antes de ejecutar la prueba de ficha nueva. Security y Auth del padre pasaron; no se relanzaron. El build HTML también se compara con el release firmado al confirmar reautenticación, por lo que no se cambia para un hotfix menor.

`tools/pwa-build-identity.mjs` centraliza el contrato: una release normal exige igualdad exacta; una versión de asset distinta exige el manifiesto P30N con SHA256 fijo, identidad de release exacta, URL exacta y hash del HTML exacto. El test y el preparador usan el mismo contrato. Casos negativos rechazan versión desconocida, release alterado, meta duplicado, HTML alterado, manifiesto ausente o alterado. El detector de actualizaciones se prueba además con release igual y URL nueva, sin popup ni recarga. No cambian runtime, manifiestos, permisos, consentimientos, SQL ni flags.

Validación local con Node 24.22.1 (sin el flag obsoleto `--experimental-default-type=module`):
- `tests/version-notice-opt-in.mjs`: PASS, incluidos pin del hotfix, casos negativos y detección de asset con release estable.
- `tests/ncc-pwa-asset-cutover-pre-go.mjs`: PASS con `TMPDIR=/private/tmp` (ruta canónica macOS; el alias `/tmp` hace fallar el control preexistente de ubicación de salida). Propuestas únicamente temporales; cero llamadas alojadas.
- `tests/coach112-pilot-general-intake.mjs`: PASS; permiso ausente sin RPC, guardar privado revisión 1, consentimiento separado simulado y compartir explícitamente revisión 2, seguimiento independiente, revisión obsoleta, revocación y cambios de sesión antes/después del RPC.
- `tests/coach-relaunch-entry-client.mjs`, `tests/release-01-01-new-returning-students.mjs`, `tests/student-session-mutation-races.mjs`, `tests/ux35-session-release-contract.mjs`, `tests/ux35-major-release-reauth-client.mjs`, `tests/coach122-major-per-device-cutover.mjs`: PASS.
- `tests/coach-pilot-privacy-visual-qa.mjs`: ampliado para formulario NUEVO real, 360/1280 px, dos intentos sin permiso (cero RPC), dos errores backend al elegir privado, campos y checkbox preservados, cambio de cuenta sin escritura. Transporte ficticio y tráfico externo bloqueado. Capturas `pilot-intake-permission-{engine}-{width}.png`; CI ejecuta Chromium y WebKit. Ensayo local con Chrome instalado y adaptación temporal de lanzamiento/cierre, sin modificar aserciones; el cierre de Chrome del sistema necesitó límite temporal. La autoridad final del test completo es el CI del nuevo SHA, no los checks del padre.

Plan Maestro leído desde Drive: archivo Excel (MIME XLSX), última modificación observada `2026-11-04T21:24:23.575Z`; últimas entradas del contenido recibido: Continuidad índice 551 y Control QA índice 576, P30M LIVE/activación. No se reinterpretan esos registros como autorización de merge de P30N. Actualización del Excel pendiente; evidencia conservada aquí sin reemplazar el archivo completo.

Sin merge, aprobación, despliegue, activación, SQL alojado, credenciales ni datos reales. Guardado del usuario y UAT física siguen sin verificar; no afirmar que la ficha real quedó guardada. Consultar los checks del SHA final en PR #54 antes de cualquier decisión de publicación.
