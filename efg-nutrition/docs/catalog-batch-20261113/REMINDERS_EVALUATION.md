# Evaluación de recordatorios · 13/11/2026

Base revisada: e2dc451f75d0b4d31fa9af3b39a83c62626c13c8 (PR118).

La aplicación implementa una bandeja interna persistente en notifications-ui.js, con avisos de guía, cambios de plan, informes, registro faltante, pagos y mensajes. Consulta avisos del destinatario, distingue leídos y no leídos, y actualiza al recuperar foco y periódicamente mientras está visible. No se encontró una preferencia de frecuencia/intensidad, ni una API que permita respetarla, ni una implementación de notificaciones push del navegador.

La migración 20261028_notifications_fridays.sql define recordatorios internos para coaches: diario a las 12:00 UTC (09:00 Argentina) y aviso de informe viernes 12:15 UTC (09:15 Argentina). Esto describe el código; NO confirma que los trabajos estén instalados, activos ni ejecutándose en producción.

La conexión identificó el proyecto cyjvddhimbsfipjfctsl, EFG Nutrition. Las lecturas SQL y de migraciones fueron rechazadas por permisos. No se accedió por otra cuenta ni se modificó la base.

Decisión: no agregar un selector de frecuencia en la ficha que hoy no tendría efecto. No activar avisos ni modificar su entrega. Una futura preferencia requiere alcance separado: modelo de preferencias y aplicación efectiva por destinatario en los emisores existentes, verificación del programador real y revisión de la interfaz antes de publicar. No implica recordatorios por correo ni push, nuevas automatizaciones o gastos.
