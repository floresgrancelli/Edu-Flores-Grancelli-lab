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

tab_p, tab_t, tab_g, tab_v = st.tabs([
    "🧬 Conversor de proteínas",
    "🌾 Humectación de trigo",
    "🌾 Gluten húmedo",
    "🧪 Gluten vital",
])

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


with tab_g:
    st.subheader("Determinación de gluten húmedo")
    st.write("Cálculo por duplicado, corregido a base 14 % de humedad (IRAM 15864-2:2013).")
    st.info("Masa fija de harina por determinación: **10,00 g**.")
    a, b = st.columns(2)
    with a:
        g1_texto = st.text_input("Pesada 1 de gluten húmedo (g)", placeholder="2,50")
    with b:
        g2_texto = st.text_input("Pesada 2 de gluten húmedo (g)", placeholder="2,55")
    hg_texto = st.text_input("Humedad de la harina (%)", placeholder="14,00")
    if st.button("Calcular gluten húmedo", type="primary"):
        try:
            g1 = num(g1_texto)
            g2 = num(g2_texto)
            h = num(hg_texto)
            if not 0 <= h < 100:
                st.error("La humedad debe estar entre 0 y menos de 100 %.")
            elif g1 <= 0 or g2 <= 0:
                st.error("Las dos pesadas deben ser mayores que cero.")
            else:
                # GH = (m_G2 / 10 g) × 100 × 86 / (100 - H).
                factor = 860 / (100 - h)
                gh1 = g1 * factor
                gh2 = g2 * factor
                if gh1 > 100 or gh2 > 100:
                    st.error("El resultado supera el 100 % de gluten. Revisá los datos.")
                else:
                    promedio = (gh1 + gh2) / 2
                    diferencia = abs(gh1 - gh2)
                    st.metric(
                        "Gluten húmedo promedio (base 14 %)",
                        f"{promedio:.1f}".replace(".", ",") + " %",
                    )
                    c1, c2 = st.columns(2)
                    with c1:
                        st.metric("Gluten húmedo 1", pct(gh1))
                    with c2:
                        st.metric("Gluten húmedo 2", pct(gh2))
                    st.metric("Diferencia absoluta", pct(diferencia))
                    if diferencia <= 0.5 + 1e-9:
                        st.success("Cumple repetibilidad: diferencia ≤ 0,5 puntos porcentuales.")
                    else:
                        st.error("No cumple repetibilidad: diferencia > 0,5 puntos porcentuales.")
                    st.caption(
                        "La repetibilidad se comprueba con los resultados sin redondear. "
                        "El promedio se informa con un decimal."
                    )
        except ValueError:
            st.error("Ingresá ambas pesadas y la humedad como números válidos. Se acepta coma o punto decimal.")
    with st.expander("Fórmula y criterio IRAM"):
        st.latex(r"GH(\%)=\frac{m_{G2}}{10}\times100\times\frac{86}{100-H}")
        st.write(
            "m_G2: masa de gluten húmedo (g); H: humedad real de la harina (%). "
            "El resultado se expresa sobre base 14 % de humedad."
        )
        st.write(
            "Se calculan ambas determinaciones y se informa su promedio con una cifra decimal. "
            "La diferencia absoluta entre duplicados no debe superar 0,5 puntos porcentuales."
        )


