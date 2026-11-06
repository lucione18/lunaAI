"""Adds Luna's native Android code to the generated Capacitor project.
Run after `npx cap add android` and before building."""
import pathlib, re, shutil, sys

root = pathlib.Path(__file__).resolve().parent.parent
app = root / "android" / "app" / "src" / "main"
if not app.exists():
    sys.exit("android/ folder not found - run `npx cap add android` first")

# 1. Java sources
dest = app / "java" / "com" / "luna" / "music"
dest.mkdir(parents=True, exist_ok=True)
for f in (root / "tools" / "native").glob("*.java"):
    shutil.copy(f, dest / f.name)
    print("copied", f.name)

# 2. manifest
mf = app / "AndroidManifest.xml"
x = mf.read_text()
perms = [
    '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
]
block = ""
for p in perms:
    name = re.search(r'name="([^"]+)"', p).group(1)
    if name not in x:
        block += "    " + p + "\n"
queries = ""
if "<queries>" not in x:
    queries = ('    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n'
               '        </intent>\n    </queries>\n')
x = x.replace("<application", block + queries + "    <application", 1)
if "LunaListener" not in x:
    svc = ('        <service android:name=".LunaListener" android:exported="true" android:label="Luna"\n'
           '            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">\n'
           '            <intent-filter>\n'
           '                <action android:name="android.service.notification.NotificationListenerService" />\n'
           '            </intent-filter>\n        </service>\n')
    x = x.replace("</application>", svc + "    </application>", 1)
mf.write_text(x)
print("manifest patched")
