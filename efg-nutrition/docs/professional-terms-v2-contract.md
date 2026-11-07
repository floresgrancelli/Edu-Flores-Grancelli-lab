> Continuity update: see [release completion and current blockers](professional-terms-completion-20261107.md). This document retains its handoff proposal scope; private v2 implementation and local evidence now exist, with no hosted exposure or enablement.

# Contrato público de aceptación profesional v2

Versión: `ncc-professional-legal-v2-proposal-1`, 2026-11-07.

Estado: **PROPOSED_UNIMPLEMENTED_OFF**. Las RPC descritas no están implementadas ni disponibles. No se aplicaron permisos, SQL, cambios de backend o activación. El frontend sólo puede preparar una fixture OFF. PostgreSQL/API/concurrencia/CAS real: **NOT_RUN**. El contrato profesional sigue UNBOUND. Los avisos simples existentes son propuestas para participantes/alumnos; no se elevan a aprobación profesional.

Este artefacto separado no modifica la candidata privada congelada ni su ZIP. No contiene SQL privado ni implementa publicación de documentos.

## 1. Lectura del bundle mostrado

RPC propuesta: `ncc_pilot_workspace_legal_bundle_v2({p_org})`.

Respuesta:

```
{
  contract_version: 2,
  actor_id: UUID,
  organization_id: UUID,
  scope: "professional_workspace_acceptance_v2",
  binding_sha256: HEX64_LOWERCASE,
  documents: [TERMS_DOCUMENT, PRIVACY_DOCUMENT]
}
```

Cada documento contiene exactamente los campos obligatorios siguientes:

```
{
  kind: "terms" | "privacy",
  document_id: UUID,
  version: NONEMPTY_STRING,
  sha256: HEX64_LOWERCASE,
  body: UTF8_TEXT,
  published_at: NONNULL_RFC3339_TIMESTAMP,
  is_current: true,
  url: null | VERIFIED_HTTPS_URL
}
```

`actor_id` deriva de la identidad autenticada, nunca del cliente. Organización y alcance deben estar autorizados y ligados al binding profesional revisado. Debe existir exactamente la pareja terms/privacy completa y el SHA-256 de cada body debe coincidir con el catálogo publicado vigente. La respuesta es una instantánea consistente. Si falta autorización, binding profesional o cualquier dato requerido, se devuelve error, nunca un bundle parcial que permita aceptar.

La URL es opcional y no prueba el contenido. Mostrar el body exacto inline, como texto, y verificar su SHA-256. No interpretar HTML del body. La aceptación se refiere a esos bytes, no a lo que una URL mutable muestre después.

El frontend conserva la instantánea presentada y su binding. No reemplaza silenciosamente el binding por el de una relectura al pulsar Aceptar. Un nuevo bundle invalida las selecciones de consentimiento y exige una nueva aceptación explícita.

## 2. Canon exacto del binding

`binding_sha256` es el SHA-256, representado en 64 caracteres hexadecimales minúsculos, de la concatenación de bytes siguiente:

1. Prefijo ASCII exacto `NCC-PROFESSIONAL-LEGAL-BUNDLE-V2`, seguido de un byte LF `0A`.
2. Nueve campos, en este orden:
   - actor_id, UUID canónico en minúsculas;
   - organization_id, UUID canónico en minúsculas;
   - scope exacto `professional_workspace_acceptance_v2`;
   - terms.document_id, UUID canónico en minúsculas;
   - terms.version, texto exacto;
   - terms.sha256, hex minúsculas;
   - privacy.document_id, UUID canónico en minúsculas;
   - privacy.version, texto exacto;
   - privacy.sha256, hex minúsculas.
3. Cada campo se codifica como la longitud **en bytes UTF-8**, en decimal ASCII sin ceros iniciales, seguida de `:` y de sus bytes UTF-8 exactos. Los campos se concatenan sin separadores ni salto final adicional.

No usar serialización JSON, JSONB::text, número de caracteres UTF-16, NFC, trim ni normalización de líneas para este canon. `published_at`, `url` y request_id no forman parte del binding. Publicación/vigencia se comprueban aparte en cada operación.

SHA de body: bytes UTF-8 exactos del string retornado. CRLF→LF y trim pertenecen a la preparación previa de ciertas fuentes, no a la validación del cliente. El cliente no vuelve a normalizar lo publicado. Un vector reproducible enteramente ficticio acompaña este contrato en `FICTIONAL_VECTOR.json`.

## 3. Aceptación CAS

RPC propuesta: `ncc_pilot_workspace_accept_terms_v2({p_org,p_expected_binding_sha256,p_request_id})`.

El cliente envía solamente la organización seleccionada, el hash exacto mostrado y su UUID de operación. No envía actor, cuerpo, versiones o alcance como autoridad.

Respuesta requerida:

```
{
  contract_version: 2,
  actor_id: UUID,
  organization_id: UUID,
  request_id: UUID,
  legal_ready: true,
  legal_binding_sha256: HEX64_LOWERCASE
}
```

