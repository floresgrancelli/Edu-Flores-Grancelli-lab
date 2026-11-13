#!/usr/bin/env python3
"""No credentials: confirm the installed app opens the real sign-in page."""
import pathlib
import subprocess
import time
import xml.etree.ElementTree as ET

out=pathlib.Path('smoke-evidence');out.mkdir(exist_ok=True)
def adb(*args):
    return subprocess.run(['adb',*args],check=True,capture_output=True,text=True).stdout
adb('install','-r','app/build/outputs/apk/debug/app-debug.apk')
adb('shell','am','start','-W','-n','ar.com.nutricionconciencia.app/com.google.androidbrowserhelper.trusted.LauncherActivity')
matched=False
for attempt in range(18):
    time.sleep(3)
    adb('shell','uiautomator','dump','/sdcard/ncc-window.xml')
    xml=adb('shell','cat','/sdcard/ncc-window.xml')
    (out/'window.xml').write_text(xml)
    text=' '.join((n.get('text','')+' '+n.get('content-desc','')) for n in ET.fromstring(xml).iter()).lower()
    if 'correo electrónico autorizado' in text or 'enviarme un código' in text:
        matched=True;break
subprocess.run(['adb','exec-out','screencap','-p'],stdout=(out/'launch.png').open('wb'),check=True)
(out/'activity.txt').write_text(adb('shell','dumpsys','activity','activities'))
if not matched:
    raise SystemExit('No real sign-in form detected. Inspect screenshot and UI dump; no functional login claim.')
print('Installed APK opened the production sign-in form. Authenticated flows remain untested.')
