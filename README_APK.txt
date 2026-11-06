LUNA APK - UPDATE 3 (notification, resume, permissions)

WHAT'S NEW IN UPDATE 3
- Now-playing notification with prev / pause / next for Luna's own songs, and the floating island also works for her own songs
- Luna remembers the song and the exact second, so you can continue after closing the app
- Asks for music, notification and microphone permission the first time it opens

WHAT CAME IN UPDATE 2
- Asks for Music, Microphone, Notification access and "Display over other apps" in Settings > Phone powers
- Scan phone: finds all the music on your phone in one tap (Library > scan button)
- Luna dances to Spotify / YouTube / any app that is playing (needs Notification access)
- Floating island: a small pill with Luna + prev / play / next over other apps while music plays
- Keeps playing when the app is in the background
- Voice: pick the best voice on your phone, or use ElevenLabs (your own key) for a very natural voice

HOW TO UPDATE (GitHub, in your lunaAI repo)
1. Open the repo > Add file > Upload files. Drag in the folders "www" and "tools" from this zip
   (they replace the old files of the same name). Press Commit.
2. Open .github/workflows/build-apk.yml, press the pencil, replace everything with the
   text from build-apk.yml in this zip, press Commit.
3. Actions tab > Build Luna APK > Run workflow. Wait about 6-8 minutes.
4. Download the Luna-APK artifact, unzip, install app-debug.apk over the old one.

FIRST RUN ON THE PHONE
Open Luna > Settings > Phone powers. Tap each row once:
  Music, Microphone (Allow), Notification access (switch Luna ON), Display over other apps (switch ON).
Then tick "Floating island". Play something in Spotify and press Home.

IF THE BUILD FAILS: open the red run, open the failed step, copy the red lines and send them to Luna's maker.