Actor, organización, UUID y binding deben coincidir con la instantánea y operación del cliente. El éxito acredita la aceptación en esa transacción, no que el documento sea vigente para siempre. Después se revalida el contexto actual.

Requisito de implementación, todavía no probado: una única transacción READ COMMITTED; auth y gates; mutex existente actor/request; lock de organización; protección nativa SHARE del catálogo; lectura fresca de documentos y revalidación de actor/org; recomputación del binding; comparación con expected; sólo entonces consulta de recibo/replay o escritura atómica de capability y receipt. La escritura no modifica el catálogo. La protección debe durar hasta fin de transacción. No equivale a dos pre/postchecks de cliente.

La opción nativa SHARE NOWAIT permite rechazar un catálogo ocupado sin cambiar el publicador. No garantiza límite total de latencia: otros locks y la transacción dependen del timeout configurado. Deadlock, timeout o cancelación abortan la operación; no se capturan para continuar ni se reintenta automáticamente. Si falta privilegio existente para ese lock, se reporta blocker, sin crear grants.

La comparación del binding **precede al replay**. Si el catálogo cambió después de mostrar el documento, incluso si existe un éxito histórico con el mismo UUID, la llamada actual devuelve CAS mismatch. No acepta texto diferente por derivar versiones nuevas del servidor.

## 4. Recibos, v1 y gates release

Se conserva la lectura existente `ncc_pilot_workspace_receipt_v1({p_request_id})`, con respuesta `null` o `{operation,payload,result}`. No se añaden campos superiores al envelope.

Para una nueva operación v2:

- `operation` es `acceptTerms`.
- `payload` es exactamente `{p_org,p_expected_binding_sha256}`.
- `result` es la respuesta v2 anterior, incluyendo actor_id y request_id.
- El storage/mutex/UUID y conflicto operación-payload existentes se reutilizan. No se crea otro sistema de idempotencia.

Los históricos v1 conservan su payload y resultado originales. Las RPC/consumidores sintéticos v1 no se modifican ni se usan como fallback HTTPS. El gate release sólo admite evidencia v2 de actor, organización, scope y binding actual, además de los gates de identidad/organización y capability correspondientes. Un recibo v1 no puede elevar `legal_ready` de release.

Recuperar un recibo prueba una operación pasada. Se comprueban operation, payload exacto, actor, organización, request_id y binding antes de atribuirla. No prueba vigencia actual: es obligatorio revalidar bundle/context. Si faltan datos o cambió el binding, no habilitar acceso. Un resultado incierto conserva el UUID y la reserva, sin reenvío automático ni sustitución del hash.

## 5. Wire de errores propuesto

En una respuesta SDK de error, `data` es null; `error.code` y `error.message` contienen los siguientes pares estables. `details` y `hint` pueden ser null o información adicional y no son autoridad. No se fija HTTP status como parte de este contrato.

| Caso | error.code | error.message |
|---|---|---|
| Sin binding profesional publicado/verificado | `55000` | `NCC_LEGAL_BINDING_UNBOUND` |
| Binding actual distinto del mostrado | `22023` | `NCC_LEGAL_BINDING_CHANGED` |
| Lock no disponible/espera de lock agotada | `55P03` | `NCC_LEGAL_BINDING_BUSY` |
| Request mal formado | `22023` | `NCC_LEGAL_REQUEST_INVALID` |

Acceso denegado mantiene SQLSTATE `42501`. El conflicto de UUID/operación/payload reutiliza `22023` del mecanismo existente, cuyo mensaje puede ser `Idempotency conflict`; no se transforma en CAS success. Un receipt v2 encontrado con resultado incompatible también falla cerrado.

El backend futuro debe normalizar BUSY mediante rethrow que aborte toda la operación, nunca mediante continuación tras el error. `40P01`, `40001`, `57014`, caída de transporte u otro error inesperado conservan incertidumbre en cliente y no provocan auto-reenvío. Los errores de RPC ausente o schema cache también fallan cerrado: no intentar v1.

UNBOUND no permite mutación. CAS mismatch no cambia capability ni escribe/reinterpreta recibos; obliga a presentar una pareja nueva y pedir consentimiento nuevo. BUSY aborta sin cambios persistidos, pero no autoriza borrar una reserva cliente cuyo resultado sea incierto.

## Fuentes de factibilidad, no evidencia runtime

PostgreSQL documenta que SHARE protege contra cambios concurrentes, que los writers usan ROW EXCLUSIVE y que LOCK se mantiene hasta fin de transacción. [LOCK](https://www.postgresql.org/docs/current/sql-lock.html), [Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html).

La futura función de escritura debe ser VOLATILE y efectuar la lectura fresca después del lock como otra sentencia. No debe reutilizar una instantánea STABLE anterior al lock. [Function Volatility](https://www.postgresql.org/docs/current/xfunc-volatility.html), [Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html).

`lock_timeout` limita cada adquisición de lock, no toda la transacción. [Client Connection Defaults](https://www.postgresql.org/docs/current/runtime-config-client.html). No se cambió ningún timeout en esta preparación.
