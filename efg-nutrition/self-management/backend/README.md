# Autogestión privada — piloto integrado

La ficha propia alimenta la calculadora existente y el generador de seis comidas. Ficha y guía quedan guardadas por cuenta y revisión, sin aprobación de coach ni registro de consumos ficticios. Una ficha cambiada invalida la guía anterior hasta regenerar. Las metas automáticas se recuperan en Mi Día y el plan se abre desde Mi espacio/Autogestión.

Acceso inicial de Edu: email verificado floresgrancelli@gmail.com y perfil admin activo. Otros accesos necesitan una habilitación de piloto vigente en ncc_self_pilot_access; no hay cobros ni conversión de alumnos con coach. Este piloto no equivale a lanzamiento comercial ni publicación en Google Play.

El servidor verifica getUser sobre el Bearer, deriva al titular desde Auth y no acepta un userId del cliente. Se requiere aceptación expresa de ncc-self-legal-20261113, guardada por servidor. Rate limit persistente: 5 generaciones y 40 operaciones de otra clase por minuto/cuenta. Las claves secretas permanecen en la función Edge.

Persistencia: ncc_self_accounts, ncc_self_intakes, ncc_self_results con RLS de lectura propia y escrituras solo service_role. RPCs SECURITY INVOKER exclusivos de servidor, sin ampliar permisos sobre auth.users. Revisiones CAS, requestId idempotentes y guardado conjunto de metas/guía, probado con dos conexiones y con HTTP/REST reales locales. Auth eliminado produce cascada de los datos nuevos.

Alcance del motor: orientación general de adultos, consentimiento explícito y sin necesidades clínicas. Sexo/etapa/ausencia de restricciones no se infieren. Un menú que no ajusta calorías y macros a menos del 2% se rechaza. Gustos por texto se muestran para revisión y no se traducen silenciosamente a exclusiones. Ayuno y otras modalidades pendientes no se convierten a un patrón distinto.

Backend alojado el 13/11/2026: migraciones ncc_self_management_private_pilot_20261113 y ncc_self_management_pilot_controls_20261113; función ncc-self-management versión 1, JWT requerido. Solo tablas nuevas; no se modificaron roles, fichas, planes ni diarios previos. El despliegue de interfaz se verifica separadamente.

QA: contratos del motor/ficha/API, PostgreSQL real y concurrencia; Auth local real, JWTs, PostgREST/RLS, HTTP, relectura, idempotencia, separación de cuentas, borrado y recorrido de pantalla 390/320 px: https://github.com/floresgrancelli/Edu-Flores-Grancelli-lab/actions/runs/43512880016. La prueba de pantalla usa un adaptador local mínimo de sesión, con getUser/HTTP contra Auth y backend locales reales; no cuentas ni credenciales alojadas. No equivale a prueba de Safari, Android nativo o compra Google.
