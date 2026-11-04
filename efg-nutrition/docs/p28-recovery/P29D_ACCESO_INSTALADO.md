# P29D — Acceso pendiente instalado y QA reparado

P29D · 2026-11-04. BLOQUEANTE DE ACCESO RESUELTO. CI7cd73e8 seguía queued: PG41864215014/job126694079936 sin runner/pasos. No rerun ni PASS de CI inventado.
Validación local alternativa: paquete @electric-sql/pglite@0.3.14, motor reporta PostgreSQL17.5 WebAssembly, base exclusivamente en memoria. Test tests/coach119-new-student-access-pglite.mjs adapta las mismas sentencias/aserciones del test nativo, sin GITHUB_ACTIONS ficticio ni conexión alojada. PASS: inserción, transición coach→student conorg bajo CHECK real, repeticiones, exclusióncoach, preservaciónpublicados/pausados, rollback conjunto y EXECUTE anon/authenticated denegado. No certifica concurrencia, JWT firmado ni full parity. Primer intento de adaptación falló por paréntesis await y se corrigió antes del PASS; migración aún no ejecutada en ese momento. Binario PG17.6 nativo descargado pero NO arrancó: chown/runuser no permitidos. No se eludieron permisos; se usó motor en proceso.
Migración EXACTA remota/local SHA256 c2cdf02b9a74cbaf974e39650b2c2458df861d48c72bf4d311eba8218f359e71 aplicada a Supabase como p29_new_student_pending_access. Archivo 20261104_new_student_pending_access_NOT_APPLIED.sql conserva nombre histórico: YA APLICADO, NO REPETIR.
Pre/post instalación:4 accesos, MD5 agregado97076432f756b06e7a99590fc1a6b903 idéntico. Trigger instalado AFTER INSERT/UPDATE role,organization_id; función privada SECURITY DEFINER search_path vacío, EXECUTE anon/authenticated=false.3switchesOFF. Supabase reporta PG17.11.
Prueba alojada administrativa en transacción: no-op organization_id del único alumnoQA autorizado disparó trigger y generó pending/org/coach correctos; ROLLBACK y readback restauraron4filas/hash original. No es sesiónfirmada.
Reparación aditiva posterior guardada: INSERT SELECT restringido a alumnoQA activo/student/orgis_test/coach exacto, exige trigger habilitado y switchesOFF; ONCONFLICTDONOTHING + exige1fila. Readback:5accesos totales; QA pending, published_goal_id/published_at/published_byNULL, updated_at2026-11-04T16:13:05.781061Z;4filas previas hashidéntico. Borradorv1/statusdraft/foods_verified=false. Sin publicación ni Render/preview modificados.
Advisorssecurity antes/después mismos tipos/conteos:12RLSsinpolítica,36RPCsecuritydefiner autenticadas,1proteccióncontraseñas. No diagnóstico global nuevo ni corrección fuera de alcance.
Siguiente: completar fuentes/revisiónnutricional real P29C; diseñar habilitación QA acotada sin switches globales; publicaciónfirmada/idempotencia/historial/MiDía. CI completo sigue pendiente.

## Reproducción local

Instalar `@electric-sql/pglite@0.3.14` en un directorio temporal, fuera de la app. Ejecutar `NCC_PGLITE_MODULE=/ruta/node_modules/@electric-sql/pglite/dist/index.js node efg-nutrition/tests/coach119-new-student-access-pglite.mjs`. Crea una instancia en memoria y la cierra al terminar. No usa Supabase ni credenciales.

La validación WASM no reemplaza el CI nativo ni las pruebas con sesiones firmadas. La instalación alojada y la reparación QA ya se ejecutaron; no repetirlas.

