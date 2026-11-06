package com.luna.music;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LunaNativePlugin.class);
        super.onCreate(savedInstanceState);
        WebView w = getBridge().getWebView();
        w.getSettings().setMediaPlaybackRequiresUserGesture(false);
    }

    /** Keep the page (and its audio) alive when the app goes to the background. */
    @Override
    public void onPause() {
        super.onPause();
        try {
            WebView w = getBridge().getWebView();
            w.onResume();
            w.resumeTimers();
        } catch (Exception ignored) { }
    }
}
