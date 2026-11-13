# Autogestión — primera implementación para revisión

Edu pide completar la modalidad sin coach, sin revisión humana obligatoria,
compartida por Android y web actual. Se reutilizan calculadora, catálogo y motor
de seis comidas. No se retira la revisión de los alumnos que sí tienen coach.
La petición actual cambia la decisión anterior de posponer esta modalidad.

## Preparado y ejecutable

- `pilot/self-management-engine.js`: ficha → Mifflin–St Jeor y objetivos actuales
  → generador existente → validación → guía automática. Verifica que energía,
  proteína, hidratos, grasa y fibra queden a menos del 2% de la meta; si no hay
  solución no cambia las metas ni entrega un menú desajustado.
- El resultado declara `self_managed_estimate` y `coachReviewed:false`. No usa
  RPCs de aprobación del coach ni registra el menú como consumo en el diario.
- Reutiliza el catálogo completo existente y porciones contables enteras.
  Los alimentos excluidos por gusto no se incorporan automáticamente.
- `pilot/autogestion-prueba.html` y `self-management-preview.js`: recorrido real
  con ficha, generación automática, seis solapas, edición y borrado de prueba,
  impresión/PDF. Ejemplo ficticio explícito; consentimientos nunca preseleccionados.
- `tools/build-self-management-preview.mjs`: empaqueta la misma interfaz y los
  mismos módulos y catálogo en un HTML sin llamadas de red para revisión.
- `createSelfManagementService`: contrato de servidor que deriva identidad,
  verifica modo independiente sin coach, lee ficha propia y exige guardado
  atómico de objetivos+guía con revisión de origen y recibo releído.

## Alcance nutricional inicial

Estimación orientativa para adultos, sin prometer tratamiento clínico ni cobertura
de todos los micronutrientes. Se requiere dato fisiológico explícito de la
ecuación, edad, peso, altura, actividad, objetivo y declaración de alcance.
No inferir esos datos del nombre ni de la ausencia de información.

La fórmula existente tiene validación de entrada para 18–90 años; esto no implica
validación clínica individual de toda esa población. La publicación original de
Mifflin incluyó adultos sanos de 19–78 años. La actividad y los coeficientes del
objetivo son aproximaciones ya existentes; documentar incertidumbre y seguimiento.
No mostrar decimales como precisión fisiológica real.

La primera entrega automática no cubre menores, embarazo/lactancia, bajo peso,
antecedentes de TCA ni condiciones/alergias/restricciones que necesiten adaptación
individual. Sin declaración expresa no asumir ausencia. La elección no habilita
a compartir salud con un coach. Fuera de alcance se conserva el acceso al flujo
de consulta/búsqueda de profesional; no se inventa tratamiento.

El motor recibe omnívoro/vegetariano/vegano y valida cada composición; no garantiza
que toda combinación de objetivo/exclusiones alcance las metas. Keto, ayuno y
adaptaciones clínicas continúan pendientes de validación propia para autogestión:
las reglas de borrador revisable por coach no se vuelven autoaprobación por quitar
el botón de revisión. No se descartaron del roadmap ni se sustituyen silenciosamente.

## Validación y estado real

Nueve pruebas Node aprobadas localmente: cálculo/guía con catálogo actual,
inmutabilidad, restricciones de alcance, exclusiones, formato, identidad,
separación respecto a coach y confirmación de persistencia. La persistencia en
estos tests es simulada; no se verificó todavía con usuarios o base productiva.
El navegador local no arrancó por restricción de sockets del ejecutor; se prepara
QA en GitHub Actions con Chromium, artefacto HTML y capturas reales.

## Pendientes para probar dentro de la app actual

La pantalla de prueba es funcional y aislada, sin sesión, cobros ni persistencia.
No está enlazada al login del piloto ni publicada en Render. Sus datos viven
solo en memoria y se pierden al cerrar/recargar; no describirla como guardada.

El espacio Personal previo está desactivado y sus tablas/reglas NUT60 son una
candidata antigua de staging, no infraestructura confirmada en producción. Su
contrato de guía de cinco comidas tampoco acepta aún el resultado flexible de
seis. No activar flags ni quitar RLS para sortearlo.

Faltan adaptador de ficha propia, matrícula de modo independiente verificada en
servidor, guardado atómico revisado, compatibilidad de esquema/RLS, diario y vista
Personal de seis comidas, pruebas reales de aislamiento entre cuentas/roles y
transición a coach conservando historial y consentimiento separado. Integrar
solo después de validarlo. Definir aparte el precio de autogestión; no inventar
suscripciones ni reutilizar el cupo profesional para cobrarla.

La vista para revisión debe mostrarse a Edu antes de publicar cambios visuales.
No hubo merge, despliegue, modificación de cuentas, altas, cargos ni correos.
Play Console y App Store siguen pendientes; la prueba web es accesible desde
iPhone cuando se publique la ruta de prueba autorizada.

Fuentes:
https://pubmed.ncbi.nlm.nih.gov/2305711/
https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
