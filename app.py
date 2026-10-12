"""Edu Flores Grancelli Lab — herramientas de laboratorio."""
import math
import streamlit as st

st.set_page_config(page_title="Edu Flores Grancelli Lab", page_icon="🧪", layout="centered")

def pct(x):
    return f"{x:.2f}".replace(".", ",") + " %"

def ml(x):
    return f"{x:.2f}".replace(".", ",") + " mL"

def num(s):
    x = float(s.strip().replace(",", "."))
    if not math.isfinite(x):
        raise ValueError("El número debe ser finito")
    return x

st.title("Edu Flores Grancelli Lab")
st.caption("by EFG · Herramientas de laboratorio")

tab_h, tab_p, tab_t = st.tabs([
    "💧 Análisis de humedad",
    "🧬 Conversor de proteínas",
    "🌾 Humectación de trigo",
])

with tab_h:
    st.subheader("Análisis de humedad")
    entrada = st.text_area(
        "Pegá las humedades, una por línea",
        placeholder="13,78\n14,25\n13,98",
        height=170,
    )
    if st.button("Calcular humedad", type="primary"):
        lineas = [s.strip() for s in entrada.splitlines() if s.strip()]
        if not lineas:
            st.warning("Ingresá al menos una humedad.")
        else:
            try:
                valores = [num(s) for s in lineas]
                if any(not 0 <= h <= 100 for h in valores):
                    st.error("Las humedades deben estar entre 0 y 100 %.")
                else:
                    st.success(f"Muestras analizadas: {len(valores)}")
                    a, b = st.columns(2)
                    with a:
                        st.metric("Promedio", pct(sum(valores) / len(valores)))
                        st.metric("Mínimo", pct(min(valores)))
                    with b:
                        st.metric("Máximo", pct(max(valores)))
                        st.metric("Rango", pct(max(valores) - min(valores)))
            except ValueError:
                st.error("Ingresá solo números válidos, uno por línea. Ejemplo: 13,78.")

with tab_p:
    st.subheader("Conversor de proteínas")
    st.write("Convertí entre base seca, base 13,5 % y base tal cual.")
    origen = st.selectbox(
        "Base del valor de proteína informado",
        ["Base seca", "Base 13,5 %", "Base tal cual"],
    )
    p_texto = st.text_input("Proteína informada (%)", value="12,00")
    h_texto = st.text_input("Humedad real de la muestra (%)", value="14,00")
    if st.button("Convertir proteína", type="primary"):
        try:
            p = num(p_texto)
            h = num(h_texto)
            if not 0 <= h < 100:
                st.error("La humedad debe estar entre 0 y menos de 100 %.")
            elif not 0 <= p <= 100:
                st.error("La proteína debe estar entre 0 y 100 %.")
            else:
                humedad_origen = {
                    "Base seca": 0.0,
                    "Base 13,5 %": 13.5,
                    "Base tal cual": h,
                }[origen]
                bs = p * 100 / (100 - humedad_origen)
                if bs > 100 + 1e-9:
                    st.error("Los datos implican más de 100 % de proteína en base seca. Revisalos.")
                else:
                    st.success("Conversión realizada")
                    st.metric("Proteína en base seca", pct(bs))
                    a, b = st.columns(2)
                    with a:
                        st.metric("Base 13,5 %", pct(bs * 0.865))
                    with b:
                        st.metric("Base tal cual", pct(bs * (100 - h) / 100))
        except ValueError:
            st.error("Ingresá números válidos. Se acepta coma o punto decimal.")
    with st.expander("¿Cómo se calcula?"):
        st.write(
            "Proteína destino = proteína origen × (100 − humedad destino) "
            "/ (100 − humedad origen). La base seca tiene 0 % de humedad."
        )
        st.info("Para informes oficiales, verificá el método de análisis y el criterio de reporte.")

with tab_t:
    st.subheader("Humectación de muestras de trigo")
    st.write(
        "Agua necesaria para llevar el trigo a 16 % de humedad, "
        "más 5 mL adicionales por la pérdida durante la molienda."
    )
    peso_texto = st.text_input("Peso del trigo (g)", value="1000")
    humedad_texto = st.text_input("Humedad inicial del trigo (%)", value="12,00")
    st.caption("Humedad objetivo fija: 16 %. Adicional fijo por molienda: 5 mL.")
    if st.button("Calcular agua a agregar", type="primary"):
        try:
            peso = num(peso_texto)
            h = num(humedad_texto)
            if peso <= 0:
                st.error("El peso debe ser mayor que cero.")
            elif not 0 <= h <= 100:
                st.error("La humedad inicial debe estar entre 0 y 100 %.")
            elif h > 16:
                st.error("Si la humedad inicial supera 16 %, no se llega a 16 % agregando agua.")
            else:
                agua = (16 - h) * peso / 84
                st.success("Cálculo realizado")
                st.metric("Agua total a agregar", ml(agua + 5))
                a, b = st.columns(2)
                with a:
                    st.metric("Agua calculada", ml(agua))
                with b:
                    st.metric("Adicional por molienda", "5,00 mL")
                st.caption(f"Peso: {peso:g} g · Humedad inicial: {pct(h)} · Objetivo: 16,00 %")
        except ValueError:
            st.error("Ingresá números válidos. Se acepta coma o punto decimal.")
    with st.expander("Fórmula de humectación"):
        st.latex(r"\text{Agua (mL)} = \frac{(16-H)\times P}{84}+5")
        st.write(
            "H: humedad inicial (%). P: peso de trigo (g). "
            "84 = 100 − 16. Se considera la densidad del agua cercana a 1 g/mL."
        )
        st.info(
            "Los 5 mL adicionales se incorporan según el procedimiento de molienda. "
            "La humedad final real depende de las pérdidas efectivas."
        )
