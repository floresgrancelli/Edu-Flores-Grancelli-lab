"""Build a portable preview with the existing renderer, logo and bowl photo."""
import base64
from pathlib import Path

HERE = Path(__file__).resolve().parent
PILOT = HERE.parent.parent / "pilot"
icons = {
    "HOME": '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    "GUIDE": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
    "CHART": '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
    "MORE": '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    "ARROW": '<path d="M4 12h15m-5-5 5 5-5 5"/>',
    "PLUS": '<path d="M12 5v14M5 12h14"/>',
    "MESSAGE": '<path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/><path d="M7 10h9M7 14h6"/>',
    "SUN": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    "CUP": '<path d="M4 8h13v6a6 6 0 0 1-12 0V8m13 0h1a3 3 0 0 1 0 6h-2M3 21h16M8 3v2M13 3v2"/>',
    "MEAL": '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 3-4 6-4 10h4m0-10v18"/>',
    "MOON": '<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
}

def icon(name):
    return '<svg aria-hidden="true" viewBox="0 0 24 24">' + icons[name] + '</svg>'

def inline_asset(path, mime):
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode()

html = (HERE / "mi-dia.template.html").read_text()
summary = (PILOT / "pastel-day.js").read_text().replace("export const ", "const ").replace("export function ", "function ")
html = html.replace("__SUMMARY_SOURCE__", summary)
html = html.replace("__BOWL__", inline_asset(PILOT / "welcome-bowl.jpg", "image/jpeg"))
html = html.replace("__LOGO__", inline_asset(PILOT / "assets/serotonina-acuarela.avif", "image/avif"))
for name in icons:
    html = html.replace("__" + name + "__", icon(name))
    html = html.replace("__" + name + "_JS__", icon(name))
assert "__SUMMARY_SOURCE__" not in html
(HERE / "mi-dia.html").write_text(html)
print("Built mi-dia.html: existing renderer and two inline app assets; no runtime network dependencies.")
