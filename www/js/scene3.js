// scene3.js - room extras (bulb, picture, calendar, wardrobe, boots), holiday decorations and pets
import { mix, pmod } from "./pix.js";
const sin = Math.sin, cos = Math.cos, PI = Math.PI;

// tiny 3x5 pixel font for the calendar
const G = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001001010010", "8": "111101111101111", "9": "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100",
  G: "011100101101011", J: "001001001101010", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", Y: "101101010010010",
};
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export const DECOR = {
  "christmas tree": "christmas", "halloween": "halloween", "hearts": "valentine", "easter eggs": "easter", "party": "party", "birthday": "birthday", "diwali lights": "diwali",
};
export const DECOR_NAMES = Object.keys(DECOR);

export const SceneExtras = {
  glyph(x, y, ch, col, sc = 1) {
    const g = G[ch]; if (!g) return;
    for (let i = 0; i < 15; i++) if (g[i] === "1") this.p.rect(x + (i % 3) * sc, y + Math.floor(i / 3) * sc, x + (i % 3) * sc + sc, y + Math.floor(i / 3) * sc + sc, col);
  },
  lampOn(s) { return s.hour >= 18 || s.hour < 6; },
  bulbGlow(s, wall) {
    if (!this.lampOn(s)) return;
    const p = this.p;
    [[30, 0.05], [22, 0.08], [15, 0.12], [9, 0.18]].forEach(([r, k]) => p.ell(66, 14, r, r * 0.95, mix(wall, "#ffcf70", k)));
  },
  roomExtras(s) {
    const p = this.p, on = this.lampOn(s);
    // ceiling bulb
    p.line(66, 0, 66, 10, 0.8, "#6a5fb0"); p.rect(64, 10, 69, 12.5, "#8a7bd0");
    p.ell(66, 15, 3.1, 3.5, on ? "#fff2b0" : "#6a6490");
    if (on) { p.ell(66, 15, 1.7, 2, "#ffffff"); for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) p.line(66 + 5 * cos(a * PI / 4), 15 + 5.5 * sin(a * PI / 4), 66 + 7 * cos(a * PI / 4), 15 + 7.5 * sin(a * PI / 4), 0.5, "#ffe9a0"); }
    // picture: night mountains and a moon
    p.rect(37, 13, 61, 33, "#5b4280"); p.rect(38, 14, 60, 32, "#2a2058");
    p.rect(38, 14, 60, 22, "#3a2c78"); p.rect(38, 22, 60, 28, "#6a3f9a");
    p.ell(53, 19, 3, 3, "#fff3b0"); p.ell(54.2, 18.4, 2.6, 2.6, "#3a2c78");
    p.px(42, 17, "#ffffff"); p.px(47, 16, "#ffffff"); p.px(57, 24, "#ffffff");
    p.poly([[38, 32], [46, 22], [53, 32]], "#1a1440"); p.poly([[46, 32], [55, 24], [60, 32]], "#241a58");
    p.line(46, 22, 44, 25, 0.8, "#6a5fb0");
    // calendar
    const mo = s.month === undefined ? 0 : s.month, day = String(s.day || 1);
    p.rect(124, 10, 146, 35, "#f4f1ff"); p.rect(124, 10, 146, 17, "#ff4f6d"); p.rect(124, 34, 146, 35, "#cfc8ea");
    p.px(128, 9, "#cfc8f0"); p.px(142, 9, "#cfc8f0"); p.rect(128, 9, 129, 12, "#8a7bd0"); p.rect(141, 9, 142, 12, "#8a7bd0");
    MONTHS[mo].split("").forEach((c, i) => this.glyph(129 + i * 4, 11, c, "#ffffff"));
    const w = day.length * 8 - 2; day.split("").forEach((c, i) => this.glyph(135 - w / 2 + i * 8, 20, c, "#2a1f5c", 2));
    // wardrobe
    p.rect(35, 38, 63, 92, "#5b4280"); p.rect(34, 37, 64, 41, "#9a7abe"); p.rect(36, 41, 62, 90, PAL_W);
    p.rect(37, 43, 48, 88, "#8a6aae"); p.rect(50, 43, 61, 88, "#8a6aae"); p.rect(37, 43, 48, 44, "#a98acc"); p.rect(50, 43, 61, 44, "#a98acc");
    p.rect(48, 41, 50, 90, "#4a3470"); p.ell(46.5, 66, 1.1, 1.6, "#ffe66b"); p.ell(51.5, 66, 1.1, 1.6, "#ffe66b");
    p.rect(36, 90, 40, 94, "#4a3470"); p.rect(58, 90, 62, 94, "#4a3470");
    // pile of boots
    const boot = (x, y, c, d) => { p.rect(x, y, x + 4, y + 8, c); p.rect(x, y + 6, x + 10, y + 10, c); p.rect(x, y + 9.5, x + 10, y + 11, d); p.rect(x, y, x + 4, y + 1.5, d); };
    boot(36, 84, "#6a4a3a", "#3a241a"); boot(44, 85, "#ff8fc7", "#b8407e"); boot(51, 83, "#3a3550", "#1a1730");
    p.rect(55, 91, 66, 95, "#8a4a3a"); p.rect(62, 87, 66, 95, "#8a4a3a"); p.rect(55, 94, 66, 96, "#3a241a");
  },
  // holiday decorations that can be switched on any time from the wardrobe
  decorExtra(s, key) {
    const p = this.p, t = s.t;
    if (key === "easter") {
      [["#ff9fd3", 42], ["#6be3ff", 50], ["#ffe66b", 58]].forEach(([c, x], i) => { p.ell(x + 40, 92.5, 2.8, 3.6, c); p.line(x + 38, 92, x + 42, 92, 0.6, "#ffffff"); p.px(x + 40, 90 + i % 2, "#ffffff"); });
      p.ell(100, 6, 3, 5, "#ffffff"); p.ell(106, 6, 3, 5, "#ffffff"); p.ell(100, 6, 1.3, 3.4, "#ff9fd3"); p.ell(106, 6, 1.3, 3.4, "#ff9fd3");
    } else if (key === "party") {
      [["#ff4f6d", 150], ["#6be3ff", 160], ["#ffe66b", 170], ["#4fe08a", 180]].forEach(([c, x], i) => { const y = 54 + sin(t * 1.5 + i) * 2; p.ell(x, y, 4, 5, c); p.line(x, y + 5, x - 1 + sin(t + i), 70, 0.4, "#cfc8f0"); });
      for (let k = 0; k < 16; k++) p.dot(pmod(k * 37 + sin(t + k) * 5, 190), pmod(k * 19 + t * (9 + k % 4) * 2, 90), ["#ff4f6d", "#ffe66b", "#6be3ff", "#4fe08a"][k % 4], 0.7);
    } else if (key === "birthday") {
      for (let x = 70; x < 122; x += 6) { const y = 3 + 2 * sin((x - 70) * 0.12); p.poly([[x, y], [x + 5, y], [x + 2.5, y + 6]], ["#ff6fa8", "#ffe66b", "#6be3ff"][((x - 70) / 6) % 3 | 0]); }
      p.ell(131, 91, 7, 3, "#fff3d6"); p.rect(125, 84, 137, 90, "#ff9fd3"); p.rect(125, 84, 137, 86, "#ffffff"); p.rect(130, 79, 132, 84, "#6be3ff");
      p.ell(131, 78, 1.1, 1.8, sin(t * 9) > 0 ? "#ffe66b" : "#ff9a2a");
    } else if (key === "diwali") {
      for (let x = 8; x < 190; x += 14) { const on = sin(t * 2 + x) > -0.6; p.ell(x, 96, 2.8, 1.6, "#c2541a"); if (on) { p.ell(x, 93.6, 1.2, 2, "#ffcf4d"); p.ell(x, 94, 0.6, 1, "#ffffff"); } }
    }
  },
  // ----- pets -----
  petSpot(s) { return s.pet ? s.pet : null; },
  drawPet(s) {
    const pt = s.pet; if (!pt || !pt.kind) return;
    const p = this.p, t = s.t, x = pt.x, y = 95, sleeping = pt.state === "sleep", walking = pt.state === "walk";
    const dir = pt.dir || 1, hop = pt.hop > 0 ? Math.abs(sin(pt.hop * 9)) * 3.2 : (walking ? Math.abs(sin(t * 9)) * 1.1 : 0);
    const by = y - hop, col = pt.color || 0;
    p.ell(x, 96.5, 6, 1.4, "#150f33");
    const F = (dx) => x + dx * dir;
    if (pt.kind === "cat") {
      const [c, d] = [["#3a3550", "#242038"], ["#ff9a4a", "#d8702a"], ["#f4f1ff", "#cfc8ea"]][col % 3];
      if (sleeping) { p.ell(x, by - 2, 7, 3.4, c); p.ell(F(-3), by - 3, 2.6, 2.4, c); p.line(F(4), by - 1, F(8), by - 3, 1, d); p.line(F(-4), by - 3.6, F(-1), by - 3.6, 0.6, "#150f33"); p.px(x + 4, by - 8 - sin(t * 2) * 1.5, "#6be3ff"); return; }
      p.line(F(-5), by - 3, F(-9), by - 8 + sin(t * 3) * 1.5, 1.2, d);
      p.ell(x, by - 4, 5, 4.2, c); p.ell(F(4), by - 8, 3.8, 3.4, c);
      p.poly([[F(2.2), by - 10], [F(3), by - 14], [F(4.6), by - 10.4]], c); p.poly([[F(5), by - 10.4], [F(7), by - 14], [F(7.4), by - 9.6]], c);
      p.px(F(4), by - 8, "#2a1740"); p.px(F(6.4), by - 8, "#2a1740"); p.px(F(5), by - 6.4, "#ff9fb8");
      p.rect(x - 3, by - 1, x - 1, by + 1.2, d); p.rect(x + 2, by - 1, x + 4, by + 1.2, d);
    } else if (pt.kind === "bunny") {
      const [c, d] = [["#ffffff", "#e0d8f4"], ["#ffc4e3", "#e69cc4"], ["#b9a28a", "#8a7258"]][col % 3];
      if (sleeping) { p.ell(x, by - 2.5, 5.5, 3.6, c); p.ell(F(-2), by - 3.6, 2.4, 2.2, c); p.line(F(-3), by - 5, F(-6), by - 4, 1.2, c); p.px(x + 4, by - 8 - sin(t * 2) * 1.5, "#6be3ff"); return; }
      p.ell(x, by - 4, 4.6, 4.4, c); p.ell(F(3), by - 8.4, 3.2, 3, c);
      const w = sin(t * 2.4) * 0.8; p.ell(F(2) + w, by - 14, 1.2, 3.6, c); p.ell(F(4.6) - w, by - 14, 1.2, 3.6, c); p.ell(F(2) + w, by - 14, 0.5, 2.6, "#ff9fb8"); p.ell(F(4.6) - w, by - 14, 0.5, 2.6, "#ff9fb8");
      p.px(F(3), by - 8.6, "#2a1740"); p.px(F(5), by - 8.6, "#2a1740"); p.px(F(4), by - 7, "#ff9fb8"); p.ell(F(-4.6), by - 3, 1.5, 1.5, "#ffffff");
      p.rect(x - 2, by - 1, x, by + 1.2, d); p.rect(x + 2, by - 1, x + 4, by + 1.2, d);
    } else if (pt.kind === "puppy") {
      const [c, d] = [["#c8905a", "#9a6a3a"], ["#f4f1ff", "#cfc8ea"], ["#3a3550", "#242038"]][col % 3];
      if (sleeping) { p.ell(x, by - 2, 7, 3.2, c); p.ell(F(-5), by - 2.6, 2.8, 2.4, d); p.px(x + 4, by - 8 - sin(t * 2) * 1.5, "#6be3ff"); return; }
      p.line(F(-5), by - 4, F(-8), by - 7 + sin(t * 12) * 2, 1.2, d);
      p.ell(x, by - 4, 5.4, 3.8, c); p.ell(F(5), by - 7.4, 3.6, 3.2, c); p.ell(F(2.4), by - 8, 1.4, 2.6, d); p.ell(F(7.6), by - 8, 1.4, 2.4, d);
      p.px(F(5), by - 8, "#2a1740"); p.px(F(7), by - 8, "#2a1740"); p.px(F(8.4), by - 6.4, "#150f33"); p.px(F(6), by - 5.4, "#ff7fb0");
      p.rect(x - 3, by - 1, x - 1, by + 1.2, d); p.rect(x + 2, by - 1, x + 4, by + 1.2, d);
    } else if (pt.kind === "chick") {
      const c = ["#ffe66b", "#ffffff", "#ffb347"][col % 3];
      if (sleeping) { p.ell(x, by - 3, 4.6, 3.8, c); p.px(x + 4, by - 8 - sin(t * 2) * 1.5, "#6be3ff"); return; }
      p.ell(x, by - 4, 4.6, 4.4, c); p.ell(F(-4), by - 4, 1.8, 2.6, "#e6c04a"); p.px(F(2), by - 6, "#2a1740"); p.poly([[F(4.2), by - 5], [F(6.6), by - 4.4], [F(4.2), by - 3.6]], "#ff8a1f");
      p.line(x - 1, by, x - 1, by + 2, 0.7, "#ff8a1f"); p.line(x + 1, by, x + 1, by + 2, 0.7, "#ff8a1f");
    }
    if (pt.heart > 0) p.spr(x, by - 18 - (1 - pt.heart) * 6, "heart", "#ff6fa8");
  },
};
const PAL_W = "#7a5a9e";
