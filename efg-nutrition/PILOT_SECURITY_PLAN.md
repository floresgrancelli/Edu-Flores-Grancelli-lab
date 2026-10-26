# EFG Nutrition — piloto privado, seguridad y arquitectura (26 octubre 2026)

## Estado de implementación
- Demo pública estática en Render: alimentos, comidas, macros, fibra, peso, actividad, objetivos de demostración, alias y comprobantes simulados.
- Módulo nuevo de nutrición deportiva: whey, creatina, magnesio, omega-3, geles, isotónicas, electrolitos y bebidas. Los datos no verificados son orientativos.
- La demo guarda todo en localStorage del navegador: **NO** admite alumnos reales ni comprobantes bancarios reales.
- **Pendiente indispensable para piloto**: autenticación y backend con almacenamiento privado y políticas RLS. No declarar esto completo hasta hacer pruebas multiusuario.

## Flujo de cuentas reales
1. Superadministrador EFG crea un espacio para cada coach y lo habilita comercialmente.
2. Coach crea invitaciones individuales (enlace de un solo uso enviado al alumno) y asigna plan.
3. Alumno verifica acceso con magic link/código a su correo. El nombre visible, ej. Anita26, no es una credencial.
4. Alumno acepta compartir sus registros con un coach asignado; puede revocar consentimiento sin eliminar datos.
5. Coach ve y edita únicamente planes de alumnos autorizados, nunca registros de otro coach.
6. Superadministrador administra licencias, bloqueos y estadísticas comerciales. No lee registros de salud por defecto.
7. Los pagos alumno→coach y coach→EFG se cargan con alias por destinatario, foto en almacenamiento privado y validación manual por el receptor. Una foto sola no confirma fondos.

## Modelo de datos, entidades y permisos
- `profiles`: auth_user_id, alias de usuario, nombre mostrado, preferencias.
- `coach_organizations`: id, coach_owner, nombre comercial, alias de cobro, licencia, cupo.
- `student_assignments`: id, organization_id, coach_user_id, student_user_id, consent_at, revoked_at.
- `nutrition_goals`: student_user_id, approved_by_professional, calories, protein, carbohydrates, fats, fiber, objective, effective_date, version; historial de objetivos inmutable.
- `foods`: id, name, brand, serving_g, macros_per_100g, micronutrients, amino_acids, provenance, verification_date, status.
- `meal_entries`: student_id, date, meal_slot, food_id, raw_or_cooked, grams, snapshot_nutrients, created_at.
- `usual_meals`: owner_id, meal_slot, ingredients, names, recurring detection/confirmation.
- `sports_entries`: student_id, date, timing, supplement_id, quantity, unit, nutrition_snapshot.
- `body_measurements`: student_id, weight_kg, captured_at, measurement_conditions.
- `activity_entries`: student_id, date, steps, exercise_minutes, activity_type.
- `payment_requests`: payer_id, recipient_id, organization_id, period, amount, alias_snapshot, private_receipt_path, state, reviewer_id, reviewed_at.
- `audit_log`: role/assignment/payment changes; personal data access logs as needed.

## Reglas de seguridad indispensables
- PostgreSQL con RLS en cada tabla clínica, nutricional y de facturación, aplicada incluso si un cliente modifica manualmente parámetros de la API.
- Nunca confiar en roles enviados desde el navegador: autorización del backend con sesión validada.
- Acceso de coach a datos de salud solo cuando hay asignación activa y consentimiento.
- Controles de propiedad en operaciones de subida/lectura de comprobantes; bucket privado, enlaces temporales, tipo y tamaño restringidos.
- Roles coach y superadministrador claramente separados. Registros de salud protegidos, no accesibles por consulta masiva.
- Copias de seguridad y restauración probadas, caducidad de invitaciones, límites de intentos, verificación de identidades y políticas de eliminación/exportación.
- No poner secretos de base de datos ni llaves con privilegios en JavaScript público o repositorios.
- Cumplimiento de Ley 25.326 y revisión jurídica de consentimiento/datos sensibles, especialmente en Argentina.

## Pruebas de aceptación de piloto (obligatorias)
- Coach A no puede leer ni modificar datos de alumnos de coach B.
- Alumno A no puede leer datos de alumno B.
- Alumno revoca permiso; coach deja de ver sus registros de salud.
- Las fichas nutricionales y cambios de objetivos tienen fuente e historial.
- El cálculo suma macros de alimentos y suplementos una sola vez, y omite comidas marcadas como omitidas.
- Los cambios de comida habitual no modifican automáticamente registros anteriores.
- El peso semanal muestra la advertencia roja de hora y balanza constantes.
- Si una transferencia se notifica mediante foto, el estado sigue pendiente hasta aprobación manual; no se habilita acceso automáticamente por subir comprobante.
- No se exponen comprobantes en un almacenamiento público.
- Pruebas en iPhone Safari, Android Chrome y escritorio, incluyendo sesiones e invitaciones.
- Solo entonces incorporar a la coach amiga y 2–5 alumnos voluntarios con consentimiento.

## Arquitectura propuesta
- Web pública / futura app Expo React Native.
- Auth, Postgres con RLS y almacenamiento privado: Supabase (al conectar cuenta y configurarlo).
- GitHub (código) + Render (web). Si se incluye servidor API adicional debe permanecer detrás de autenticación.
- Prueba de carga por etapas antes de habilitar más coaches.
- Datos científicos: fichas verificadas y revisiones AIS/ISSN/NIH ODS/ACSM; nunca inventar micronutrientes ni declarar completos los aminoácidos sin aminograma.

## Fuentes técnicas de referencia
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/auth
https://www.ais.gov.au/nutrition/supplements/group_a
https://ods.od.nih.gov/factsheets/ExerciseandAthleticPerformance-HealthProfessional/
https://pubmed.ncbi.nlm.nih.gov/17277604/
