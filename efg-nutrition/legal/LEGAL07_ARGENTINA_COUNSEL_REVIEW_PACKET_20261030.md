# LEG-07 · Paquete para revisión jurídica (Argentina)

**30/10/2026 · EFG Nutrition Pro · DOCUMENTO PREPARATORIO, no Términos aprobados · PR #37 DRAFT · NO GO.**

## Alcance legal por validar con abogado especializado

EFG Nutrition Pro recoge **datos potencialmente sensibles**: condiciones de salud declaradas (celiaquía, diabetes, hipertensión, antecedentes, alergias), hábitos alimentarios, evolución de peso, actividad, planes y comunicaciones coach↔alumno. En Autogestión también se recolectan sin un coach. No afirmar que los datos son meramente deportivos ni reducir todo a «acepto términos» genéricos.

**Fuentes oficiales verificadas:**
- Ley argentina 25.326, protección de datos personales: https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto . Su art. 2 incluye los datos de salud entre los «datos sensibles».
- Ley argentina 26.529 actualizada, derechos del paciente: https://www.argentina.gob.ar/normativa/nacional/160432/actualizacion . La relevancia exacta de sus obligaciones depende de si el servicio y sus profesionales constituyen atención médico-sanitaria; **no asumir automáticamente** que toda dieta de entrenamiento es historia clínica legal.
- AAIP, recomendaciones para proteger datos personales y canales de derechos: https://www.argentina.gob.ar/node/414527 .

No sustituye asesoramiento jurídico ni verifica por completo legislación provincial, servicios digitales, defensa al consumidor, menores, seguridad ni regulación sanitaria.

## Decisiones que faltan antes de textos definitivos

1. **Responsable del tratamiento:** razón social o persona responsable real de EFG Nutrition, domicilio y medio verificable de contacto para privacidad; no inventar identidad ni datos.
2. **Finalidades y bases legales:** explicar datos estrictamente necesarios para diario alimentario, objetivos, restricciones y para prestar servicio, cuáles son voluntarios, finalidades de informes y compartición, mensajería, pagos, notificaciones; separar cada finalidad donde sea necesario.
3. **Relación de roles:** qué ve el coach, qué ve el administrador, qué conserva el alumno, quién decide las finalidades (responsable/encargado por operación), qué cambia al revocar el consentimiento del coach y al pasar a Autogestión. No convertir la aceptación de Términos en permiso automático para compartir datos de salud.
4. **Datos sensibles:** tratamiento de diagnósticos autodeclarados y restricciones/alérgenos; consentimiento y seguridad reforzados; supresión, exportación, rectificación y acceso por personas autorizadas; definir períodos de retención y copia de respaldo.
5. **Infraestructura y transferencias:** revisar jurisdicciones de Supabase/Render, subprocesadores, transferencias internacionales, medida de cifrado y acceso de soporte, políticas de retención y procedimientos de incidentes.
6. **Derechos de los titulares:** canal de acceso, rectificación, actualización, supresión y otras acciones aplicables, plazos y excepciones, y cómo implementarlo en la plataforma.
7. **Notificación y consentimiento legal versionado:** Términos y Privacidad con `version`, contenido exacto, `sha256`, `published_at` y `effective_at`; `efg_legal_acceptances` con `auth.uid()` y fecha de servidor, historial no editable, aceptación explícita por persona y reaceptación al cambiar el documento.
8. **Alcance profesional y límites del servicio:** distinción entre orientaciones generales y planes supervisados, variabilidad de estimaciones nutricionales, advertencias específicas para patologías/embarazo/menores cuando aplique; revisiones por profesionales antes de etiquetar alimentos «seguros». No incluir una exención absoluta de responsabilidad como sustituto de cumplimiento.
9. **Cobros:** términos de contratación/renovación, política de precios y bajas, comprobantes, medios de pago, derechos de consumidores y seguridad de recibos; coordinación coach↔alumno↔EFG.
10. **Edad y elegibilidad:** determinar política sobre menores, responsables legales y registros no autorizados antes de abrir inscripciones públicas.

## Gate de ingeniería ya ensayado / pendiente

**Ensayado solo ficticio:** SQL LEG-07 versionado, RLS de aceptaciones, `efg_legal_current_status`, `efg_accept_legal_documents` y JWT firmado GoTrue en Supabase LOCAL; ausencia de aceptación automática, no suplantación y reaceptación de Términos nuevos. El contenido de test no constituye ni una sola aceptación legal válida.

**Pendiente:** abogado aprueba redacción final, se conocen responsable y medios de contacto, documentos de producción exactos y hashes, apertura de onboarding, gating efectivo de TODOS los endpoints sensibles, pruebas de roles Autogestión/coach/alumno/admin, políticas de supresión/exportación, UAT iOS/Android y monitoreo posterior al lanzamiento. En la candidata `LEGAL_ONBOARDING_ENABLED=false`.

## Evidencia a entregar al revisor legal

- Modelo de datos: `efg-nutrition/docs/LEGAL_VERSIONED_ACCEPTANCE_STAGING_SQL_20261029.sql` y `efg-nutrition/legal/LEGAL_ACCEPTANCE_BACKEND_CONTRACT_DRAFT.md`.
- UI: `efg-nutrition/pilot/legal-onboarding.js`.
- Pruebas: `efg-nutrition/tests/coach-auth-local-e2e.mjs` y PostgreSQL17 de PR #37.
- Diagrama real de flujo de información, política de privacidad futura, Términos definitivos y fechas de entrada en vigor, aún **no creados/aprobados**.

**No usar este paquete como aceptación jurídica ni ofrecerlo a usuarios finales.** Solo publicar la gran actualización después de revisión real y autorización expresa del propietario.
