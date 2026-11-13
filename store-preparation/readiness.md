# Evaluación inicial para tiendas · 13/11/2026

## Resultado

La app web existente es una base reutilizable para estudiar Capacitor. La copia está preservada y aislada por rama. Todavía no se ha integrado Capacitor, generado Android/iOS, compilado, firmado ni probado un contenedor nativo. La cobertura de navegador de PR122 no acredita funcionamiento en WKWebView o Android WebView.

## Compatibilidad real observada

| Área | Evidencia en la base PR122 | Preparación necesaria |
|---|---|---|
| Entrada | `pilot/index.html` tiene head y módulos ES; estilos también desde `../styles.css` y `../fresh.css` | Crear paquete con entrada raíz y conservar la estructura de rutas. No copiar solo `pilot/` ni cambiar rutas en producción. |
| Dependencias | `pilot.js:42` importa cliente remoto desde esm.sh | Fijar y empaquetar dependencias con sus licencias; comprobar importaciones efectivamente usadas y CSP del contenedor. No depender del CDN como sustituto de un paquete reproducible. |
| Autenticación | `pilot.js` requestOtp/confirmOtp usa código por correo y `verifyOtp`; `shouldCreateUser:true`; redirección web fija | Probar teclado, alternar correo/app, restauración y cierre de sesión en WebView. Evaluar enlaces antiguos si se conservan. La sesión de Safari no se transfiere automáticamente al contenedor. No cambiar configuración del servidor ahora. |
| Backend | URL alojada fija en `pilot.js` | Aislar pruebas antes de abrir el contenedor: copiar código no aísla datos. No introducir credenciales privilegiadas en el paquete. |
| PDF y comprobantes | `weekly-pdf-review.js` usa Blob, worker local PDF.js y enlace download; `pilot.js` abre URL firmada con window.open | Probar vista previa, guardar/compartir PDF, enlaces externos y selector de imágenes en ambas plataformas. Añadir puentes solo si las pruebas muestran necesidad. |
| Pagos | `paymentsView` distingue transferencia alumno→coach y licencia profesional coach→EFG, con alias/comprobantes | Clasificar ambos circuitos antes de enviar. No asumir que una licencia de software queda exceptuada de pagos de tienda por usar transferencia. No eliminar ni alterar pagos web en esta preparación. |
| Cuenta | No se localizó un flujo completo de eliminación de cuenta en el frontend revisado; `coach-intake-flow.js:208` borra solo ficha y aclara que no borra cuenta/plan/diario | Brecha por verificar y resolver para la versión de tiendas: política de retención y mecanismo de eliminación de cuenta/datos. No ejecutar borrados ni inventar un botón sin respaldo técnico. |
| Salud y privacidad | Ficha, peso, registros, restricciones, consentimiento, mensajes, comprobantes; existen documentos legales y permisos | Inventario de datos y terceros, URL pública de privacidad/soporte/eliminación, declaraciones App Privacy/Data safety/Health. Revisar documentos vigentes, no publicar borradores como aprobados. |
| Avisos | Bandeja interna ya evaluada; ninguna integración push nativa agregada | Mantener el alcance actual; no prometer avisos push, HealthKit ni Health Connect. |
| Dispositivo | Diseño responsive aprobado; no hay proyecto nativo localizado | Validar safe areas, teclado, Atrás Android, navegación, interrupciones y recuperación de sesión. Sin pruebas físicas realizadas. |

No se inspeccionaron tablas ni se certificó la configuración alojada en este trabajo. La ausencia de un flujo en la búsqueda de código no demuestra ausencia de procesos administrativos externos.

## Diseño técnico propuesto, todavía sin implementar

1. Crear proyecto móvil separado, con dependencias fijadas y un directorio de recursos generado desde esta base. Preservar imágenes, módulos con hash y rutas relativas. La copia fuente mantiene su AssetVersion e identidad; no reutilizar esos valores como versión de tienda o bundle ID.
2. Empaquetar contenido local con Capacitor. Su opción `server.url` está documentada para live reload, no para producción: no usar la URL pública como atajo para presentar una simple ventana web.
3. Incorporar una configuración de pruebas explícita, cerrada por defecto y con datos ficticios antes de cualquier prueba autenticada. No crear otro backend pago ni modificar permisos de producción.
4. Probar compatibilidad de login, PDF, comprobantes y navegación en entornos nativos. Resolver solo lo necesario para tiendas, con capturas de cambios visuales antes de aprobar publicación.
5. Definir nombre de vendedor, titular de cuentas, identificadores definitivos y política de cobros. Preparar textos, clasificación, capturas reales, soporte y acceso de revisión. No reservar identificadores definitivos ni registrar cuentas todavía.

## Cuentas, compilación y costos

| Concepto | Situación |
|---|---|
| Preparación actual | Sin compras ni servicios nuevos. |
| Google Play | Tarifa oficial de registro US$25 una vez. Cuentas personales nuevas: 12 participantes de prueba cerrada durante 14 días continuos, luego solicitud de acceso a producción; también verificación de dispositivo. No se pagó ni inició prueba. |
| Apple | Membresía oficial US$99 por año, precio final según región. No se contrató. |
| iOS sin Mac de Edu | La compilación requiere macOS/Xcode en otro entorno. Evaluar disponibilidad y cuota de ejecución macOS en CI antes de habilitar un workflow; no se afirma compilación gratuita ni se creó servicio. |
| Android | Hay Java disponible en el entorno; no se verificó toolchain Android completo ni se generó AAB/APK. |
| Firma | No se generaron, solicitaron ni guardaron certificados, perfiles o claves de subida. |

Las tarifas de cuentas no incluyen impuestos, comisiones comerciales ni posibles costos de compilación. No hay presupuesto total cerrado. La revisión de las tiendas puede exigir adaptaciones; no hay garantía de aceptación ni fecha de lanzamiento.

## Requisitos y fuentes oficiales consultadas

Consulta: 13/11/2026. Verificar de nuevo antes del envío, especialmente SDK, pagos, pruebas y tarifas.

- Capacitor, incorporación a app existente: https://capacitorjs.com/docs/getting-started (package.json, recursos generados y entrada HTML raíz).
- Configuración, server.url y navegación: https://capacitorjs.com/docs/config
- Entorno y macOS/Xcode: https://capacitorjs.com/docs/getting-started/environment-setup
- Apple, membresía y titular individual/organización: https://developer.apple.com/programs/enroll/
- Apple, revisión (4.2 funcionalidad, 3.1 pagos y 5.1 privacidad): https://developer.apple.com/app-store/review/guidelines/
- Apple, eliminación de cuenta: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple, datos de privacidad: https://developer.apple.com/app-store/app-privacy-details/
- Google, cuenta y tarifa: https://support.google.com/googleplay/android-developer/answer/6112435
- Google, pruebas personales: https://support.google.com/googleplay/android-developer/answer/14151465
- Google, eliminación dentro de app y URL web: https://support.google.com/googleplay/android-developer/answer/13327111
- Google, declaración de salud: https://support.google.com/googleplay/android-developer/answer/14738291
- Google, políticas de pagos y excepciones: https://support.google.com/googleplay/android-developer/answer/9858738

La revisión de cobros debe distinguir funcionalidades digitales/licencias de software de servicios personales o presenciales, y considerar territorio y programas aplicables. No se asume ninguna excepción para esta app sin revisar su modalidad concreta.
