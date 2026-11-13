# Nutrición Con-Ciencia · Preparación para App Store y Google Play

Estado al 13/11/2026: copia de código creada; opción 3 (preparación sin pagos). No es una app nativa compilada ni una candidata de publicación.

## Base y aislamiento

- Producción confirmada: `bd6efa0d767436c6d06155eb83b89a9b37540287` (PR122).
- Rama de trabajo: `work/ncc-store-readiness-20261113`.
- Árbol inicial: `73e3300f204b068f9caa6c7777b1f13a8ecd803e`.
- Subárbol `efg-nutrition`: `e4cd7f709956045ffe3ee0df044ae9e84bd49c14`.
- La rama conserva todo el código y su historial; no se duplica otro repositorio. La configuración de Render sigue apuntando a `efg-nutrition-app`.
- En esta entrega solo se añaden documentos en `store-preparation/`, fuera del directorio publicado por Render. Código, workflows, versiones, catálogo y datos no cambian.

La copia de código **no crea una copia de la base de datos**. El cliente heredado apunta al backend de producción. No abrir esta rama para pruebas autenticadas con usuarios ficticios ni ejecutar escrituras sin aislar antes el transporte/entorno. No se copiaron sesiones, datos de alumnos ni credenciales privadas. No se consultó ni modificó el backend en esta preparación.

## Entregables

- `readiness.md`: compatibilidad observada, requisitos pendientes y próximo paso.
- `baseline.json`: identidad y hashes de archivos clave de la base copiada.

## Alcance autorizado

Preparar el destino Android/iPhone, conservar la app publicada, sin Mac de Edu, sin abrir cuentas pagas, instalar servicios, contratar compilación ni generar gastos. No hay merge a producción, deploy, envío a tiendas, claves de firma ni compra de membresías.

El siguiente trabajo técnico propuesto es preparar un paquete web local reproducible para Capacitor en esta rama y probarlo con transporte ficticio, antes de conectar cuentas reales. No presupone aprobación de las tiendas ni paridad ya comprobada en dispositivos nativos.
