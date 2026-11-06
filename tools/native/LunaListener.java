package com.luna.music;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaMetadata;
import android.media.audiofx.Visualizer;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSObject;

import java.io.File;
import java.util.List;

/**
 * Sees what other apps (Spotify, YouTube...) are playing, listens to the audio level,
 * and shows a small floating "island" with Luna dancing to it.
 * Needs: Notification access (for media sessions) and "Display over other apps".
 */
public class LunaListener extends NotificationListenerService {
    static LunaListener instance;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private MediaSessionManager msm;
    private MediaController current;
    private Visualizer viz;
    private final BeatDetector beat = new BeatDetector();
    private long lastLevelSent = 0;
    private long lastBeatAt = 0;

    private WindowManager wm;
    private LinearLayout pill;
    private ImageView face;
    private TextView title;
    private TextView playBtn;
    private Bitmap idle, sing;

    private final MediaController.Callback cb = new MediaController.Callback() {
        @Override public void onPlaybackStateChanged(PlaybackState s) { publish(); }
        @Override public void onMetadataChanged(MediaMetadata m) { publish(); }
    };

    private final MediaSessionManager.OnActiveSessionsChangedListener sessionsCb = list -> pick(list);

    @Override
    public void onListenerConnected() {
        instance = this;
        msm = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        try {
            ComponentName me = new ComponentName(this, LunaListener.class);
            msm.addOnActiveSessionsChangedListener(sessionsCb, me, ui);
            pick(msm.getActiveSessions(me));
        } catch (SecurityException ignored) { }
        reloadArtInternal();
    }

    @Override
    public void onListenerDisconnected() { stopViz(); hide(); instance = null; }

    @Override
    public void onDestroy() { stopViz(); hide(); instance = null; super.onDestroy(); }

    // ---- which app is playing
    private void pick(List<MediaController> list) {
        MediaController best = null;
        if (list != null) {
            for (MediaController c : list) {
                if (c.getPackageName().equals(getPackageName())) continue;
                PlaybackState s = c.getPlaybackState();
                if (s != null && s.getState() == PlaybackState.STATE_PLAYING) { best = c; break; }
                if (best == null) best = c;
            }
        }
        if (current != null) { try { current.unregisterCallback(cb); } catch (Exception ignored) { } }
        current = best;
        if (current != null) current.registerCallback(cb, ui);
        publish();
    }

    void republish() { ui.post(this::publish); }

    private boolean playing() {
        if (current == null) return false;
        PlaybackState s = current.getPlaybackState();
        return s != null && s.getState() == PlaybackState.STATE_PLAYING;
    }

    private void publish() {
        JSObject o = new JSObject();
        boolean p = playing();
        o.put("playing", p);
        o.put("pkg", current == null ? "" : current.getPackageName());
        String t = "", a = "";
        if (current != null) {
            MediaMetadata m = current.getMetadata();
            if (m != null) {
                CharSequence tt = m.getText(MediaMetadata.METADATA_KEY_TITLE);
                CharSequence aa = m.getText(MediaMetadata.METADATA_KEY_ARTIST);
                t = tt == null ? "" : tt.toString();
                a = aa == null ? "" : aa.toString();
            }
        }
        o.put("title", t);
        o.put("artist", a);
        LunaNativePlugin.emit("media", o);
        if (p) startViz(); else stopViz();
        refreshOverlayInternal();
    }

    // ---- listen to the audio level (needs the microphone permission; falls back to a steady pulse in the app)
    private void startViz() {
        if (viz != null) return;
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
        try {
            viz = new Visualizer(0);
            viz.setCaptureSize(1024);
            viz.setDataCaptureListener(new Visualizer.OnDataCaptureListener() {
                @Override public void onWaveFormDataCapture(Visualizer v, byte[] w, int r) { }
                @Override public void onFftDataCapture(Visualizer v, byte[] fft, int rate) {
                    double now = System.nanoTime() / 1e9;
                    boolean b = beat.feed(fft, now);
                    if (b) { lastBeatAt = System.currentTimeMillis(); }
                    long t = System.currentTimeMillis();
                    if (b || t - lastLevelSent > 50) {
                        lastLevelSent = t;
                        JSObject o = new JSObject();
                        o.put("level", beat.level);
                        o.put("beat", b);
                        o.put("bpm", beat.bpm);
                        o.put("energy", beat.energy);
                        LunaNativePlugin.emit("level", o);
                        animate(b);
                    }
                }
            }, Visualizer.getMaxCaptureRate() / 2, false, true);
            viz.setEnabled(true);
        } catch (Exception e) { viz = null; }
    }

    private void stopViz() {
        if (viz == null) return;
        try { viz.setEnabled(false); viz.release(); } catch (Exception ignored) { }
        viz = null;
    }

