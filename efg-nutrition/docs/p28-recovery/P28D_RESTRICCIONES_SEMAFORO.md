# P28D · Restricciones privadas en alimentos y recetas

4 de noviembre de 2026, Argentina. Candidata PR53, base 142a467. No habilita flags ni autoriza despliegue.

Se conecta la declaración privada del alumno al semáforo compartido de Diario/Planificar y a cada ingrediente de las recetas. El lector es de solo lectura, usa Auth y RPC, comprueba alumno/viewer/organización/permiso de tratamiento/revisión y mantiene exclusivamente una proyección en RAM. No exige compartir con el coach para leer la propia declaración. El coach conserva su lector separado con los dos permisos exigidos.

Cada render autorizado vuelve a consultar el estado; la sesión o ficha cambiada, revocación, fallo de red, respuesta inválida y declaración ausente vuelven a estado desconocido. Solo una declaración explícita vigente de ninguna admite la ausencia de reglas sanitarias. Se descartan respuestas tardías de otra identidad u organización y se borra el estado al salir. OFF no consulta salud. El catálogo completo permanece disponible, sin impedir el registro por color.

La conexión no inventa reglas clínicas ni evidencias revisadas: el motor existente sigue mostrando amarillo cuando falta evidencia clínica. Por tanto queda resuelto el cableado de la declaración, pero no se certifica todavía el semáforo clínico completo ni el funcionamiento alojado.

Pruebas dirigidas locales PASS: student-food-restrictions-runtime (funciones reales de alimentos/recetas + transporte sintético), coach101-live-food-traffic-light-contract, private-health-entry-route-runtime, sdk-entry-goal-hydration-private, student-session-mutation-races, recipes-shared-picker-contract y ncc-six-meal-guide-contract. Se amplía clinical-health-auth-local-e2e para probar este mismo lector contra Auth/PostgREST firmados en la base local descartable; su resultado debe confirmarse en el workflow del nuevo HEAD.

Siguen abiertos: cinco RPC/tablas de salud básica ausentes en alojado; vinculación y revalidación sanitaria de publicación en servidor; evidencia clínica para colores; prueba alojada autorizada y revisión del propietario. No se alteraron producción, datos históricos, funciones SQL ni autorizaciones nutricionales. Los CI de esta base no se heredan al nuevo commit.
