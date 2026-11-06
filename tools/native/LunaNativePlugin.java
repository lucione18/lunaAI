package com.luna.music;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "LunaNative",
    permissions = {
        @Permission(alias = "audio33", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "audioOld", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "mic", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notif", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class LunaNativePlugin extends Plugin {
    static LunaNativePlugin inst;
    static volatile boolean foreground = true;
    private SpeechRecognizer recognizer;

    @Override
    public void load() {
        inst = this;
        Island.init(getContext());
        Island.reloadArt();
        LunaListener l = LunaListener.instance;
        if (l != null) l.republish();
    }

    @Override
    protected void handleOnResume() { foreground = true; Island.foreground = true; Island.update(); }

    @Override
    protected void handleOnPause() { foreground = false; Island.foreground = false; Island.update(); }

    static void emit(String name, JSObject data) {
        if (inst != null) inst.notifyListeners(name, data);
    }

    private String audioAlias() { return Build.VERSION.SDK_INT >= 33 ? "audio33" : "audioOld"; }

    private boolean listenerOn() {
        String s = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        return s != null && s.contains(getContext().getPackageName());
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("listener", listenerOn());
        r.put("overlay", Settings.canDrawOverlays(getContext()));
        r.put("notif", notifOk());
        r.put("mic", getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED);
        r.put("audio", getPermissionState(audioAlias()) == com.getcapacitor.PermissionState.GRANTED);
        r.put("island", prefs().getBoolean("island", false));
        r.put("pkg", getContext().getPackageName());
        call.resolve(r);
    }

    private boolean notifOk() { return Build.VERSION.SDK_INT < 33 || getPermissionState("notif") == com.getcapacitor.PermissionState.GRANTED; }

    @PluginMethod
    public void requestAudio(PluginCall call) {
        if (getPermissionState(audioAlias()) == com.getcapacitor.PermissionState.GRANTED) { call.resolve(); return; }
        requestPermissionForAlias(audioAlias(), call, "plainDone");
    }

    @PluginMethod
    public void requestNotif(PluginCall call) {
        if (notifOk()) { call.resolve(); return; }
        requestPermissionForAlias("notif", call, "plainDone");
    }

    @PermissionCallback
    private void plainDone(PluginCall call) { call.resolve(); }

    /** The app tells us what Luna herself is playing, for the notification and the island. */
    @PluginMethod
    public void setNow(PluginCall call) {
        Island.ownTitle = call.getString("title", "");
        Island.ownArtist = call.getString("artist", "");
        Island.ownPlaying = Boolean.TRUE.equals(call.getBoolean("playing", false));
        Island.update();
        Context c = getContext();
        try {
            Intent i = new Intent(c, LunaPlayService.class);
            if (Island.ownPlaying && Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else if (Island.ownPlaying || !Island.ownTitle.isEmpty()) c.startService(i);
        } catch (Exception ignored) { }
        call.resolve();
    }

    SharedPreferences prefs() { return getContext().getSharedPreferences("luna", Context.MODE_PRIVATE); }

    // ---- music on the phone
    @PluginMethod
    public void scanMusic(PluginCall call) {
        if (getPermissionState(audioAlias()) != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias(audioAlias(), call, "scanPerm");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void scanPerm(PluginCall call) {
        if (getPermissionState(audioAlias()) == com.getcapacitor.PermissionState.GRANTED) doScan(call);
        else call.reject("Music permission was not allowed");
    }

    private void doScan(PluginCall call) {
        JSArray out = new JSArray();
        Uri base = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] cols = { MediaStore.Audio.Media._ID, MediaStore.Audio.Media.DISPLAY_NAME, MediaStore.Audio.Media.SIZE };
        try (Cursor c = getContext().getContentResolver().query(base, cols,
                MediaStore.Audio.Media.IS_MUSIC + "!=0 AND " + MediaStore.Audio.Media.SIZE + ">200000", null,
                MediaStore.Audio.Media.DISPLAY_NAME + " ASC")) {
            while (c != null && c.moveToNext()) {
                JSObject o = new JSObject();
                o.put("uri", ContentUris.withAppendedId(base, c.getLong(0)).toString());
                o.put("name", c.getString(1));
                o.put("size", c.getLong(2));
                out.put(o);
            }
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); return; }
        JSObject r = new JSObject();
        r.put("songs", out);
        call.resolve(r);
    }

    // ---- microphone
    @PluginMethod
    public void requestMic(PluginCall call) {
        if (getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED) { micDone(call); return; }
        requestPermissionForAlias("mic", call, "micPerm");
    }

    @PermissionCallback
    private void micPerm(PluginCall call) { micDone(call); }

    private void micDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(r);
    }

    // ---- settings screens
    @PluginMethod
    public void openListenerSettings(PluginCall call) {
        Intent i = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    // ---- floating island
    @PluginMethod
    public void setIsland(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        prefs().edit().putBoolean("island", on).apply();
        Island.update();
        call.resolve();
    }

    @PluginMethod
    public void setArt(PluginCall call) {
        try {
            save("idle.png", call.getString("idle"));
            save("sing.png", call.getString("sing"));
            Island.reloadArt();
        } catch (Exception ignored) { }
        call.resolve();
    }

    private void save(String name, String data) throws Exception {
        if (data == null) return;
        int c = data.indexOf(',');
        if (c >= 0) data = data.substring(c + 1);
        try (FileOutputStream f = new FileOutputStream(new File(getContext().getFilesDir(), name))) {
            f.write(Base64.decode(data, Base64.DEFAULT));
        }
    }

    @PluginMethod
    public void control(PluginCall call) {
        Island.control(call.getString("action", ""));
        call.resolve();
    }

    // ---- speech to text
    @PluginMethod
    public void startSpeech(PluginCall call) {
        if (getPermissionState("mic") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("mic", call, "speechPerm");
            return;
        }
        beginSpeech(call);
    }

    @PermissionCallback
    private void speechPerm(PluginCall call) {
        if (getPermissionState("mic") == com.getcapacitor.PermissionState.GRANTED) beginSpeech(call);
        else { call.reject("Microphone permission was not allowed"); }
    }

    private void beginSpeech(PluginCall call) {
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(a)) { call.reject("No speech service on this phone"); return; }
                if (recognizer != null) recognizer.destroy();
                recognizer = SpeechRecognizer.createSpeechRecognizer(a);
                recognizer.setRecognitionListener(new RecognitionListener() {
                    public void onReadyForSpeech(Bundle b) { }
                    public void onBeginningOfSpeech() { }
                    public void onRmsChanged(float v) { }
                    public void onBufferReceived(byte[] b) { }
                    public void onEndOfSpeech() { }
                    public void onEvent(int i, Bundle b) { }
                    public void onError(int e) { JSObject o = new JSObject(); o.put("done", true); notifyListeners("speech", o); }
                    public void onPartialResults(Bundle b) { send(b, false); }
                    public void onResults(Bundle b) { send(b, true); }
                    private void send(Bundle b, boolean done) {
                        ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        JSObject o = new JSObject();
                        if (r != null && !r.isEmpty()) o.put("text", r.get(0));
                        o.put("done", done);
                        notifyListeners("speech", o);
                    }
                });
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                recognizer.startListening(i);
                call.resolve();
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        });
    }

    @PluginMethod
    public void stopSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) { recognizer.stopListening(); }
        });
        call.resolve();
    }
}
