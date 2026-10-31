# REL-EXPERIENCE-01 · EFG Nutrition Coach — Gran Actualización · UAT y GO/NO GO
**2026-10-30 · Documento de prueba, no habilita despliegue · PR #37 DRAFT**

## Objetivo
Validar la experiencia completa **alumno / coach / administrador EFG** con usuarios de prueba en un entorno aislado fiel y luego en móviles reales. Proteger todo el historial actual, incluido el registro de comidas, mensajes, pagos, comprobantes, recetas y metas. **No borrar, migrar por sustitución ni recrear perfiles.** Autogestión no forma parte de este lanzamiento.

## Orden de prueba (móvil Android Chrome/PWA + iPhone Safari/PWA + computadora)
| ID | Perfil | Recorrido | Evidencia de aprobación |
|---|---|---|---|
| EX-01 | Alumno existente | Volver a iniciar sesión por OTP, aceptar **dos** documentos vigentes (Términos y Privacidad) y abrir una ficha de nueva versión **vacía**, sin arrastrar respuestas previas | Foto/registro ficticio; historial antiguo sigue visible y sin cambios |
| EX-02 | Alumno | Completar objetivo, medidas, actividad, patrón, gustos; compartir ficha solo mediante permiso explícito; poder retirar permiso | Coach no puede ver ficha retirada; RLS con JWT real comprobada |
| EX-03 | Alumno + coach | Declaración clínica con **consentimiento específico** separado (lactosa/SIBO, etc.), diagnóstico confirmado/en estudio, permiso independiente de compartir | Sin documento clínico publicado o sin consentimiento: NO se recoge ningún dato; al revocar, coach pierde lectura; datos clínicos no van en notas |
| EX-04 | Alumno | Elegir 5 ingestas, alimentos autocompletables, proteína/carbohidratos/plato preparado en comidas principales, omitir categoría; snack libre | Sin solapamientos, autocompletado inmediato, gramos/unidades y macros coherentes |
| EX-05 | Alumno | Guardar 2 desayunos habituales; recargar y seleccionar el correcto al día siguiente | Los habituales sobreviven a nuevas sesiones; no se duplica el registro |
| EX-06 | Alumno | Resolver faltantes: merienda 1/3 y cena 2/3 o solo cena; tolerancia únicamente **5%** | Ninguna recomendación de gramos no realista; total de calorías/macros coincide entre vistas |
| EX-07 | Coach | Revisar ficha; preparar calculadora y guía editable de 5 comidas; separar proteína/carbohidratos donde corresponde; aprobar y compartir manualmente | No hay auto publicación sin permiso, RLS, compatibilidad alimentaria y control del coach |
| EX-08 | Restricciones | Superponer celiaquía + lactosa, o SIBO en estudio; alimentos con evidencia faltante, revisada, vencida y contradictoria | Gris sin restricción; amarillo sin verificación; rojo ante incompatibilidad revisada; verde **solo** con evidencia vigente de TODAS las restricciones |
| EX-09 | Coach | Crear informe Luxury Pro con días incompletos, comparación kcal/macros por metas históricas, top 5 comidas y focos semanales | Los días sin registro no cuentan como cero; informe visual premium y científico, sin permisos/recompensas automáticas |
| EX-10 | Coach | Editar conclusión, cambiar otra pantalla, volver, actualizar vista previa, aprobar, exportar PDF y consultar historial por fecha | La versión enviada coincide con la vista previa; no se sobrescribe el informe histórico; sin edición aprobada no se publica |
| EX-11 | Alumno | Abrir informe, guardar PDF y tocar **Responder informe al coach** | Chat correcto y texto contextual como borrador; nada enviado automáticamente |
| EX-12 | Todos | Mensajería tipo WhatsApp, aviso de nuevo mensaje, notificaciones/bell flotante; aviso de actualización de app | Sin cruces entre alumnos, alerta visible, no se pierde texto al navegar, PWA actualiza previa aceptación |
| EX-13 | Coach + alumno | Alias de transferencia, comprobante de pago, aceptación/rechazo; verificar evidencias previas | Privacidad por organización y rol; recibos históricos conservados |
| EX-14 | Admin EFG | Panel de organizaciones, coaches, roles, permisos, estado de planes | No leer datos de salud sin base legal/autorización independiente; ausencia de escalamiento de rol |
| EX-15 | Dispositivos | Android Gboard, selección/accesibilidad, scroll, rotación, back, refrescar/abrir PWA, pantallas 320–430px; iOS Safari | Sin overflow, crash ni pérdida de sesión/edición; logo serotonina real (anillos), cargadores y experiencia Luxury Pro |
| EX-16 | Infraestructura | Backup real restaurado a entorno aislado; roles A/B JWT sobre **19 RPC alojadas**, Storage privado y restore de comprobantes | Documento técnico de paridad contra baseline; rollback practicado; no basta snapshot sintético |
| EX-17 | Legal/Clínica | Revisión de tratamiento de datos sensibles, privacidad, guías lactosa/SIBO, alimentos y porciones realmente verificados | Aval profesional/jurídico registrado; ninguna recomendación clínica automática no validada |
| EX-18 | Publicación | Último SHA 5/5 CI, PR revisado, backups y rollback, autorización GO explícita | Solo entonces merge PR y despliegue Render; capturas y log postdespliegue |

## Experiencia de relanzamiento
1. Entrada con identidad visual EFG Nutrition + **serotonina con estructura reconocible**, transición elegante y diseño Premium Luxury Pro; no bloquear la interacción por animación.
2. Pantalla de novedades breve y accesible; aceptar por separado condiciones legales y privacidad (NO confundir con consentimiento clínico).
3. Nueva ficha del alumno **sin borrar los registros anteriores** y posterior entrega al coach, quien puede preparar una guía científica editable con previa revisión.
4. MI DÍA: colores elegantes, tarjetas legibles, 5 comidas intuitivas, macros y «Resolver lo que me falta».
5. Informe Luxury Pro de valor nuevo para el alumno, con interpretación de lo registrado, top alimentos, recomendaciones editables y respuesta al coach.

## Semáforo de liberación
**VERDE:** CI 5/5 sobre SHA final, staging restaurado fielmente, backups con prueba de recuperación, matriz JWT/Storage, validación legal y clínica, Android/iOS físicos y UAT sin incidencias graves.

**AMARILLO:** funcionalidad candidata solo probada con datos ficticios o emulación, documentos clínicos no publicados, evidencia dietética incompleta o pruebas manuales pendientes. **No afirmar GO total**.

**ROJO:** pérdida de historial, acceso cruzado, credenciales expuestas, ejecución clínica sin consentimiento, descarga o filtrado de recibos sin autorización, degradación severa móvil o no poder restaurar datos.

## Situación inicial
- Producción Render sigue en `9000e4d8e08bd9483770209a863b1cdba2141c43`.
- PR #37 DRAFT rama `efg-major-integration-20261029`; últimas pruebas generales previas a este documento 5/5 sobre `cd56aa3d8fdfe05370c005f2cece39984e7c7027`.
- CLIN-GUT-03 separado, **solo staging** y todavía sin documento de consentimiento clínico aprobado; SIBO/lactosa **no activos para datos reales**.
- No hay branch alojada de Supabase; Pro no demuestra por sí solo restauración; Android e iOS físicos pendientes.
- No hacer merge/deploy, DDL/DML alojada, proyecto/branch de pago ni habilitar Autogestión sin consentimiento.
