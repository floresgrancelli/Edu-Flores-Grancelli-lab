# P28H — Autorización del piloto y siguiente prueba

4/11/2026. Base funcional comprobada: `123eec363509ba7e0a0e82de3095f0bf4dc39018`. Esta entrega agrega documentación y un SQL de contenido propuesto; no cambia código de la app ni flags.

## Estado real

P28G ya instaló el backend en Supabase mediante migración `20261104124218_p28_private_health_and_publication_guard_off`. No reaplicar P28F. Los tres controles permanecen OFF y las tablas privadas vacías.

`P28H_AUTORIZACION_SALUD_PILOTO.txt` contiene un texto breve de 856 caracteres. Versión propuesta `ncc_pilot_health_20261104_v1`; SHA256 UTF-8 `ddd3e8a8e51795c1a4d2b2aaf29a3901ffaf500c95551a5c6e28ecf701502806`. No es un documento comercial definitivo ni una aprobación clínica. Distingue tratamiento, compartir con coach, retiro y conservación de comidas/planes anteriores.

`P28H_DOCUMENTO_SALUD_PROPUESTO_NO_APLICADO.sql` prepara la carga del texto exacto, sin generar recibos ni aceptaciones. Solo se aplica después de aprobar el texto. Verifica hash, tablas inicialmente vacías y controles OFF; transacción con lock corto. No aplicado. Un SELECT en Supabase verificó longitud/hash exactos y cero documentos existentes. Eso no sustituye el ensayo integral de ejecución de este nuevo SQL de contenido.

El cliente real `student-restriction-declaration.js` cargó este texto con transporte sintético: contenido intacto, declaración UNKNOWN, revisión0, solo dos lecturas y ninguna escritura. El flag exportado sigue false. No se repitieron las suites generales de código que no cambió.

## Actor existente identificado (solo lectura)

Organización de prueba `NCC P26 QA A 20261103`, marcada is_test=true. Coach: `NCC QA Coach A`, activo. Alumno: `NCC QA Alumno`, activo. No se crearon cuentas, cambiaron roles ni inspeccionaron fichas de salud. Su existencia no constituye autorización para escribir ni demuestra acceso a sus OTP. No usar la cuenta Admin como si fuera alumno.

## Límite de navegador comprobado

Se preparó una vista aislada con el módulo real y texto propuesto, transporte exclusivamente en memoria y CSP connect-src none. Cloud Browser rechazó la apertura file:// por política de protocolos: solo HTTP/HTTPS. No se eludió el bloqueo, no se intentó otro mecanismo para abrir ese archivo y NO se acredita prueba visual ni funcional de navegador de P28H. No fue un error de la app ni de Supabase.

No existe en esta etapa un acceso HTTPS verificado a la candidata para UAT. La URL Render sigue siendo la versión estable recuperada. Las capturas/CI previos son de entornos aislados y no se presentan como prueba alojada del texto nuevo.

## Siguiente circuito, todavía pendiente

1. Aprobar el texto breve y completar su carga controlada sin aceptar permisos por nadie ni activar flags.
2. Resolver un acceso de prueba autorizado a la candidata por HTTPS sin desplegar sobre la estable ni crear recursos facturables. No convertir fixtures locales en una supuesta preview alojada.
3. Confirmar uso de las dos cuentas de prueba existentes y alcance de nuevas escrituras; OTP dentro del navegador, nunca por chat. Identidades/roles se verifican después del acceso. Consentimiento sanitario lo decide el titular.
4. Ejecutar ficha → declaración separada → espera → coach → guía de seis horarios editable → revisión humana → publicación conjunta/idempotente → Mi Día. Probar cambio/revocación sanitaria, aislamiento entre organizaciones, historial, primer alimento y habituales. La activación de switches alojados sigue requiriendo autorización específica.

NO GO actualización: instalación backend completada, contenido y prueba alojada aún pendientes. No afirmar que el circuito o las 55 mejoras funcionan por el solo resultado de CI.
