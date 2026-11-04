# P30G — bandeja de comprobantes del coach piloto

Runtime: a1df7ddbc84428b22487933125518b092b4d60c9. Preparación, sin GO, merge, despliegue ni activación.

Alumno QA nuevo: sesión firmada observada en Pagos. Alias organizacional ausente; botón Enviar comprobante deshabilitado correctamente. No se configuró alias, transfirió dinero ni subió comprobante. No certifica persistencia de pago.

Defecto corregido: paymentsView retornaba antes de mostrar la bandeja del coach is_test. Ahora conserva aviso de licencia gratuita y bandeja/gestión de comprobantes de alumnos; no muestra contrato ni formulario de pago de licencia al coach piloto. No cambia permisos, cupos, estado de organización ni datos bancarios. Test fit-recipes-payments ejecuta función real con coach piloto/comercial: PASS. Delta instalado sólo en preview. Pendiente comprobación firmada como coach.

CI previos consultados individualmente: c40397b y 93b1da2 cinco SUCCESS (incluido Auth/JWT), Visual en curso. En HEAD93b, Chromium aprobado, Safari/WebKit en ejecución. No reruns. No atribuir esos resultados al nuevo runtime a1df7dd.

Paquete regenerado: ncc-pilot-a1df7ddbc844 / major_ncc_a1df7ddbc844. 44 archivos, 98 módulos, 25 CSS, 10 flags ON propuestos y 5 OFF incluido QA. Cutover pre-GO y git apply --check PASS. Parche y SQL NO aplicados. Sustituye paquete P30F para este runtime.

Pendientes: comprobantes ficticios alumno→coach; lectura de respuesta de mensaje por coach; gestión administrativa con sesión correspondiente; CI del nuevo HEAD; relectura del estado productivo antes del GO. Circuito comercial coach→EFG no certificado por cuenta gratuita. Diferidos del propietario conservados. P30E política YA aplicada: no reinstalar. No declarar 55/55.
