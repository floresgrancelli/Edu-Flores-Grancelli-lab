# P26A — cobertura de perfil y recetas privadas
03/11/2026. NO GO, sin flags, merge, despliegue ni escrituras alojadas.

La revisión de P26 detectó dos consultas faltantes: perfil del alumno por coach B y recetas privadas por coaches A/B. El harness ahora exige además una receta ficticia visible para el alumno propietario: sin ese control positivo, una tabla vacía no acredita aislamiento. No lee nombres ni ingredientes, solo id/student_id, y no los imprime.

Preparación humana pendiente: tres identidades ficticias autenticadas por OTP y dos organizaciones TEST independientes; crear una receta privada sintética con la identidad del alumno mediante un flujo autorizado antes de correr las cuatro fases. No utilizar cuentas históricas. El harness sigue exclusivamente GET. Crear la receta no implica aprobación nutricional ni consumo.

Prueba offline ejecutada: contrato existente y negativas nuevas ante fuga de perfil, fuga de receta o ausencia de control positivo. PASS local, no JWT alojado. No modifica políticas RLS: la lectura de pg_policies confirmó SELECT de recetas limitado a student_id=auth.uid().

Acceso pendiente: navegador Work redirige el dashboard de Supabase a sign-in. No se pudo verificar membresía de buzones ni iniciar OTP. Lectura agregada alojada: 1 organización TEST, 0 fichas, 0 borradores y 0 filas de fuentes revisadas. No existe guía final real para generar un expediente definitivo; no sustituirla por plantilla.

CI previo d7c60ba997b3635f23ebf5365d51f35454c36179: seis SUCCESS. Esta corrección cambia el HEAD y requiere comprobar sus seis CI. Expediente de plantilla ya generado por Premium 41696528719, artifact 13260628474, no caducado al control; no equivale a guía final ni aprobación humana.

Corte posterior a resolución de dependencias y GO: preparar overlay versionado con los siete switches definidos en NCC_PILOT_UAT_MINIMA_Y_CORTE_SEGURO_20261103.md; ruta duplicada OFF; verificar SHA resultante y seis CI; coordinar dos flags servidor y merge/despliegue autorizado; verificar versión realmente servida y UAT física. Reversión: cerrar flags de nuevas operaciones y restaurar frontend previo autorizado, sin borrar datos ni revertir esquema automáticamente. Restauración integral diferida.
