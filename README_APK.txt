LUNA APK - HOW TO GET THE APK FILE (no Android Studio needed, about 10 minutes)

1. Make a free account at github.com and create a new empty repository (call it luna-app).
2. On the repository page choose "uploading an existing file" and drag in EVERYTHING from this folder
   (www, tools, .github, package.json, capacitor.config.json). Keep the folders. Press Commit.
   Tip: the .github folder is hidden on some computers; turn on "show hidden files" first.
3. Open the "Actions" tab. If asked, press the green button to enable workflows.
   Choose "Build Luna APK" on the left and press "Run workflow". It takes about 5-8 minutes.
4. When it turns green, open the run and download "Luna-APK" at the bottom (a zip with app-debug.apk).
5. Send app-debug.apk to your phone, open it and allow "install from this source". Luna appears as an app.

Notes
- This is a debug-signed APK, fine for your own phone. It is not for the Play Store yet.
- Songs are added with "+ Add songs", same as the web version, and stay inside the app.
- The next step (listening to Spotify/YouTube and floating over other apps) needs extra Android code
  and permissions; ask Claude to add it once this APK runs on your phone.
