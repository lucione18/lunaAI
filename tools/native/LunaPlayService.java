package com.luna.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/** Keeps Luna alive while her own music plays and shows the "now playing" notification with controls. */
public class LunaPlayService extends Service {
    static final String CH = "luna_play";

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent i, int flags, int id) {
        String act = i == null ? null : i.getStringExtra("act");
        if (act != null) {
            Island.control(act);
            if (act.equals("toggle") || act.equals("next") || act.equals("prev")) { /* state comes back from the app */ }
        }
        Island.init(this);
        if (!Island.ownPlaying && Island.ownTitle.isEmpty()) { stopForeground(true); stopSelf(); return START_NOT_STICKY; }
        Notification n = build();
        if (Island.ownPlaying) {
            try {
                if (Build.VERSION.SDK_INT >= 29) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                else startForeground(7, n);
            } catch (Exception e) {
                ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(7, n);
            }
        } else {
            if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_DETACH); else stopForeground(false);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(7, n);
        }
        return START_NOT_STICKY;
    }

    private PendingIntent act(String a, int code) {
        Intent i = new Intent(this, LunaPlayService.class).putExtra("act", a);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getService(this, code, i, fl);
    }

    private Notification build() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
            NotificationChannel c = new NotificationChannel(CH, "Now playing", NotificationManager.IMPORTANCE_LOW);
            c.setShowBadge(false);
            nm.createNotificationChannel(c);
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CH) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_media_play)
         .setContentTitle(Island.ownTitle.isEmpty() ? "Luna" : Island.ownTitle)
         .setContentText(Island.ownArtist.isEmpty() ? "Luna Music" : Island.ownArtist)
         .setContentIntent(pi)
         .setOngoing(Island.ownPlaying)
         .setVisibility(Notification.VISIBILITY_PUBLIC)
         .addAction(android.R.drawable.ic_media_previous, "Prev", act("prev", 1))
         .addAction(Island.ownPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, Island.ownPlaying ? "Pause" : "Play", act("toggle", 2))
         .addAction(android.R.drawable.ic_media_next, "Next", act("next", 3))
         .setStyle(new Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }
}
