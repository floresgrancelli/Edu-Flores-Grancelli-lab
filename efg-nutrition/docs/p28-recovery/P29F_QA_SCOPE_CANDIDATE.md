# P29F — Alcance QA validado e instalado vacío

4 de noviembre de 2026. El acceso P29D sigue instalado; no reaplicar su migración.

## Código nuevo

- `20261104_qa_scope_registry_NOT_APPLIED.sql`: registro privado sin filas iniciales, RLS sin políticas cliente, sin permisos anon/authenticated. Alumno/org/coach, máximo24h, revocación explícita. Función privada verifica actor firmado, perfiles activos, rol coach, organización is_test y asignación vigente; bloquea esas filas durante la transacción.
- Inscripción inválida/vencida/revocada LANZA42501. Nunca retorna false y cae en el diario legacy. La inscripción no debe eliminarse al expirar; la eventual salida de QA requiere revisión independiente.
- `20261104_qa_scope_consumers_NOT_APPLIED.sql`: candidato que conecta los tres controles con reemplazos exactos, hashes de las definiciones alojadas y rechazo ante cualquier deriva. Publicación y salud consultan alcance coach; diario consulta propietario OLD y NEW para evitar escapar cambiando dueño. Conserva excepción service_role de mantenimiento. Ningún interruptor se enciende ni se elimina validación nutricional/sanitaria.

Paquete único generado por `scripts/p29-qa-scope-bundle.mjs`, probado y YA INSTALADO como `p29_qa_release_scope_empty`. Los nombres NOT_APPLIED son históricos: NO REAPLICAR. Registro vacío; ninguna cuenta habilitada. Tres interruptores globales OFF.

## Prueba ejecutada

`tests/p29-qa-scope-pglite.mjs` ejecuta el SQL real del registro en PostgreSQL17.5 WASM descartable. PASS: no inscripción, coach/alumno correcto, actor contrario/anónimo, rol inválido, organización no test, cambio coach/org, inactividad alumno/coach, rol coach cambiado, vencimiento, revocación, rollback, límite24h y privilegios cliente denegados. La primera impresión de versión devolvió undefined por columna equivocada; corregida y repetida con17.5. No falló ninguna aserción SQL.

Prueba adicional `p29-qa-scope-consumers.mjs` ejecuta las tres definiciones alojadas exactas archivadas en tests/evidence/p29f-hosted-function-baseline.json, con dependencias sintéticas explícitas. PASS: hashes previos, rollback del paquete entero ante deriva (incluida desaparición de tabla nueva), bloqueo atómico fuera QA, avance QA hasta autorización existente, declaración sanitaria obligatoria, diario bloqueado sin ready y permitido con ready sintético, cambio dueño/actor ajeno/revocación rechazados, cuentas fuera QA conservan legacy. Comparación textual verifica que TODAS las validaciones atómicas previas permanecen idénticas salvo activación acotada. No acredita publicación positiva completa, concurrencia ni JWT real; coach_has_student y entry_status son dependencias sintéticas en esa prueba. Próximo: inscripción específica con vigencia solo al iniciar sesión de prueba, revisión nutricional real, publicación firmada/reintentos/historial/MiDía. No modificar reviewed para forzar un PASS.

## CI anterior

API de workflows para08ccefab: PostgreSQL41865256134, Educación41865256362 y Seguridad41865256250 reportan completed/success; Premium41865255853, Visual41865256566 y JWT41865256016 in_progress. Sin reruns. La consulta de jobs de PostgreSQL devolvió job126697752354 sin conclusión ni pasos; por esta inconsistencia no se atribuye todavía un resultado individual al step de acceso nuevo. Conservar evidencia del workflow y comprobar detalle cuando esté disponible.

No publicación de producción, catálogo cambiado, aprobaciones humanas ni datos históricos alterados.

## Instalación alojada y lectura posterior

apply_migration success. MD5 finales: atomic c49d9e2557a9dcdcecd1e812cc2bd54f; health aab2cadf3127c6da54e490b0b75bc03c; diary21d96448a268dc423c96eedd2e463b9a. Preflight:5 accesos/hash228814977745a95e941f5ef503aeccb6,9 objetivos,28 diarios,0recibos. Postflight registrado en Plan Maestro. Registro nuevo0filas, ningún alumno habilitado.

Advisors: RLSsinpolítica12→13 por tabla privada intencionalmente inaccesible al cliente,36RPC privilegiadas y1proteccióncontraseñas sin cambios. Referencia https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .
