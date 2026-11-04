# P30N — ficha privada y permiso de compartir

Incidente observado en video del propietario después de P30M. Logs PostgreSQL 2026-11-04T21:28:38–21:29:30Z confirman `Separate pilot coach-sharing permission required`. La casilla de compartir de la ficha no sustituye el permiso separado del piloto.

Corrección limitada a frontend: comprobar el recibo vigente antes del RPC cuando se solicita compartir; mostrar una instrucción concreta dentro del formulario, conservar campos y permitir guardar privado con la casilla desmarcada. El recorrido existente Privacidad → Revisar permiso del piloto permite autorizar compartir por decisión explícita. Sin consentimientos automáticos, cambios SQL, históricos, roles, cupos ni costos.

Versionadas únicamente la entrada y las dos dependencias modificadas con `ncc-pilot-3a40474052be-intakefix1`. El identificador de release del servidor se conserva para evitar otra reautenticación. Manifiesto P30K original intacto; cuatro diferencias de runtime quedan fijadas en asset-overrides.json y verificadas en el contrato de release.

Pruebas dirigidas: falta de permiso no llama al RPC; guardado privado conserva revisión; permiso explícito posterior permite compartir la revisión siguiente; autorización de seguimiento independiente; cambios de cuenta, datos sensibles y conflictos siguen bloqueados. Resultado sintético PASS. No se modificaron permisos de usuarios reales para simular el éxito. Verificar despliegue y reintento del propietario antes de afirmar que su ficha real quedó guardada.
