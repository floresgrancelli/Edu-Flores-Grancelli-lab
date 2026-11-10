# CO-UX-01: ficha, objetivos, guía y envío

Pedido de Edu: la ficha recibida debe destacarse y preparar el plan no debe exigir subir y bajar entre calculadora, guía y envío.

Espacio profesional: cuatro etapas en el mismo panel: ficha recibida → objetivos → Dieta Guía → revisar y enviar. Solo una etapa visible; navegación anterior/siguiente sin escrituras, preservando campos y permisos. La calculadora parte de la ficha autorizada; al calcular se presentan los objetivos. Crear guía aplica los objetivos visibles en memoria y usa el generador existente. Cantidades/editabilidad y notas de revisión se conservan. La última etapa muestra resumen, revisión, guardado del borrador y publicación conjunta por los métodos existentes. No se infiere aceptación ni se publica al navegar.

Ficha tradicional: historial/plan anterior plegados; calculadora primero, guía después y envío al final, respetando IDs y callbacks. La ficha compartida lleva encabezado y estado explícitos. Se conserva la precarga y revalidación de permisos.

Sin cambios de schema, RPC, RLS, roles, motor de macros ni generador. Compartir datos de salud sigue siendo independiente. Las pruebas previas de transporte no acreditan la interfaz nueva: se requiere el recorrido de navegador con un solo panel visible, vuelta atrás con campos conservados, cálculo, guía de seis horarios, revisión/guardado/publicación por el mismo circuito y conservación del espacio personal.
