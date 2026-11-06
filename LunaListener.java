package com.luna.music;

import android.content.ComponentName;
import android.content.Context;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.service.notification.NotificationListenerService;

import com.getcapacitor.JSObject;

import java.util.List;

/** Sees what other apps (Spotify, YouTube...) are playing. Needs Notification access. */
public class LunaListener extends NotificationListenerService {
    static LunaListener instance;
    private MediaSessionManager msm;
    private MediaController current;

    private final MediaController.Callback cb = new MediaController.Callback() {
        @Override public void onPlaybackStateChanged(PlaybackState s) { publish(); }
        @Override public void onMetadataChanged(MediaMetadata m) { publish(); }
    };
    private final MediaSessionManager.OnActiveSessionsChangedListener sessionsCb = list -> pick(list);

    @Override
    public void onListenerConnected() {
        instance = this;
        Island.init(this);
        msm = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        try {
            ComponentName me = new ComponentName(this, LunaListener.class);
            msm.addOnActiveSessionsChangedListener(sessionsCb, me, Island.ui);
            pick(msm.getActiveSessions(me));
        } catch (SecurityException ignored) { }
        Island.reloadArt();
    }

    @Override
    public void onListenerDisconnected() { Island.extPlaying = false; Island.update(); instance = null; }

    @Override
    public void onDestroy() { Island.extPlaying = false; Island.update(); instance = null; super.onDestroy(); }

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
        if (current != null) current.registerCallback(cb, Island.ui);
        publish();
    }

    void republish() { Island.ui.post(this::publish); }

    private boolean playing() {
        if (current == null) return false;
        PlaybackState s = current.getPlaybackState();
        return s != null && s.getState() == PlaybackState.STATE_PLAYING;
    }

    private void publish() {
        boolean p = playing();
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
        Island.extPlaying = p; Island.extTitle = t; Island.extPkg = current == null ? "" : current.getPackageName();
        JSObject o = new JSObject();
        o.put("playing", p);
        o.put("pkg", Island.extPkg);
        o.put("title", t);
        o.put("artist", a);
        LunaNativePlugin.emit("media", o);
        Island.update();
    }

    static void control(String action) {
        LunaListener l = instance;
        if (l == null || l.current == null) return;
        Island.ui.post(() -> {
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
}
