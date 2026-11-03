# NUT-61 · Ficha nutricional autodeclarada — contrato DRAFT, OFF

**30/10/2026 · EFG Nutrition Pro · PR #37 DRAFT · RELEASE NO GO**

## Alcance implementado

`pilot/personal-intake-draft.js` implementa únicamente un borrador **sin red, sin almacenamiento local, sin escritura en Supabase, sin consentimiento implícito y sin vincular a un coach**.

La ficha educativa permite declarar voluntariamente objetivo, edad, altura, peso, actividad diaria, variante de ecuación metabólica, patrón alimentario, preferencias y horarios. Incluye casillas **no preseleccionadas** para celiaquía, diabetes, hipertensión, colesterol elevado, hígado graso, alergia, intolerancia a lactosa, enfermedad renal y otros antecedentes que ameritan consulta. El texto de alergia solo es válido si la casilla correspondiente está seleccionada. Se aplican límites de longitud, rango, códigos permitidos y escape HTML en todos los campos.

La separación de **preferencia alimentaria** frente a **condición médica** es deliberada: ni la celiaquía, ni la diabetes, ni el colesterol alto se interpretan como valores calóricos ni disparan un “alimento prohibido” determinado por texto libre. El semáforo clínico requiere fuente revisada por alimento y restricción. `personalIntakeSafety()` nunca habilita crear automáticamente una dieta; una condición declarada bloquea incluso el adelanto general de energía, a la espera de revisión individual.

El borrador no debe usarse para recopilar historias clínicas reales: `PERSONAL_INTAKE_ENABLED=false` y la interfaz **no contiene botón de guardar ni de enviar**. No fue conectado al panel Personal de solo lectura, que también está OFF.

`tests/personal-intake-draft.mjs` cubre campos opcionales, categorías, límites, decisiones conservadoras, inyección HTML, ausencia de restricciones preseleccionadas y ausencia de envío. Paso añadido a `.github/workflows/efg-nutrition-premium-qa.yml`; confirmación de CI pendiente en el último HEAD.

## Gate operativo para siguiente etapa

1. Aprobar con asesoría legal base jurídica, textos visibles, retención, derechos de supresión/acceso y consentimiento diferenciado cuando correspondan datos de salud; probar reaceptación de versiones.
2. Revisar el cuestionario con nutricionista/asesoría clínica, incluido cuándo bloquear una dieta automática y cómo documentar alergias, medicamentos e información relevante sin inferir contraindicación por categoría.
3. Crear **schema independiente del alumno de coach** en staging fiel, RLS owner con JWT real, firma de aceptación, reintentos y comparación de revisiones; no alterar Supabase productivo.
4. Agregar experiencia Personal completa: guardar/editar/revisar la ficha, calculadora, generación de cinco comidas basada en catálogo revisado, resolver faltantes, reportes y privacidad, sin compartir automáticamente con terceros.
5. Verificar pruebas multiusuario, iPhone/Android, restauración/PITR y controles de seguridad antes de pedir autorización explícita de lanzamiento.

**No representa aprobación clínica/legal ni funcionalidad publicada. No hubo modificación en Render, PostgreSQL alojado, usuarios reales ni rama de producción.**
