# LEG-HEALTH-01 · Evaluación legal antes de habilitar declaraciones clínicas en EFG Nutrition
**Fecha: 30 de octubre de 2026 · Argentina · Orientación de ingeniería/compliance, NO dictamen jurídico · REQUIERE asesor legal**

## Hallazgo crítico
La **Ley argentina 25.326** (art. 2, art. 6 y art. 7) considera información sobre salud como **dato sensible** y establece exigencias reforzadas y límites a su recolección; art. 8 contempla tratamiento en el marco de establecimientos sanitarios y profesionales vinculados a ciencias de la salud bajo secreto profesional. La AAIP explica que no se puede obligar a brindar datos sensibles. **Una casilla marcada de consentimiento NO demuestra por sí sola que EFG Nutrition o un entrenador no sanitario estén legalmente habilitados para crear y gestionar un banco de diagnósticos.** No asumirlo; requiere dictamen profesional de alcance, responsables y fundamento permitido para cada supuesto.

## Decisión técnica temporal
- Conservar **OFF** `GUT_CLINICAL_INTAKE_ENABLED`, `PERSONAL_INTAKE_ENABLED` y la recolección clínica real. No publicar documento de consentimiento de salud ni crear filas alojadas hasta definir base legal y procesos organizacionales.
- **No** poner la declaración clínica en notas/gustos/comidas, mensajes, etiquetas, autosugerencias, reportes, ni registros públicos de Supabase.
- Mantener un prototipo **exclusivamente sintético y privado** de aislamiento, controles JWT y borrado (`CLIN-GUT-03`), que evita accesos no autorizados pero **no legitima** jurídicamente el tratamiento.
- El semáforo destinado a diagnósticos requiere definición de alcance profesional y evidencia de alimentos/porciones, no solo controles de acceso.

## Cuestiones que debe resolver un asesor argentino antes del GO
1. Determinar la base jurídica concreta y límites de tratamiento de **datos de salud** por EFG Nutrition, coaches y terceros. La condición de «coach» por sí sola no acredita ser profesional de ciencias de la salud. Verificar responsabilidad del responsable del tratamiento, encargados y uso de Supabase/Render.
2. Determinar si el servicio debe excluir diagnóstico y optar por **preferencias alimentarias no clínicas** hasta contar con marco profesional habilitado; la simple autorreferencia de SIBO/intolerancia a lactosa continúa siendo información sobre salud.
3. Redactar y aprobar información clara de finalidad, categorías de destinatarios, carácter opcional, retención, seguridad, ubicación y transferencias internacionales, mecanismos de acceso/rectificación/supresión y reclamaciones, con identificación real del responsable y contacto. Un waiver genérico «no somos responsables» no soluciona la protección de datos ni responsabilidad sanitaria.
4. Documentar la separación entre aceptación de Términos/Privacidad, eventual habilitación **legalmente permitida** para tratamiento sensible, y autorización independiente para compartir con un coach vinculado, además de revocación real y registro mínimo de cambios.
5. Confirmar requerimientos de actividades profesionales y publicidad sanitaria que puedan aplicar al interpretar dietas asociadas a diagnósticos, incluyendo límites del software.
6. Revisar retención/backup para que borrar una ficha clínica y revocar acceso no exponga diagnósticos en copias o logs; política de respuesta a incidentes y derechos del titular.

## Referencias oficiales consultadas el 30/10/2026
- Ley 25.326, texto actualizado: https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion
- Artículos 2, 5, 6 y 7 (texto legal): https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto
- AAIP, derechos, consentimiento y definición de datos sensibles: https://www.argentina.gob.ar/aaip/datospersonales/derechos
- Artículo 8 y secreto profesional, texto actualizado de la ley: https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion

**No publicar ni aceptar datos clínicos reales hasta dictamen jurídico y aprobación clínica.** El propietario puede lanzar funciones nutricionales generales por separado cuando todas sus demás verificaciones estén aprobadas; el componente clínico debe permanecer deshabilitado si no obtiene su habilitación específica.
