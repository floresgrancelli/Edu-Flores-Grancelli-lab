# QA independiente: primer registro del día y persistencia de habituales

Base fijada: `ca637d9dad28ccf51d67e678c35b7c2810e02146`. Propuesta en
`qa-work-nutrition-coach`; no integrar ni activar automáticamente.
La automatización conserva la candidata y el PR #37.

## Defectos reproducibles

1. **Alta — primer registro descartado cuando no existe diario del día.**
   `activeDiary()` devolvía un nuevo objeto vacío en cada llamada. El manejador
   de habituales, planificador, suplementos o comentario modificaba uno y
   `saveDiary()` persistía otro. Reproducir con una cuenta ficticia sin fila
   para hoy, aplicar un habitual una vez y leer el diario: el desayuno quedaba
   vacío. El selector manual ya tenía una asignación específica, por lo que
   una prueba que solo cubriera ese selector no detectaba estas otras entradas.
2. **Media — sushi del planificador pierde la unidad visible al recargar.**
   Guardaba los gramos equivalentes, pero omitía `displayQty`, `displayUnit` y
   `unitEstimate`, a diferencia del editor de comidas. Ocho makis deben conservar
   ocho piezas visibles y 224 g estimados para el cálculo del catálogo.

La propuesta conserva un único borrador del día por identidad y añade la misma
metadata de piezas que utiliza el editor. No altera fuentes nutricionales,
permisos, migraciones, flags ni datos alojados.

## Pruebas nuevas y cobertura aprovechada

- `first-diary-write-regression.mjs`: ejecuta los manejadores reales del
  archivo de aplicación; habitual, suplemento, comentario, sushi planificado,
  siguiente día, cambio de identidad y rollback ante error. Adaptador en memoria.
- `helpers/habitual-signed-roundtrip.mjs`: se ejecuta dentro del circuito
  COACH119 local ya existente después de publicar planes ficticios. Guarda dos
  habituales en cada uno de los seis horarios, usa el cierre local real de Auth,
  comprueba rechazo del refresh token anterior, inicia una sesión nueva y
  recupera los doce menús. Usa las funciones de aplicación y REST firmado.
  Comprueba recibo educativo persistente, primer diario del día, lectura/escritura
  cruzada denegada para alumno, coaches y admin, y eliminación sin perder diarios.
  El reingreso usa contraseña SOLO en la prueba local; no acredita OTP externo.
- Se aprovecha `independent-student-browser-qa.mjs` de la rama independiente
  `qa/independent-student-20261031`, commit `9b364d6`, sin tocar esa rama.
  Añade guardado de sushi y navegación educativa por rol al harness existente.
- La prueba visual de bienvenida recorre las ocho pantallas; anteriormente
  seleccionaba solo 1, 4 y 8.
- Workflow exclusivo `qa-work-nutrition-coach.yml`: cinco controles aislados
  (seguridad, Premium, PG17, Auth/JWT y navegador). No cambia los workflows
  de la automatización. No hay credenciales alojadas ni despliegue.

Las políticas de habituales de la migración original se cotejaron en lectura
con `pg_policies` de la base alojada el 31/10. Esa coincidencia no certifica
paridad completa del entorno ni el resto de RPC o Storage.

## Repetición

Desde la raíz del repositorio:

```bash
node efg-nutrition/tests/first-diary-write-regression.mjs
node efg-nutrition/tests/habitual-persistence-real-code-regression.mjs
node efg-nutrition/tests/planner-sushi-first-select.mjs
```

El workflow exclusivo ejecuta la persistencia firmada en Supabase descartable
y conserva capturas/JSON de Chromium, Pixel emulado y WebKit. Cada resultado
debe citar su SHA y ejecución exactos. Los PASS no equivalen a UAT física,
restauración completa ni autorización de actualización.
