# Recorridos compactos: EV-06, sugerencias y seguimiento

Base publicada: PR76, e63397d686545fd7260a08da3fd41593d33732a2. Edu autorizó las tres mejoras y luego preparar una nueva lista de prioridades.

- La ficha general vigente se presenta en cuatro pasos: datos, preferencias, rutina y revisión. Los controles permanecen montados; Atrás no borra campos. Los datos de la revisión vigente se recuperan del servidor. La revisión muestra los valores actuales y conserva la elección explícita de compartir. La validación abre el paso con un campo inválido antes de cualquier envío. Las preguntas de rutina usan los campos opcionales existentes; no se agregan campos clínicos, permisos ni barreras.
- El planificador pliega la explicación del reparto y los extras no elegidos. Los controles permanecen disponibles y los extras seleccionados se muestran abiertos. Cálculo, simulación y registro permanecen separados.
- El detalle autorizado del alumno muestra un resumen de ficha, objetivos y registros cargados, con accesos a Alimentación, Plan e Informes. Informes usa el generador por período existente como una quinta solapa: cambiar secciones mantiene los campos de la calculadora. Ausencia de datos no equivale a cero consumos ni ausencia de restricciones.

Se conservan el orden legal, las ocho pantallas educativas, los permisos de servidor, los seis horarios y la publicación atómica. No hay migración ni modificación de registros reales.

Validación prevista: prueba real de ficha en Chromium/WebKit con transporte ficticio (campos inválidos, vuelta atrás, revisión, permiso independiente, errores de servidor sin pérdida); navegación de las cinco solapas del coach y accesos rápidos; abrir extras, buscar, elegir, cantidad y registro. Los workflows existentes se ejecutan sobre el commit candidato. No equivale a teléfono físico o sesión autenticada alojada.
