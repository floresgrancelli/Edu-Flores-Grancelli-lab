# Recordatorios de comidas

## Prueba aislada

1. Aplicar `schema.candidate.sql` y después `delivery-claim.candidate.sql` en la base de prueba.
2. Desplegar `edge.ts` como función de prueba junto a sus módulos locales. El gateway debe permitir que la función valide el secreto propio del cron. La función exige ese secreto antes de consultar la base.
3. Configurar `NCC_REMINDER_CRON_SECRET`, `NCC_VAPID_SUBJECT`, `NCC_VAPID_PUBLIC_KEY` y `NCC_VAPID_PRIVATE_KEY` como secretos de la función. Usar la clave pública en el meta `ncc-web-push-key` de la página de prueba.
4. Con una cuenta ficticia, activar avisos desde Configuración y guardar una hora cercana. Invocar la función una vez con POST autenticado en ese minuto. Verificar recepción, apertura del horario en Mi Día y registro habitual solo al confirmar.
5. Repetir con una comida registrada y con una segunda llamada para el mismo día y horario. Comprobar que no llega otro aviso.
6. Tras verificar la prueba manual, guardar la URL completa y el secreto de la función en Vault como `ncc_reminder_job_url` y `ncc_reminder_job_secret`. Con pg_cron, pg_net y Vault habilitados, ejecutar `schedule.candidate.sql` en la base de prueba.

Para detener el envío programado, ejecutar `select cron.unschedule('ncc-meal-reminders');`.
