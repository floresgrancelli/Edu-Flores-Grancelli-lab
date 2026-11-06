> Registro histórico de R1/R2. El estado vigente y los nuevos resultados están en `DUAL_WORKSPACE_R3_20261106.md`.

# Contrato de candidata: coach piloto y doble espacio

Este documento describe la base R1. La actualización R2 y el estado de validación vigente están en `DUAL_WORKSPACE_R2_20261106.md`.


Estado: preparación local con fixtures, sin integración en la app y sin acceso nuevo efectivo.

## Decisión de modelo

La identidad autenticada sigue siendo única. `efg_profiles.role='student'` y `organization_id` se conservan para una alumna existente. Una capacidad profesional separada identifica a la misma persona como propietaria de una organización piloto independiente. La alumna no se duplica y sus registros no se trasladan.

El prototipo anterior `COACH_PILOT_10_EXISTING_STUDENT_PROMOTION_STAGING_ONLY.sql` no cumple este objetivo: cambia el rol a coach, pone la organización del perfil en NULL y deja de permitir el seguimiento por el entrenador anterior. Permanece desactivado.

Una nueva cuenta se registra primero como invitación pendiente del espacio profesional. El ensayo de reclamación exige identidad autenticada y correo confirmado coincidentes, crea un perfil de coach solo si no existe y conserva el perfil si entretanto se volvió alumna. No crea credenciales ni realiza OTP. No se implementa pantalla real de login, correo o reclamación en la app.

## RPC propuestas

Todas permanecen sin concesión de ejecución y fuera del cliente actual.

- `ncc_dual_workspace_contexts_v1()`: devuelve la relación personal original y las capacidades profesionales vigentes del UID autenticado. El administrador recibe solo metadatos y cupos de los pilotos candidatos, no fichas nutricionales.
- `ncc_pilot_workspace_create_v1(p_email, p_name, p_seats, p_request_id)`: administrador activo/verificado; cupos 1–10.000; espacio piloto gratuito; capacidad para cuenta existente o invitación pendiente. No convierte su rol.
- `ncc_pilot_workspace_claim_v1(p_request_id)`: únicamente el titular del correo confirmado reclama su invitación. No acepta UID ni rol del cliente.
- `ncc_pilot_workspace_set_seats_v1(p_org, p_seats, p_request_id)`: administrador; bloquea la organización y no reduce por debajo de alumnos activos + invitaciones de alumnos pendientes.
- `ncc_pilot_workspace_invite_student_v1(p_org, p_email, p_name, p_request_id)`: exige capacidad activa y propiedad de esa organización piloto, nunca solo el espacio seleccionado en pantalla.
- `ncc_pilot_workspace_receipt_v1(p_request_id)`: recibo privado del actor, para resolver una respuesta perdida antes de repetir una escritura.

Cada recibo une actor, ID de operación, tipo, carga y resultado. Un ID reutilizado con datos distintos falla. La RPC de invitación y la de cupo bloquean la misma fila de organización; las altas/invitaciones candidatas serializan además el correo. Las rutas heredadas no adquieren necesariamente esos mismos bloqueos: **deben revisarse antes de cualquier integración**.

## Interfaz preparada

Administrador: alta piloto gratuita, cupo configurable y edición de cupo para cada piloto. Alumna/coach: selector entre «Mi seguimiento como alumna/o» y «Mis alumnos». El cambio es de presentación, no una modificación del rol o del consentimiento.

La identidad y la sesión delimitan el estado del cliente. Una respuesta que llega tras cambiar sesión se descarta; la consulta más reciente prevalece. No se usa almacenamiento del navegador. Dos clics comparten operación. Tras un resultado incierto se conserva el mismo ID y se lee el recibo antes del reintento. No se permite cambiar los datos de una operación incierta.

La demo usa `textContent` para textos variables y tiene CSP `connect-src 'none'` y `form-action 'none'`. Sus datos existen solo en memoria. Requiere solamente correos `@example.invalid`.

## Límites deliberados

1. No se modificó `pilot.js`, navegación real, manifiestos PWA, assets del PR #61, base de datos remota o permisos actuales.
2. No se habilitaron políticas de lectura/escritura para el nuevo coach. El módulo de fixture prueba el **modelo propuesto**, no que los helpers existentes ya lo acepten.
3. La migración propuesta solo admite el ensayo sintético marcado. Sus RPC no son ejecutables por `anon`/`authenticated`. No basta remover el guard o conceder ejecución para convertirla en una migración apta para producción.
4. No se hicieron pruebas de aislamiento con JWT reales. La cola JavaScript no sustituye una carrera de transacciones PostgreSQL.
5. El mock no modela el sistema comercial entero, triggers, Storage, publicaciones clínicas o todos los esquemas históricos. Esos circuitos deben conservar sus reglas, licencia y consentimiento originales.
6. La baja/reactivación de alumnos, revocación de invitaciones y cancelación de pilotos no tienen nuevas RPC en esta candidata. Debe integrarse el control de cupos también en esas rutas antes de habilitarla.
7. La licencia de prueba no implica un entorno aislado: `is_test` en la app original significa gratuidad. El aislamiento aquí proviene de no conectar la demo a ningún servicio y usar fixtures desechables.

## Antes de integrar

- Inventariar todas las consultas, RLS, helpers, triggers y RPC que asumen rol exclusivo o una única organización. La UI no puede suplantar al servidor como fuente de autorización.
- Mantener accesos personales por UID y seguimiento por vínculo+consentimiento. Reconocer capacidad profesional solo en la organización del coach autenticado y con licencia/estado pertinente. Ninguna visibilidad adicional del administrador.
- Adaptar roster, ficha, guías, informes, mensajería, pagos y publicación transaccional. Llevar explícitamente contexto profesional y personal; impedir que cachés, receptores o alumnos se crucen.
- Revisar qué pasa con historial, recibos, asesorías y publicaciones cuando se retira capacidad profesional; no revocar por accidente el acceso personal ni el vínculo original de alumna.
- Integrar altas, reclamaciones, reactivaciones y bajas con los mismos bloqueos/cómputos de cupo. Verificar cuenta duplicada, invitación previa y carreras contra las rutas heredadas.
- Ejecutar el SQL preparado en PostgreSQL efímero, comparar con el esquema real sin datos personales y probar recuperación. Después, pruebas con JWT firmados de entorno autorizado, dos coaches, alumna/coach, alumno, admin, anónimo y cuenta inactiva.
- E2E de navegador, tamaños 390/1280 como mínimo, interrupciones, doble clic, cambio de sesión, Atrás/Adelante, revocación concurrente, permisos desactualizados y caída de red.
- Revisar el diff final y autorización antes de aplicar cualquier migración, RLS/grant, activar flags, habilitar personas reales, merge o producción. No utilizar personas reales como fixtures.

## Resultado comprobado

24 tests de Node: PASS. Contratos SQL: incluidos en esos 24, **solo estáticos**. Sintaxis JS: PASS. Fuentes de referencia: hashes sin cambios. SQL/PGlite: no ejecutado por ausencia de motor. Navegador: bloqueado por el entorno. La entrega prepara la funcionalidad, no la declara operativa.
