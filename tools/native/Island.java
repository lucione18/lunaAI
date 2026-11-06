package com.luna.music;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.audiofx.Visualizer;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSObject;

import java.io.File;

/** The floating "island" (Luna + controls) and the audio-level listener behind it. */
public class Island {
    static Context app;
    static final Handler ui = new Handler(Looper.getMainLooper());
    static boolean foreground = true;

    // what is playing
    static String extTitle = "", extPkg = "";
    static boolean extPlaying = false;
    static String ownTitle = "", ownArtist = "";
    static boolean ownPlaying = false;

    static final BeatDetector beat = new BeatDetector();
    static Visualizer viz;
    static long lastLevelSent = 0, lastBeatAt = 0;

    static WindowManager wm;
    static LinearLayout pill;
    static ImageView face;
    static TextView title, playBtn;
    static Bitmap idle, sing;

    static void init(Context c) { if (app == null) app = c.getApplicationContext(); }

    static boolean anyPlaying() { return extPlaying || ownPlaying; }
    static boolean ownIsSource() { return !extPlaying && ownPlaying; }

    static void update() { ui.post(Island::updateNow); }

    static void updateNow() {
        if (app == null) return;
        if (anyPlaying()) startViz(); else stopViz();
        SharedPreferences p = app.getSharedPreferences("luna", Context.MODE_PRIVATE);
        boolean want = p.getBoolean("island", false) && Settings.canDrawOverlays(app) && !foreground && anyPlaying();
        if (want) show(); else hide();
        if (want && title != null) {
            title.setText(extPlaying ? (extTitle.isEmpty() ? "Now playing" : extTitle) : (ownTitle.isEmpty() ? "Now playing" : ownTitle));
            if (playBtn != null) playBtn.setText(anyPlaying() ? "⏸" : "▶");
        }
    }

    // ---- controls: go to the app that is playing
    static void control(String action) {
        if (ownIsSource() || (!extPlaying && LunaListener.instance == null)) {
            JSObject o = new JSObject();
            o.put("action", action);
            LunaNativePlugin.emit("control", o);
        } else LunaListener.control(action);
    }

    static void reloadArt() {
        if (app == null) return;
        idle = BitmapFactory.decodeFile(new File(app.getFilesDir(), "idle.png").getPath());
        sing = BitmapFactory.decodeFile(new File(app.getFilesDir(), "sing.png").getPath());
        if (face != null && idle != null) face.setImageBitmap(idle);
    }

    // ---- audio level (needs microphone permission); the island pulses by itself if this is not available
    static void startViz() {
        if (viz != null || app == null) return;
        if (app.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
        try {
            viz = new Visualizer(0);
            viz.setCaptureSize(1024);
            viz.setDataCaptureListener(new Visualizer.OnDataCaptureListener() {
                @Override public void onWaveFormDataCapture(Visualizer v, byte[] w, int r) { }
                @Override public void onFftDataCapture(Visualizer v, byte[] fft, int rate) {
                    boolean b = beat.feed(fft, System.nanoTime() / 1e9);
                    if (b) lastBeatAt = System.currentTimeMillis();
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

    static void stopViz() {
        if (viz == null) return;
        try { viz.setEnabled(false); viz.release(); } catch (Exception ignored) { }
        viz = null;
    }

    // ---- the pill
    static int dp(int v) { return (int) (v * app.getResources().getDisplayMetrics().density + 0.5f); }

    static TextView btn(String s, Runnable r) {
        TextView t = new TextView(app);
        t.setText(s);
        t.setTextColor(0xFFFFFFFF);
        t.setTextSize(18);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(8), dp(4), dp(8), dp(4));
        t.setOnClickListener(v -> r.run());
        return t;
    }

    static void show() {
        if (pill != null) return;
        wm = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
        pill = new LinearLayout(app);
        pill.setOrientation(LinearLayout.HORIZONTAL);
        pill.setGravity(Gravity.CENTER_VERTICAL);
        pill.setPadding(dp(6), dp(4), dp(10), dp(4));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF2140F2B);
        bg.setCornerRadius(dp(30));
        bg.setStroke(dp(1), 0xFFFF8FC8);
        pill.setBackground(bg);

        face = new ImageView(app);
        if (idle == null) reloadArt();
        if (idle != null) face.setImageBitmap(idle);
        face.setLayoutParams(new LinearLayout.LayoutParams(dp(44), dp(44)));
        pill.addView(face);

        title = new TextView(app);
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

        int type = android.os.Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(24);

        final int[] st = new int[4];
        title.setOnTouchListener((v, e) -> {
            switch (e.getAction()) {
                case MotionEvent.ACTION_DOWN: st[0] = lp.x; st[1] = lp.y; st[2] = (int) e.getRawX(); st[3] = (int) e.getRawY(); return true;
                case MotionEvent.ACTION_MOVE:
                    lp.x = st[0] + (int) e.getRawX() - st[2]; lp.y = st[1] + (int) e.getRawY() - st[3];
                    try { wm.updateViewLayout(pill, lp); } catch (Exception ignored) { }
                    return true;
            }
            return false;
        });
        try { wm.addView(pill, lp); } catch (Exception e) { pill = null; return; }
        ui.postDelayed(pulse, 570);
    }

    static final Runnable pulse = new Runnable() {
        @Override public void run() {
            if (pill == null) return;
            if (viz == null) { lastBeatAt = System.currentTimeMillis(); animate(true); }
            ui.postDelayed(this, 570);
        }
    };

    static void hide() {
        if (pill != null && wm != null) { try { wm.removeView(pill); } catch (Exception ignored) { } }
        pill = null; face = null; title = null; playBtn = null;
    }

    static void animate(boolean b) {
        if (!b) return;
        ui.post(() -> {
            if (face == null) return;
            if (sing != null) face.setImageBitmap(sing);
            face.animate().cancel();
            face.setTranslationY(0);
            face.animate().translationY(-dp(5)).setDuration(90).withEndAction(() -> {
                if (face != null) face.animate().translationY(0).setDuration(140).start();
            }).start();
            ui.postDelayed(() -> {
                if (face != null && idle != null && System.currentTimeMillis() - lastBeatAt > 220) face.setImageBitmap(idle);
            }, 260);
        });
    }
}
