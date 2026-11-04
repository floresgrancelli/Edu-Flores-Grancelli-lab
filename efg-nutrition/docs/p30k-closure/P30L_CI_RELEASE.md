# P30L — contratos de QA durante el GO autorizado

El propietario dio un nuevo GO explícito: «Vamos con 1 y GO». Build autorizado `ncc-pilot-3a40474052be`, runtime base `3a40474052bebcfb73cfdf2384e5aa5d0de068fd`. El parche se aplicó en `aea448fe7eca1c30168e80a9adec598466fdd24b`. No se distribuye el preview ni se reaplican migraciones instaladas.

La primera tentativa de merge fue rechazada por las protecciones de GitHub. No hubo bypass ni despliegue. Los CI posteriores detectaron contratos que aún exigían las diez funciones apagadas y cache keys anteriores al GO. Se conservaron los casos OFF/legacy en fixtures explícitos y repositorios temporales. El árbol real se comprueba contra el SHA256 fijo del manifiesto aprobado, los 98 módulos, HTML y las 15 decisiones de flags. Cinco flags, incluido QA, siguen apagados. Esto prueba identidad de código, no autorización humana ni estado LIVE.

La prueba visual general ahora modela explícitamente un alumno que terminó el ingreso y una propuesta privada de objetivo para editar su guía atómica. El ingreso bloqueado, la privacidad y la publicación siguen cubiertos por sus pruebas separadas. La prueba de privacidad exige ausencia de los antiguos campos clínicos y orientación a Mis restricciones. No se alteraron guardas de la app para adaptar las pantallas a los tests.

En `0c8e655e1ea5cd9639a18dd2988b8f012c844104`: Security, Premium, PostgreSQL atómico, Auth/JWT y Educación SUCCESS. Visual completó el recorrido principal Chromium (17 escenarios, 100 vistas, cero errores) y P21/P22; falló después por esperar los ocho campos clínicos legacy. La corrección puntual de esa expectativa se incorpora con este documento. Consultar los CI del nuevo HEAD: los PASS anteriores no se transfieren.

Validación local de la corrección: privacidad Chromium PASS. El editor real conservó el diario durante sustitución de tofu y reducción de seis a cinco/cuatro horarios en 390 y 1280 px. No equivale a dispositivo físico ni a publicación alojada.

Preflight 2026-11-04 20:37:58Z: tres switches OFF, cero manifiestos, 18 referencias revisadas no vencidas; Render LIVE estable `ab7c241cdfa376cab9954fc9b8f12750d2f905d7`. Activación SQL todavía NO ejecutada. Cierre y resultado final deben registrarse en PR53 y Plan Maestro después de CI, merge y comprobación de LIVE/archivos. GO vigente para este mismo piloto; comercial y diferidos de STATUS.md no certificados. No 55/55.
