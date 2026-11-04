# P30B — fuentes piloto con sesión real y recuperación de borrador

Runtime89cfccde8d03ab4f32404ba3c93e3530eb6f459f. CoachQA A real, alumno ficticio521b41b5-5b35-42a0-a480-599af2835c9d, organizaciónis_test. No inscripción p29_qa_release_scope para este actor: usa RPCgeneral, no móduloQA. No extensión/borrado del scope del otro alumno.

P30A: ficha compartida rev4 a18:56:33.173139Z, declaración sin restricciones ficticia compartida rev1.

Defecto real: load del borrador anterior(rev1/ficha2) arrojaba error y abortaba todo el panel tras ficha4. Corregido: cliente mantiene rechazo, adjunta solo revisión CAS/statusstale después de validaciones de sesión/coach/org; UI captura únicamente ese error, revalida contexto, no restaura objetivo/guía/estado sanitario obsoleto. Otros errores siguen propagándose. No se borró ni cambió DB para sortearlo. Mensaje distingue stale de publicado. Prueba cliente ampliada PASS; UI real abre alumno y genera propuesta nueva. Guardar usa expectedRevision1 y readbackrev2.

PASS alojado firmado: meta2300/P140/HC293/G63/FI32, generar6comidas, Verificar referencias del piloto y recalcular, guardarborrador. UI2275kcal/P141.9/HC292.2/G63.3/FI32, máximodesvío1.3%. SQL readback draft_revision2/statusdraft/source_intake_revision4/sources_verifiedtrue;0objetivos/0diariosdelactor. No publicación.

PASS negativo firmado: sustituir merluza porpollo soloRAM y verificar devuelve Falta revisión para publicar estos ingredientes: Pollo cocido sin piel (estimación general). El catálogo y el borrador se conservan. No se guardó variante negativa; recarga para recuperar borrador confirmado. Vencimiento/revocación siguen acreditados aisladamente enP29W, no nuevos ensayos JWTalojados de vencimiento. No afirmar cobertura universal.

Paquete activación regenerado sobre runtime89cfccd: buildncc-pilot-89cfccde8d03,44archivos,98módulos,25CSS,10ON propuestos/5OFF(QAOFF). Manifiesto hashes y SQLactivate/recover nuevos. gitapply--checkPASS; testncc-pwa-asset-cutover-pre-goPASS. ParcheNOAPLICADO. P29V/Whistóricos no aplicar sobre runtime nuevo. Generación inicial de diff falló porformato/rutas, corregida congitdiffnoindex; checkfinalPASS.

Matriz55P29Z vigente; prioridades1y4. Nuevefuentes,lectura alumno2100/reintentoplan yPDF diferidos segúnEdu. Sinmerge/deploy/globales ni planes publicados. CI del nuevoSHA no hereda resultados anteriores.
