package com.luna.music;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;

/** Low-band spectral flux beat tracker (port of the JS BeatTracker). */
public class BeatDetector {
    private double[] prev;
    private final ArrayDeque<Double> flux = new ArrayDeque<>();
    private final ArrayList<Double> gaps = new ArrayList<>();
    private double lastBeat = 0;
    public double level = 0, energy = 0, bpm = 0;
    private double smooth = 0;

    /** fft: Android Visualizer FFT bytes (re, im pairs). now: seconds. Returns true when a beat fired. */
    public boolean feed(byte[] fft, double now) {
        int bins = Math.min(fft.length / 2, 64);
        double[] mag = new double[bins];
        double low = 0, all = 0;
        for (int i = 1; i < bins; i++) {
            double re = fft[2 * i], im = fft[2 * i + 1];
            mag[i] = Math.sqrt(re * re + im * im);
            all += mag[i];
            if (i <= 6) low += mag[i];
        }
        double f = 0;
        if (prev != null) for (int i = 1; i <= 6; i++) f += Math.max(0, mag[i] - prev[i]);
        prev = mag;
        flux.addLast(f);
        if (flux.size() > 43) flux.removeFirst();
        double mean = 0, var = 0;
        for (double v : flux) mean += v;
        mean /= flux.size();
        for (double v : flux) var += (v - mean) * (v - mean);
        double sd = Math.sqrt(var / flux.size());
        level = Math.min(1, low / (6 * 90.0));
        smooth = smooth * 0.9 + level * 0.1;
        energy = Math.min(1, smooth * 1.6);
        boolean beat = f > mean + 1.4 * sd && f > 25 && now - lastBeat > 0.27;
        if (beat) {
            if (lastBeat > 0) {
                double gap = now - lastBeat;
                if (gap < 1.5) {
                    gaps.add(gap);
                    if (gaps.size() > 16) gaps.remove(0);
                    ArrayList<Double> s = new ArrayList<>(gaps);
                    Collections.sort(s);
                    double med = s.get(s.size() / 2);
                    double b = 60.0 / med;
                    while (b < 70) b *= 2;
                    while (b > 180) b /= 2;
                    bpm = b;
                }
            }
            lastBeat = now;
        }
        return beat;
    }
}