    // ---- controls
    static void control(String action) {
        LunaListener l = instance;
        if (l == null || l.current == null) return;
        l.ui.post(() -> {
            try {
                MediaController.TransportControls t = l.current.getTransportControls();
                switch (action) {
                    case "next": t.skipToNext(); break;
                    case "prev": t.skipToPrevious(); break;
                    case "pause": t.pause(); break;
                    case "play": t.play(); break;
                    case "toggle": if (l.playing()) t.pause(); else t.play(); break;
                }
            } catch (Exception ignored) { }
        });
    }

    // ---- the floating island
    static void refreshOverlay() {
        LunaListener l = instance;
        if (l != null) l.ui.post(l::refreshOverlayInternal);
    }

    static void reloadArt() {
        LunaListener l = instance;
        if (l != null) l.ui.post(l::reloadArtInternal);
    }

    private void reloadArtInternal() {
        idle = BitmapFactory.decodeFile(new File(getFilesDir(), "idle.png").getPath());
        sing = BitmapFactory.decodeFile(new File(getFilesDir(), "sing.png").getPath());
        if (face != null && idle != null) face.setImageBitmap(idle);
    }

    private void refreshOverlayInternal() {
        SharedPreferences p = getSharedPreferences("luna", MODE_PRIVATE);
        boolean want = p.getBoolean("island", false) && Settings.canDrawOverlays(this)
                && !LunaNativePlugin.foreground && playing();
        if (want) show(); else hide();
        if (want && title != null && current != null) {
            MediaMetadata m = current.getMetadata();
            CharSequence t = m == null ? null : m.getText(MediaMetadata.METADATA_KEY_TITLE);
            title.setText(t == null ? "Now playing" : t);
            if (playBtn != null) playBtn.setText(playing() ? "⏸" : "▶");
        }
    }

    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }

    private TextView btn(String s, Runnable r) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(0xFFFFFFFF);
        t.setTextSize(18);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(8), dp(4), dp(8), dp(4));
        t.setOnClickListener(v -> r.run());
        return t;
    }

    private void show() {
        if (pill != null) return;
        wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        pill = new LinearLayout(this);
        pill.setOrientation(LinearLayout.HORIZONTAL);
        pill.setGravity(Gravity.CENTER_VERTICAL);
        pill.setPadding(dp(6), dp(4), dp(10), dp(4));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF2140F2B);
        bg.setCornerRadius(dp(30));
        bg.setStroke(dp(1), 0xFFFF8FC8);
        pill.setBackground(bg);

        face = new ImageView(this);
        if (idle == null) reloadArtInternal();
        if (idle != null) face.setImageBitmap(idle);
        face.setLayoutParams(new LinearLayout.LayoutParams(dp(44), dp(44)));
        pill.addView(face);

        title = new TextView(this);
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(13);
        title.setSingleLine(true);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setMaxWidth(dp(120));
        title.setPadding(dp(6), 0, dp(4), 0);
        pill.addView(title);

        pill.addView(btn("⏮", () -> control("prev")));
        playBtn = btn("⏸", () -> control("toggle"));
        pill.addView(playBtn);
        pill.addView(btn("⏭", () -> control("next")));

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(24);

        // drag the island around
        final int[] st = new int[4];
        title.setOnTouchListener((v, e) -> {
            switch (e.getAction()) {
                case android.view.MotionEvent.ACTION_DOWN: st[0] = lp.x; st[1] = lp.y; st[2] = (int) e.getRawX(); st[3] = (int) e.getRawY(); return true;
                case android.view.MotionEvent.ACTION_MOVE:
                    lp.x = st[0] + (int) e.getRawX() - st[2]; lp.y = st[1] + (int) e.getRawY() - st[3];
                    try { wm.updateViewLayout(pill, lp); } catch (Exception ignored) { }
                    return true;
            }
            return false;
        });
        try { wm.addView(pill, lp); } catch (Exception e) { pill = null; return; }
        ui.postDelayed(pulse, 570);
    }

    // steady bounce when the audio level cannot be read
    private final Runnable pulse = new Runnable() {
        @Override public void run() {
            if (pill == null) return;
            if (viz == null) { lastBeatAt = System.currentTimeMillis(); animate(true); }
            ui.postDelayed(this, 570);
        }
    };

    private void hide() {
        if (pill != null && wm != null) { try { wm.removeView(pill); } catch (Exception ignored) { } }
        pill = null; face = null; title = null; playBtn = null;
    }

    private void animate(boolean b) {
        if (pill == null || face == null) return;
        ui.post(() -> {
            if (face == null) return;
            if (b) {
                if (sing != null) face.setImageBitmap(sing);
                face.animate().cancel();
                face.setTranslationY(0);
                face.animate().translationY(-dp(5)).setDuration(90).withEndAction(() -> {
                    if (face != null) face.animate().translationY(0).setDuration(140).start();
                }).start();
                ui.postDelayed(() -> { if (face != null && idle != null && System.currentTimeMillis() - lastBeatAt > 220) face.setImageBitmap(idle); }, 260);
            }
        });
    }
}
