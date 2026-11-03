# WALK-02 · Mi actividad · registro flexible de caminatas

**Trabajo complementario de la Gran Actualización.** Se prepara en una rama separada del PR43, que queda sin cambios. No aplicar la migración de columnas ni publicar la interfaz antes de que estén implementadas ambas partes y pasen las pruebas.

## Experiencia del alumno
Se conserva **Mi actividad**, visible desde Deportes y Mi progreso. El alumno puede ingresar, según disponibilidad:
- Pasos del día, sin GPS obligatorio.
- Distancia real caminada en kilómetros.
- Duración en minutos de la caminata.
- Ritmo aproximado (suave/moderado/rápido), útil cuando falta distancia o duración.
- Frecuencia cardíaca **media** opcional (lpm) como referencia, sin usarla para variar las kcal.
- Peso de la última medición, editable, y altura opcional para estimar longitud de paso.

Se prioriza la distancia y duración medidas si están presentes. Si solo hay pasos, se estima distancia mediante longitud de paso orientativa; si falta el tiempo se deriva del ritmo seleccionado. Si hay solo minutos, se puede derivar distancia del ritmo, marcado como estimación. Si la velocidad derivada excede el rango de caminata razonable, se suspende el cálculo en vez de fingir precisión. Sin peso no hay kcal. **La frecuencia cardíaca sola no permite estimarlas.**

Energía activa: `(MET-1) * masa_kg * minutos_caminados / 60`, usando referencias de marcha en terreno llano del **Compendio de Actividades Físicas 2024**. Se distingue de kcal totales, se registra como estimación y jamás se descuenta automáticamente del objetivo nutricional (evita doble conteo TDEE).

## Persistencia y límites
El backend existente `efg_activities` conserva un **resumen por alumno y día** (no sesiones múltiples). SQL candidato `docs/NCC_WALKING_V2_STAGING_ONLY.sql` añade solo 3 columnas opcionales con límites, sin tocar RLS, roles, consentimientos ni históricos. La nueva interfaz no puede activarse en producción antes de instalar el esquema, respaldar y aprobar la migración. El alumnado que no disponga de pulsera o reloj puede registrar sin datos de pulso.

**No incluye** integración HealthKit/Apple Health, Google Fit, GPS, métricas médicas, zonas cardíacas ni diagnóstico. No busca prescribir ejercicio. Cualquier futura incorporación de dispositivos requiere revisión de permisos y privacidad.

## QA mínima antes de fusionar
Pruebas offline: pasos tradicionales, distancia/tiempo manual, minutos solos, km solos, FC no altera kcal, valores inválidos, historial antiguo, no doble conteo y sin cambios de metas. Probar luego iPhone/Android, persistencia real y vuelta de sesión, antes de GO.

Referencias:
- 2024 Adult Compendium: https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/
- Revisión de precisión de wearables: https://pmc.ncbi.nlm.nih.gov/articles/PMC7509623/

## Segundo control automático
La rama independiente también prueba la migración aditiva en PostgreSQL 17 descartable: filas legacy intactas, políticas RLS sin cambios, tres columnas nulas para históricos, escritura/lectura nueva, seis negativos de rango y rechazo de migración repetida. Sigue sin ser prueba de persistencia hospedada ni autorización de despliegue.
