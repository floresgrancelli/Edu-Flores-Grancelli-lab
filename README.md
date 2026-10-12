# Edu Flores Grancelli Lab 🧪

Herramientas digitales para el laboratorio, creadas por EFG.

Incluye:
- 💧 **Análisis de humedad**: cantidad, promedio, mínimo, máximo y rango.
- 🧬 **Conversor de proteínas**: base seca, base 13,5 % y base tal cual según humedad real.
- 🌾 **Humectación de muestras de trigo**: humedad objetivo del 16 % y 5 mL adicionales por pérdidas en molienda.

## Ejecutar localmente

Instalar dependencias con `python3 -m pip install -r requirements.txt` y ejecutar con `streamlit run app.py`.

## Publicar en Streamlit Community Cloud

1. Abrir https://share.streamlit.io/ e iniciar sesión mediante GitHub.
2. Elegir **Create app** → desplegar desde GitHub.
3. Repositorio: **floresgrancelli/Edu-Flores-Grancelli-lab**
4. Rama: **main**; archivo principal: **app.py**.
5. Pulsar **Deploy**.

No subir contraseñas, registros identificables de pacientes ni datos confidenciales a un repositorio público.

Los cálculos admiten punto o coma como separador decimal. Verificá los resultados contra el método oficial aplicable.
