#!/usr/bin/env python3
"""No credentials: confirm the installed app opens the real sign-in page."""
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET

out=pathlib.Path('smoke-evidence');out.mkdir(exist_ok=True)
def adb(*args, timeout=25):
    return subprocess.run(['adb',*args],check=True,capture_output=True,text=True,timeout=timeout).stdout
def screenshot(name):
    with (out/name).open('wb') as file:
        subprocess.run(['adb','exec-out','screencap','-p'],stdout=file,check=True,timeout=25)
matched=False
diagnostics=[]
try:
    diagnostics.append(adb('install','-r','app/build/outputs/apk/debug/app-debug.apk'))
    adb('logcat','-c')
    diagnostics.append(adb('shell','am','start','-W','-a','android.intent.action.MAIN',
        '-c','android.intent.category.LAUNCHER','-f','0x10000000',
        '-n','ar.com.nutricionconciencia.app/com.google.androidbrowserhelper.trusted.LauncherActivity'))
    screenshot('initial.png')
    for attempt in range(12):
        time.sleep(3)
        try:
            # Fresh UI dump may fail until Chrome's first-run screen becomes idle.
            adb('shell','rm','-f','/sdcard/ncc-window.xml')
            diagnostics.append(adb('shell','uiautomator','dump','--compressed','/sdcard/ncc-window.xml'))
            xml=adb('shell','cat','/sdcard/ncc-window.xml')
            root=ET.fromstring(xml)
        except (subprocess.CalledProcessError,subprocess.TimeoutExpired,ET.ParseError) as error:
            diagnostics.append(str(error));continue
        (out/'window.xml').write_text(xml)
        text=' '.join((n.get('text','')+' '+n.get('content-desc','')) for n in root.iter()).lower()
        if 'correo electrónico autorizado' in text or 'enviarme un código' in text:
            matched=True;break
        # Test emulator only: dismiss Chrome onboarding from the observed UI.
        labels={'accept & continue','use without an account','no thanks','got it'}
        for node in root.iter('node'):
            if node.get('text','').lower() in labels:
                bounds=re.findall(r'\d+',node.get('bounds',''))
                if len(bounds)==4:
                    x1,y1,x2,y2=map(int,bounds)
                    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
                    break
finally:
    screenshot('launch.png')
    (out/'activity.txt').write_text(adb('shell','dumpsys','activity','activities'))
    (out/'startup-logcat.txt').write_text(adb('logcat','-d','-v','brief','-t','1000',
        'AndroidRuntime:E','LauncherActivity:D','TwaLauncher:D','ActivityTaskManager:I','chromium:E','*:S'))
    (out/'diagnostics.txt').write_text('\n'.join(diagnostics))
if not matched:
    raise SystemExit('No real sign-in form detected. Inspect screenshot and UI dump; no functional login claim.')
print('Installed APK opened the production sign-in form. Authenticated flows remain untested.')
