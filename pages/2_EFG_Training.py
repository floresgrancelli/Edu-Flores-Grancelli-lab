"""EFG Training: rutina de cinco días, registro y progreso individual."""
from __future__ import annotations

import csv
import io
import json
import math
import re
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import streamlit as st
from streamlit_local_storage import LocalStorage

st.set_page_config(
    page_title="EFG Training",
    page_icon="💪",
    layout="centered",
    initial_sidebar_state="auto",
)

st.markdown(
    """
    <style>
    .block-container {max-width: 850px; padding-top: 1.4rem;}
    div[data-testid="stMetric"] {background: rgba(130,130,130,.08);
        padding: .85rem; border-radius: 14px;}
    .smallmuted {opacity:.68; font-size:.85rem;}
    </style>
    """,
    unsafe_allow_html=True,
)

DATA_PATH = Path(__file__).resolve().parent.parent / "training" / "plan.json"
STORAGE_KEY = "efg_training_records_v1"


@st.cache_data
def read_plan():
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)["exercises"]


def clean_records(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return []
    if not isinstance(value, list):
        return []
    valid = []
    for r in value[:20000]:
        if not isinstance(r, dict):
            continue
        if not all(k in r for k in ("id", "fecha", "ejercicio", "peso_kg", "repeticiones")):
            continue
        try:
            date.fromisoformat(str(r["fecha"]))
            peso = float(r["peso_kg"])
            reps = int(r["repeticiones"])
        except (ValueError, TypeError):
            continue
        if not (math.isfinite(peso) and 0 <= peso <= 1000 and 0 <= reps <= 10000):
            continue
        valid.append(r)
    return valid


def number(text, fallback=0):
    result = re.findall(r"\d+", str(text))
    return int(result[0]) if result else fallback


def series_reps(text, series_count):
    found = re.findall(r"\d+", str(text))
    if len(found) == series_count and "-" in str(text):
        return [int(x) for x in found]
    return [int(found[0]) if found else 8] * series_count


def key_of(r):
    return str(r["id"])


def save_records(storage, records):
    # Copia por navegador/dispositivo. Nunca se almacena en GitHub.
    storage.setItem(STORAGE_KEY, json.dumps(records, ensure_ascii=False), key="save_" + str(pd.Timestamp.utcnow().value))


def export_csv(records):
    columns = ["fecha", "semana_plan", "dia", "ejercicio", "serie", "peso_kg", "repeticiones", "rir", "tipo", "notas"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for item in records:
        writer.writerow(item)
    return output.getvalue().encode("utf-8-sig")


plan = read_plan()
storage = LocalStorage(key="efg_training_storage_initializer")
if "efg_training_records_session" not in st.session_state:
    st.session_state.efg_training_records_session = clean_records(storage.getItem(STORAGE_KEY))
records = st.session_state.efg_training_records_session

st.title("💪 EFG Training")
st.caption("Tu entrenamiento. Tu progreso. Tu ritmo.")
st.info(
    "Esta aplicación es pública, pero tus registros se guardan SOLO en este navegador. "
    "Para no perderlos, descargá una copia de seguridad periódicamente. "
    "El historial todavía no se sincroniza entre iPhone, Mac y Windows.",
    icon="🔒",
)

t_entrenar, t_progreso, t_historial, t_backup = st.tabs(
    ["🏋️ Entrenar", "📊 Progreso", "📅 Historial", "💾 Respaldos"]
)

with t_entrenar:
    c1, c2 = st.columns(2)
    with c1:
        sem = st.selectbox("Semana del plan", [1, 2, 3, 4], index=0)
    with c2:
        dia = st.selectbox(
            "Día de entrenamiento",
            [1, 2, 3, 4, 5],
            format_func=lambda x: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][x],
        )

    dia_plan = [item for item in plan if item["week"] == sem and item["day"] == dia]
    st.caption(f"Semana {sem} · Día {dia} · {len(dia_plan)} ejercicios planificados")
    if not dia_plan:
        st.warning("No se encontraron ejercicios para esa combinación.")
        st.stop()

    idx = st.selectbox(
        "Elegí el ejercicio",
        range(len(dia_plan)),
        format_func=lambda i: f"{i+1}. {dia_plan[i]['exercise']}",
    )
    ejercicio = dia_plan[idx]
    st.subheader(ejercicio["exercise"])
    top = st.columns(3)
    top[0].metric("Series objetivo", ejercicio["sets"] or "—")
    top[1].metric("Reps objetivo", ejercicio["reps"] or "—")
    top[2].metric("Intensidad", ejercicio["intensity"] or "—")

    if ejercicio.get("block"):
        st.caption("Bloque: " + ejercicio["block"])
    if ejercicio.get("notes"):
        st.caption("Indicaciones: " + ejercicio["notes"])

    fecha = st.date_input("Fecha de esta sesión", value=date.today(), format="DD/MM/YYYY")
    unidad_carga = st.radio(
        "Unidad de carga",
        ["kg", "lb"],
        horizontal=True,
        help="La carga se guarda internamente en kg. 1 libra = 0,45359237 kg.",
    )
    is_timed = "segundo" in ejercicio["reps"].lower()
    series = max(1, min(12, number(ejercicio["sets"], 3)))
    suggested = series_reps(ejercicio["reps"], series)

    existing = {
        int(r.get("serie", 0)): r
        for r in records
        if r.get("fecha") == fecha.isoformat()
        and int(r.get("semana_plan", 0)) == sem
        and int(r.get("dia", 0)) == dia
        and r.get("ejercicio_id") == ejercicio["id"]
    }
    last_records = sorted(
        [r for r in records if r.get("ejercicio", "").lower() == ejercicio["exercise"].lower()],
        key=lambda r: (r["fecha"], int(r.get("serie", 0))), reverse=True
    )
    prev_weight = float(last_records[0]["peso_kg"]) if last_records else 0.0
    if unidad_carga == "lb":
        prev_weight /= 0.45359237

    with st.form("efg_series_form", clear_on_submit=False):
        st.markdown("**Anotá cada serie realizada**")
        updates = []
        for i in range(1, series+1):
            saved = existing.get(i)
            initial_kg = float(saved["peso_kg"]) if saved else prev_weight
            initial_weight = initial_kg / 0.45359237 if unidad_carga == "lb" else initial_kg
            initial_reps = int(saved["repeticiones"]) if saved else suggested[i-1]
            a, b, c = st.columns([1.05, 1.2, 1.2])
            with a:
                st.markdown(f"**Serie {i}**")
            with b:
                peso = st.number_input(
                    f"Carga ({unidad_carga}) · S{i}", min_value=0.0,
                    max_value=2000.0, value=round(initial_weight, 2), step=2.5,
                    key=f"efg_w_{sem}_{dia}_{ejercicio['id']}_{fecha}_{i}_{unidad_carga}",
                )
            with c:
                reps = st.number_input(
                    ("Segundos" if is_timed else "Reps") + f" · S{i}",
                    min_value=0, max_value=10000, value=initial_reps,
                    step=1,
                    key=f"efg_r_{sem}_{dia}_{ejercicio['id']}_{fecha}_{i}",
                )
            updates.append((peso, reps))

        rir_options = ["No registrado", 0, 1, 2, 3, 4, 5]
        rir_default = number(ejercicio["intensity"], 2) if "RIR" in ejercicio["intensity"].upper() else "No registrado"
        rir_index = rir_options.index(rir_default) if rir_default in rir_options else 0
        rir = st.selectbox("RIR observado (opcional)", rir_options, index=rir_index)
        observaciones = st.text_area(
            "Observaciones de hoy (opcional)",
            placeholder="Técnica, sensación, cambio de equipo…",
            height=75,
        )
        enviar = st.form_submit_button("💾 Guardar series", type="primary", use_container_width=True)

    if enviar:
        remaining = [
            r for r in records
            if not (
                r.get("fecha") == fecha.isoformat()
                and int(r.get("semana_plan", 0)) == sem
                and int(r.get("dia", 0)) == dia
                and r.get("ejercicio_id") == ejercicio["id"]
            )
        ]
        for i, (peso, reps) in enumerate(updates, start=1):
            kg = float(peso) * (0.45359237 if unidad_carga == "lb" else 1.0)
            remaining.append({
                "id": f"{fecha.isoformat()}_{sem}_{dia}_{ejercicio['id']}_{i}",
                "fecha": fecha.isoformat(),
                "semana_plan": sem,
                "dia": dia,
                "ejercicio_id": ejercicio["id"],
                "ejercicio": ejercicio["exercise"],
                "serie": i,
                "peso_kg": round(kg, 4),
                "repeticiones": int(reps),
                "tipo": "segundos" if is_timed else "repeticiones",
                "rir": None if rir == "No registrado" else int(rir),
                "notas": observaciones.strip()[:500],
            })
        st.session_state.efg_training_records_session = remaining
        records = remaining
        save_records(storage, records)
        st.success(
            f"Guardadas {len(updates)} series de {ejercicio['exercise']} "
            f"para el {fecha.strftime('%d/%m/%Y')} en este navegador."
        )
        st.caption("Usá la pestaña Respaldos para descargar una copia de tus registros.")

    completed = {
        r.get("ejercicio_id") for r in records
        if r.get("fecha") == fecha.isoformat()
        and int(r.get("semana_plan", 0)) == sem
        and int(r.get("dia", 0)) == dia
    }
    st.progress(min(1.0, len(completed) / max(1, len(dia_plan))))
    st.caption(f"Ejercicios registrados para este día: {len(completed)} de {len(dia_plan)}")

with t_progreso:
    st.subheader("Estadísticas semanales")
    if not records:
        st.info("Todavía no hay entrenamientos registrados. Empezá en la pestaña Entrenar.")
    else:
        df = pd.DataFrame(records)
        df["fecha_dt"] = pd.to_datetime(df["fecha"], errors="coerce")
        df = df.dropna(subset=["fecha_dt"])
        df["semana_inicio"] = df["fecha_dt"].apply(
            lambda d: (d.date() - timedelta(days=d.weekday())).isoformat()
        )
        df["peso_kg"] = pd.to_numeric(df["peso_kg"], errors="coerce").fillna(0)
        df["repeticiones"] = pd.to_numeric(df["repeticiones"], errors="coerce").fillna(0)
        df["volumen"] = df.apply(
            lambda r: r["peso_kg"] * r["repeticiones"]
            if r.get("tipo", "repeticiones") == "repeticiones" else 0.0,
            axis=1
        )
        a, b, c = st.columns(3)
        a.metric("Series registradas", len(df))
        b.metric("Días entrenados", df["fecha"].nunique())
        c.metric("Ejercicios distintos", df["ejercicio"].nunique())
        vol = df.groupby("semana_inicio", as_index=True)["volumen"].sum().sort_index()
        st.markdown("**Volumen de carga externa por semana (kg × repeticiones)**")
        st.bar_chart(vol, y_label="kg·reps")
        st.caption(
            "Volumen orientativo: no incluye peso corporal, segundos isométricos ni "
            "equivalencias entre máquinas. Compará ejercicios con las mismas condiciones."
        )
        opciones = sorted(df["ejercicio"].dropna().unique().tolist())
        elegido = st.selectbox("Evolución de un ejercicio", opciones, key="efg_stat_ex")
        exdf = df[df["ejercicio"] == elegido]
        mejor = exdf.groupby("fecha", as_index=True)["peso_kg"].max().sort_index()
        st.line_chart(mejor, y_label="kg")
        st.metric("Mayor carga registrada", f"{mejor.max():.2f} kg".replace(".", ","))
        st.caption("Se muestra la carga máxima por sesión, no una estimación de 1RM.")
        st.markdown("**Resumen por semana**")
        resumen = df.groupby("semana_inicio", as_index=False).agg(
            series=("serie", "count"),
            ejercicios=("ejercicio", "nunique"),
            volumen_kg_reps=("volumen", "sum"),
            dias=("fecha", "nunique"),
        ).sort_values("semana_inicio", ascending=False)
        st.dataframe(resumen, use_container_width=True, hide_index=True)

with t_historial:
    st.subheader("Historial de entrenamientos")
    if not records:
        st.info("Todavía no hay registros en este navegador.")
    else:
        df = pd.DataFrame(records).sort_values(
            ["fecha", "dia", "ejercicio", "serie"], ascending=[False, True, True, True]
        )
        columnas = {
            "fecha": "Fecha", "dia": "Día", "semana_plan": "Semana del plan",
            "ejercicio": "Ejercicio", "serie": "Serie",
            "peso_kg": "Carga (kg)", "repeticiones": "Reps/segundos",
            "tipo": "Medida", "rir": "RIR", "notas": "Notas",
        }
        st.dataframe(df[[k for k in columnas if k in df.columns]].rename(columns=columnas),
                     hide_index=True, use_container_width=True)

with t_backup:
    st.subheader("Tus datos y copias de seguridad")
    st.write(
        "Los registros permanecen en el almacenamiento local de este navegador. "
        "No aparecen automáticamente en otros dispositivos. Si borrás los datos "
        "del navegador o cambiás de teléfono, podrían desaparecer."
    )
    backup_json = json.dumps(records, ensure_ascii=False, indent=2).encode("utf-8")
    st.download_button(
        "⬇️ Descargar copia de seguridad JSON",
        data=backup_json,
        file_name="efg_training_respaldo.json",
        mime="application/json",
        use_container_width=True,
    )
    st.download_button(
        "⬇️ Descargar historial CSV para Excel",
        data=export_csv(records),
        file_name="efg_training_historial.csv",
        mime="text/csv",
        use_container_width=True,
    )
    archivo = st.file_uploader("Recuperar un respaldo JSON", type=["json"])
    if archivo is not None:
        try:
            entrada = json.loads(archivo.getvalue().decode("utf-8"))
            recuperados = clean_records(entrada)
            if len(recuperados) == 0 and entrada:
                st.error("El archivo no parece contener registros válidos.")
            else:
                st.caption(f"Se detectaron {len(recuperados)} series válidas.")
                if st.button("Importar y combinar con mi historial", type="primary"):
                    merged = {key_of(r): r for r in records}
                    merged.update({key_of(r): r for r in recuperados})
                    st.session_state.efg_training_records_session = list(merged.values())
                    save_records(storage, st.session_state.efg_training_records_session)
                    st.success("Historial importado en este navegador. Actualizá la página para ver las estadísticas.")
        except (UnicodeError, json.JSONDecodeError, ValueError):
            st.error("No se pudo leer el archivo. Elegí un respaldo JSON de EFG Training.")

    st.warning(
        "Compartir el enlace comparte la aplicación, NO tus registros. "
        "No subas tus copias de seguridad a repositorios públicos."
    )
