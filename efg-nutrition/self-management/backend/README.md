# Autogestión: ficha propia y guardado privado — candidata

La vista de prueba fue aprobada por Edu. Esta etapa conecta contratos de ficha,
API autenticada y persistencia sin cambiar los roles actuales ni publicar todavía.

## Decisiones de integración

- Los datos de peso/altura/edad/actividad/objetivo se reutilizan desde la ficha
  propia. La ficha privada más reciente prevalece; una respuesta borrada no se
  recupera silenciosamente de otra ficha antigua. El cliente pide lo que falta.
- El parámetro fisiológico y la declaración de alcance no se infieren de nombres,
  correos ni ausencia de condiciones registradas. Los textos libres de gustos se
  conservan y se marcan como pendientes de vincular con alimentos concretos.
- Los perfiles existentes con rol student conservan el flujo con coach. La
  transición a independiente debe diseñarse expresamente; estos RPCs la rechazan.
- Una cuenta admin/coach puede tener su espacio personal independiente sin
  cambiar su rol profesional, solo tras elección expresa y habilitación de servidor.
  Las personas nuevas pueden tener una cuenta independiente sin crear roles
  desconocidos en efg_profiles. Faltan aún el ingreso y navegación de esa modalidad.
- Las tablas nuevas no reutilizan objetivos/planes de Coach, la vieja guía
  Personal de cinco comidas ni el diario. El plan flexible de seis comidas se
  guarda junto con sus metas en una sola fila y con la revisión exacta de ficha.

## Archivos

- `pilot/self-management-intake.js`: reusa campos permitidos y cliente autenticado
  de ficha. Cambios de identidad invalidan respuestas; no se envía un userId.
- `api.mjs`: handler de servidor POST con token Bearer verificado por adaptador,
  origen permitido, límite de cuerpo, lista de acciones/campos y respuestas sin
  datos de proveedor. Desactivado por defecto. No es un endpoint desplegado.
- `supabase-repository.mjs`: adaptador server-only para lecturas propias y RPCs.
  Rechaza respuestas de otras cuentas y vuelve a leer los recibos guardados.
- `schema.candidate.sql`: tres tablas RLS con lectura solo del titular. Escrituras
  exclusivamente por servidor/service_role; funciones SECURITY INVOKER, sin
  SECURITY DEFINER ni nuevos permisos para leer auth.users.
- `fixture.sql`, `scenarios.sql`, `concurrency-test.py`: prueba desechable real de
  PostgreSQL, con usuarios/claims ficticios. No son migraciones ni datos reales.
- `build-qa-result.mjs`: obtiene un resultado del motor y catálogo existentes,
  usando medidas inventadas para el test de guardado conjunto.

## Contrato de guardado

La API recibe sesión; valida identidad por Auth y deriva al titular desde esa
sesión. No acepta un destinatario en el cuerpo. Antes de operar exige acceso
verificado (cortesía/piloto o derecho de uso) y recibo legal vigente. Esos callbacks
fallan cerrado por defecto; no asumir que un texto enviado por el cliente sea un
recibo legal o un comprobante de compra. No se definió aún precio de autogestión.

La ficha se guarda con expectedRevision y requestId. Un parche conserva los campos
anteriores; JSON null es una eliminación deliberada. Se generan revisiones nuevas,
no se pisan las anteriores. Reintentar la misma petición no duplica datos y una
revisión superada devuelve conflicto. La generación usa la ficha guardada.

El commit del plan bloquea la cuenta, vuelve a comprobar modo/perfil y revisión,
y guarda calorías/macros/guía juntos. Cambiar la ficha mientras se calcula produce
conflicto. Una petición repetida con el mismo resultado es idempotente. Reducir o
cambiar de modalidad no borra el historial. La lectura privada no habilita acceso
de ningún coach y la eliminación de Auth contempla cascada de estos datos.

El SQL valida estructura y permisos; el cálculo, composición, elegibilidad y
ajuste nutricional los valida el motor de servidor. No aceptar resultados de
nutrición calculados por un cliente como si hubieran pasado esa verificación.
No desplegar solo el SQL con un endpoint que reciba un menú arbitrario.

## Estado

Doce pruebas de contrato pasan para ficha y handler. PostgreSQL 17 y dos conexiones
concurrentes también pasaron: guardado conjunto, idempotencia, cambios de ficha,
propiedad/RLS, roles, rechazo de alumnos vinculados, cascada tras eliminar Auth,
conservación de campos anteriores y conflicto de escritura entre dispositivos.
Evidencia: https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/43499095332
Código verificado: 13e6c62b3a8f90022d46828b9a732dc57e69df32.
La fixture imita privilegios relevantes del proyecto: service_role puede consultar
perfiles pero NO auth.users. Identidades/claims son ficticios; no se usó Auth alojado
ni se probaron todavía JWT reales y API REST integral de esta nueva modalidad.

Pendiente: completar entrada/verificación de Auth de servidor y adaptadores de
habilitación/recibos actuales, límites de abuso, validación de preferencias de
texto, fuente publicada de catálogo, diálogo para datos faltantes y conexión de
la pantalla aprobada con esta API. Después, probar JWT reales/REST/RLS y sesiones
en un entorno aislado, borrado y compatibilidad del piloto antes de activar.
No se aplicó DDL al proyecto alojado, no se desplegó endpoint y no se modificaron
roles, fichas, planes, diarios, cargos ni mensajes existentes.