with tab_v:
    st.subheader("Determinación de gluten vital")
    st.write(
        "Cálculos por duplicado según la planilla GlutenVital.xlsx del laboratorio. "
        "La masa inicial ronda 1,5 g, pero se ingresa la pesada exacta de cada determinación."
    )
    st.caption("Cargá las masas en gramos. Se acepta coma o punto decimal.")
    a, b = st.columns(2)
    with a:
        st.markdown("**Determinación 1**")
        v_m1_texto = st.text_input("Masa de muestra 1 (g)", placeholder="1,502")
        v_gh1_texto = st.text_input("Gluten húmedo 1 (g)", placeholder="3,266")
        v_gs1_texto = st.text_input("Gluten seco 1 (g)", placeholder="1,319")
        v_i1_texto = st.text_input("Pasa por la malla 1 (g) · opcional", placeholder="1,669")
    with b:
        st.markdown("**Determinación 2**")
        v_m2_texto = st.text_input("Masa de muestra 2 (g)", placeholder="1,503")
        v_gh2_texto = st.text_input("Gluten húmedo 2 (g)", placeholder="3,244")
        v_gs2_texto = st.text_input("Gluten seco 2 (g)", placeholder="1,332")
        v_i2_texto = st.text_input("Pasa por la malla 2 (g) · opcional", placeholder="1,717")

    if st.button("Calcular gluten vital", type="primary"):
        try:
            m1, m2 = num(v_m1_texto), num(v_m2_texto)
            gh1, gh2 = num(v_gh1_texto), num(v_gh2_texto)
            gs1, gs2 = num(v_gs1_texto), num(v_gs2_texto)
            index_completo = bool(v_i1_texto.strip()) and bool(v_i2_texto.strip())
            index_incompleto = bool(v_i1_texto.strip()) != bool(v_i2_texto.strip())

            if index_incompleto:
                st.error("Ingresá las masas que pasan la malla en ambos duplicados, o dejá ambas vacías.")
            elif any(x <= 0 for x in (m1, m2, gh1, gh2, gs1, gs2)):
                st.error("Las masas de muestra, gluten húmedo y gluten seco deben ser mayores que cero.")
            elif gs1 > gh1 or gs2 > gh2:
                st.error("La masa de gluten seco no puede superar la de gluten húmedo en la misma determinación.")
            else:
                i1 = num(v_i1_texto) if index_completo else None
                i2 = num(v_i2_texto) if index_completo else None
                if index_completo and (i1 < 0 or i2 < 0 or i1 > gh1 or i2 > gh2):
                    st.error("La masa que pasa la malla debe estar entre 0 y la masa de gluten húmedo correspondiente.")
                else:
                    humedos = [gh1 / m1 * 100, gh2 / m2 * 100]
                    secos = [gs1 / m1 * 100, gs2 / m2 * 100]
                    indices = [
                        (gh1 - i1) / gh1 * 100,
                        (gh2 - i2) / gh2 * 100,
                    ] if index_completo else None

                    st.success("Cálculo realizado")
                    st.markdown("**Resultados promedio de la muestra**")
                    c1, c2, c3 = st.columns(3)
                    with c1:
                        st.metric("Gluten húmedo", pct(sum(humedos) / 2))
                    with c2:
                        st.metric("Gluten seco", pct(sum(secos) / 2))
                    with c3:
                        if indices is not None:
                            st.metric("Gluten Index", pct(sum(indices) / 2))
                        else:
                            st.metric("Gluten Index", "No determinado")

                    st.markdown("**Resultados por duplicado**")
                    st.dataframe(
                        {
                            "Determinación": ["1", "2"],
                            "Gluten húmedo (%)": [round(x, 2) for x in humedos],
                            "Gluten seco (%)": [round(x, 2) for x in secos],
                            **(
                                {"Gluten Index (%)": [round(x, 2) for x in indices]}
                                if indices is not None else {}
                            ),
                        },
                        hide_index=True,
                        use_container_width=True,
                    )
                    st.caption(
                        "En gluten vital, el gluten húmedo puede superar el 100 % "
                        "porque absorbe agua; se expresa como masa recuperada respecto de la muestra inicial."
                    )
        except ValueError:
            st.error("Revisá las pesadas: ingresá números válidos (se acepta coma o punto decimal).")

    with st.expander("Fórmulas utilizadas"):
        st.latex(r"Gluten\ húmedo\ (\%)=\frac{m_{GH}}{m_{muestra}}\times100")
        st.latex(r"Gluten\ seco\ (\%)=\frac{m_{GS}}{m_{muestra}}\times100")
        st.latex(r"Gluten\ Index\ (\%)=\frac{m_{GH}-m_{pasa}}{m_{GH}}\times100")
        st.write(
            "Cada fórmula se aplica por separado a las dos determinaciones. "
            "El resultado final es el promedio de ambas. "
            "m_pasa es la masa de gluten húmedo que atraviesa la malla."
        )
        st.info("Fórmulas tomadas de la planilla interna GlutenVital.xlsx; no se atribuye una norma no verificada.")
