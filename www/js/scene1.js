// scene1.js - the room, furniture and face (port of luna_pixel.py, first half)
import { Pix, GW, GH, SCALE, FY, DESK_X, CENTER, BED_X0, BED_X1, SNACK_X, mix, pmod, tri, linspace, rad } from "./pix.js";

export const PAL = {
  skin: "#ffd6bd", skin_d: "#eeb29c", blush: "#f7a3a8",
  hair: "#ff6ab8", hair_d: "#e24a9c", hair_l: "#ff9fd3",
  iris: "#8a5cf0", iris_d: "#5a34b8", pupil: "#2e1670", lash: "#2a1740",
  dress: "#5a5ad8", dress_d: "#4343b0", collar: "#d4cfff", bow: "#ff66b0", bow_d: "#d8408a",
  phone: "#15112b", phone_l: "#2d2750", cyan: "#34c4f2", shoe: "#ff6fb0", shoe_d: "#d84a90",
  brow: "#c23a86", mouth: "#7a2050", tongue: "#ff7fb0",
  floor: "#241c4a", floor_l: "#33286a", shadow: "#150f33",
  wood: "#7a5a9e", wood_l: "#9a7abe", wood_d: "#5b4280",
  metal: "#cfc8f0", metal_d: "#a79fd6", tv: "#2b2650", screen: "#0e0b24",
  yellow: "#ffe66b", red: "#ff4f6d", white: "#ffffff",
};
export const THEMES = {
  night: { wall: "#1d1b2e", floor: "#241c4a", floor_l: "#33286a", glow: "#2b2745" },
  sunset: { wall: "#3a2040", floor: "#4a2a50", floor_l: "#6a3a6a", glow: "#5a3050" },
  forest: { wall: "#17302c", floor: "#22443a", floor_l: "#2f5c4c", glow: "#244a40" },
  sakura: { wall: "#40284a", floor: "#563668", floor_l: "#76508a", glow: "#664078" },
  christmas: { wall: "#17302a", floor: "#3a1f28", floor_l: "#5a2c38", glow: "#24493c" },
  halloween: { wall: "#241436", floor: "#3a2210", floor_l: "#5a3418", glow: "#3d2060" },
  summer: { wall: "#1f3a5a", floor: "#2a4a6a", floor_l: "#3a6a8a", glow: "#2f5a7a" },
  autumn: { wall: "#3a2418", floor: "#4a2e1c", floor_l: "#6a4228", glow: "#5a3a22" },
  winter: { wall: "#202a44", floor: "#2a3454", floor_l: "#3a4a74", glow: "#2f3d66" },
};
export const g = (s, k, d) => (s[k] === undefined ? d : s[k]);
const sin = Math.sin, cos = Math.cos, PI = Math.PI;

export const SceneRoom = {
  room(s) {
    const p = this.p, th = THEMES[g(s, "theme", "night")] || THEMES.night;
    PAL.floor = th.floor; PAL.floor_l = th.floor_l;
    const wall = (s.mood === "idle" || s.mood === "paused") ? mix(s.bg, th.wall, 0.5) : s.bg;
    p.fill(wall);
    this.bulbGlow(s, wall);
    const rim = mix(s.glow, "#000000", 0.35), gr = s.v * 3;
    const gx = g(s, "pose") !== "bed" ? s.cx : CENTER;
    p.ell(gx, 54, 40 + gr, 36 + gr, rim);
    p.ell(gx, 54, 38.5 + gr, 34.5 + gr, s.glow);
    p.ell(14, 14, 8, 8, "#8a7bd0");
    p.ell(14, 14, 6.8, 6.8, "#efe9ff");
    for (const [ax, ay] of [[14, 8], [14, 20], [8, 14], [20, 14]]) p.px(ax, ay, "#6a5fb0");
    const mh = s.minute, hh = s.hour % 12 + s.minute / 60;
    const am = mh / 60 * 2 * PI - PI / 2, ah = hh / 12 * 2 * PI - PI / 2;
    p.line(14, 14, 14 + 5.2 * cos(am), 14 + 5.2 * sin(am), 1, "#2a1f5c");
    p.line(14, 14, 14 + 3.4 * cos(ah), 14 + 3.4 * sin(ah), 1.4, "#2a1f5c");
    this.window(s);
    p.rect(0, 90, GW, GH, PAL.floor);
    p.rect(0, 90, GW, 91, PAL.floor_l);
    this.decorations(s);
    this.roomExtras(s);
  },
  decorations(s) {
    const keys = new Set([g(s, "season", null), ...(s.decor || []).map(d => ({ "christmas tree": "christmas", halloween: "halloween", hearts: "valentine" }[d] || d))]);
    keys.delete(null);
    for (const k of keys) if (["easter", "party", "birthday", "diwali"].includes(k)) this.decorExtra(s, k);
    for (const se of keys) this.seasonDecor(s, se);
  },
  seasonDecor(s, se) {
    const p = this.p, t = s.t;
    if (se === "christmas") {
      for (let x = 6; x < GW; x += 9) {
        const y = 3 + 2.2 * sin(x * 0.16), col = ["#ff4f6d", "#4fe08a", "#ffe66b", "#6be3ff"][Math.floor(x / 9) % 4];
        const on = sin(t * 3 + x) > -0.5;
        p.ell(x, y + 3, 1.6, 2.0, on ? col : mix(col, "#000000", 0.6));
      }
      const tx = 47;
      [7, 10, 13].forEach((w_, k) => p.poly([[tx, 52 + k * 11], [tx - w_, 64 + k * 11], [tx + w_, 64 + k * 11]], k % 2 === 0 ? "#2f9c5a" : "#3fb86a"));
      p.rect(tx - 2, 86, tx + 2, 91, "#7a4a2a");
      p.spr(tx, 49, "spark", "#ffe66b");
      for (const [ox, oy, c] of [[-4, 62, "#ff4f6d"], [5, 70, "#6be3ff"], [-7, 77, "#ffe66b"], [8, 82, "#ff4f6d"]]) p.ell(tx + ox, oy, 1.5, 1.5, c);
    } else if (se === "halloween") {
      const ox = 27;
      p.ell(20 + ox, 85, 9, 7, "#ff8a1f"); p.ell(14 + ox, 85, 4, 6.5, "#e87510"); p.ell(26 + ox, 85, 4, 6.5, "#e87510");
      p.rect(19 + ox, 77, 21.5 + ox, 79.5, "#3a7a3a");
      p.poly([[15 + ox, 83], [18 + ox, 83], [16.5 + ox, 80.5]], "#2a1c44");
      p.poly([[22 + ox, 83], [25 + ox, 83], [23.5 + ox, 80.5]], "#2a1c44");
      p.pl([[14.5 + ox, 88], [17 + ox, 86.5], [19 + ox, 88], [21 + ox, 86.5], [23 + ox, 88], [25.5 + ox, 88]], 1.0, "#2a1c44");
      for (let k = 0; k < 3; k++) {
        const bx = pmod(t * 14 + k * 70, GW + 20) - 10, by = 14 + 8 * sin(t * 2 + k * 2) + k * 9, fl = sin(t * 14 + k) * 2.5;
        p.poly([[bx, by], [bx - 5, by - fl], [bx - 2, by + 1.5]], "#15102a");
        p.poly([[bx, by], [bx + 5, by - fl], [bx + 2, by + 1.5]], "#15102a");
      }
      p.line(0, 0, 14, 12, 0.7, "#cfc8f0"); p.line(0, 0, 6, 15, 0.7, "#cfc8f0"); p.pl([[0, 6], [6, 7], [10, 4]], 0.6, "#cfc8f0");
    } else if (se === "spring" || se === "valentine") {
      for (let k = 0; k < 14; k++) {
        const x = pmod(k * 37 + t * (5 + k % 3), GW), y = pmod(k * 23 + t * (7 + k % 4) * 2, 90);
        if (se === "valentine") p.spr(x, y, "heart", k % 2 ? "#ff6fa8" : "#ffb3d9"); else p.ell(x, y, 1.5, 1.0, "#ffb3d9");
      }
    } else if (se === "autumn") {
      for (let k = 0; k < 12; k++) {
        const x = pmod(k * 41 + t * 4 + sin(t + k) * 6, GW), y = pmod(k * 19 + t * (8 + k % 3) * 2, 90);
        p.ell(x, y, 1.7, 1.2, ["#ff8a1f", "#d8502a", "#e8b030"][k % 3]);
      }
    } else if (se === "winter") {
      for (let k = 0; k < 20; k++) p.dot(pmod(k * 29 + sin(t + k) * 4, GW), pmod(k * 17 + t * (6 + k % 4) * 2, 90), "#ffffff", 0.7);
    } else if (se === "summer") {
      p.ell(GW - 18, 14, 7, 7, "#ffe66b");
      for (let k = 0; k < 8; k++) {
        const a = k * PI / 4 + t * 0.3;
        p.line(GW - 18 + 9 * cos(a), 14 + 9 * sin(a), GW - 18 + 12 * cos(a), 14 + 12 * sin(a), 0.8, "#ffe66b");
      }
    }
  },
  window(s) {
    const p = this.p, x0 = 86, y0 = 10, x1 = 112, y1 = 36, t = s.t, kind = g(s, "weather", "mild");
    const night = s.hour < 6 || s.hour >= 19, dusk = s.hour === 17 || s.hour === 18;
    let sky = night ? "#14123a" : dusk ? "#f0a070" : "#7fcaf2";
    if (kind === "rain" || kind === "storm") sky = night ? "#3a4468" : "#6c7a96";
    else if (kind === "snow") sky = night ? "#2a3254" : "#b8c8e0";
    p.rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2, PAL.wood_d);
    p.rect(x0, y0, x1, y1, sky);
    const w = x1 - x0, h = y1 - y0, fair = ["mild", "hot", "cold"].includes(kind);
    if (night && fair) {
      [[3, 4], [9, 14], [20, 6], [16, 20], [6, 22], [22, 16]].forEach(([sx, sy], i) => { if (sin(t * 2 + i * 2.1) > -0.3) p.px(x0 + sx, y0 + sy, "#ffffff"); });
      p.ell(x0 + 17, y0 + 8, 4, 4, "#fff3b0"); p.ell(x0 + 19, y0 + 7, 3.4, 3.4, sky);
    } else if (!night && fair) {
      const R = 4.5 + (kind === "hot" ? 1 : 0);
      p.ell(x0 + 19, y0 + 8, R, R, "#ffe066");
      if (kind === "hot") for (let k = 0; k < 8; k++) { const a = k * PI / 4 + t * 0.5; p.px(x0 + 19 + cos(a) * 8, y0 + 8 + sin(a) * 8, "#ffe066"); }
    }
    if (["mild", "cold", "rain", "storm", "snow"].includes(kind) && !(night && (kind === "mild" || kind === "cold"))) {
      const cc = (kind === "rain" || kind === "storm") ? "#8f9bb8" : "#ffffff";
      for (const [dx, dy, r] of [[6, 8, 4], [11, 7, 5], [16, 9, 4], [10, 10, 5]]) p.ell(x0 + dx + sin(t * 0.3) * 1.5, y0 + dy, r, r * 0.7, cc);
    }
    if (kind === "rain" || kind === "storm") {
      for (let i = 0; i < 9; i++) {
        const x = x0 + 1 + (i * 3 + 1) % (w - 2), y = y0 + 6 + pmod(t * 46 + i * 7, h - 7);
        p.line(x, y, x - 0.6, y + 2.5, 1, "#bcd6ff");
      }
      if (kind === "storm" && Math.trunc(t * 9) % 41 < 2) {
        p.rect(x0, y0, x1, y1, "#f4f4ff");
        p.pl([[x0 + 14, y0 + 6], [x0 + 11, y0 + 13], [x0 + 15, y0 + 13], [x0 + 12, y0 + 22]], 1.5, "#ffe066");
      }
    } else if (kind === "snow") {
      for (let i = 0; i < 12; i++) {
        const x = x0 + 1 + pmod(i * 5 + sin(t + i) * 2, w - 2), y = y0 + 3 + pmod(t * 9 + i * 5, h - 4);
        p.px(x, y, "#ffffff");
      }
    }
    p.rect(x0 + Math.floor(w / 2) - 1, y0, x0 + Math.floor(w / 2), y1, PAL.wood_d);
    p.rect(x0, y0 + Math.floor(h / 2) - 1, x1, y0 + Math.floor(h / 2), PAL.wood_d);
    p.rect(x0 - 3, y1 + 2, x1 + 3, y1 + 4, PAL.wood);
  },
  tv(s) {
    const p = this.p;
    p.rect(4, 56, 33, 91, PAL.tv); p.rect(5, 57, 32, 58, "#463f7a");
    const sx0 = 7, sy0 = 59, sx1 = 30, sy1 = 78, playing = s.pose === "game" && s.sit > 0.5, t = s.t;
    p.rect(sx0, sy0, sx1, sy1, PAL.screen);
    if (playing) {
      for (let yy = sy0 + 1; yy < sy1 - 1; yy += 3) p.px(Math.floor((sx0 + sx1) / 2), yy, "#2a2458");
      const bx = sx0 + 2 + tri(t * 9, 18), by = sy0 + 2 + tri(t * 6.3, 13);
      const ly = Math.min(Math.max(by - 2.5 + sin(t * 1.3) * 2, sy0 + 1), sy1 - 6);
      const ry = Math.min(Math.max(by - 2.5 + cos(t * 0.9) * 3, sy0 + 1), sy1 - 6);
      p.rect(sx0 + 1, ly, sx0 + 2, ly + 5, PAL.cyan); p.rect(sx1 - 2, ry, sx1 - 1, ry + 5, "#ff6ab8");
      p.rect(bx, by, bx + 2, by + 2, "#ffffff");
    } else if (Math.trunc(t * 1.2) % 2 === 0) p.spr((sx0 + sx1) / 2, (sy0 + sy1) / 2, "heart", "#4a3f8f");
    p.rect(7, 80, 12, 82, "#463f7a");
    p.px(28, 81, Math.trunc(t * 2) % 2 ? PAL.red : "#7a2a3a"); p.px(25, 81, PAL.cyan);
    p.rect(8, 91, 11, 93, PAL.tv); p.rect(26, 91, 29, 93, PAL.tv);
  },
  laptop_screen(s, x0, y0, x1, y1, active) {
    const p = this.p, t = s.t;
    p.rect(x0, y0, x1, y1, "#14102a");
    if (active) {
      const n = Math.trunc(t * 3), cols = [PAL.hair, PAL.cyan, "#ffffff", PAL.yellow];
      for (let row = 0; row < 4; row++) {
        const seed = (row * 7 + n * (row + 3)) % 11, len = 3 + (seed * 3) % 10;
        p.rect(x0 + 1, y0 + 1 + row * 2, Math.min(x1 - 1, x0 + 1 + len), y0 + 2 + row * 2, cols[(row + n) % 4]);
      }
      for (let b = 0; b < 5; b++) {
        const hh = 1 + Math.trunc((s.v * 0.8 + 0.2 * (0.5 + 0.5 * sin(t * 6 + b * 1.7))) * 3);
        p.rect(x0 + 2 + b * 3, y1 - 1 - hh, x0 + 4 + b * 3, y1 - 1, b % 2 ? PAL.cyan : PAL.hair);
      }
    } else p.rect(x0 + 1, y1 - 2, x1 - 1, y1 - 1, "#2a2458");
  },
  desk(s, front) {
    const p = this.p, lx = DESK_X, dx0 = lx - 17;
    p.rect(dx0, 88, GW, 92, PAL.wood_d); p.rect(dx0 + 1, 92, dx0 + 4, FY, PAL.wood_d); p.rect(GW - 4, 92, GW - 1, FY, PAL.wood_d);
    p.rect(dx0 - 2, 84, GW, 88, PAL.wood); p.rect(dx0 - 2, 84, GW, 85, PAL.wood_l);
    p.rect(lx - 12, 69, lx + 12, 84, PAL.metal);
    this.laptop_screen(s, lx - 10, 71, lx + 10, 82, front && s.pose === "laptop");
    p.rect(lx - 14, 83, lx + 14, 85, PAL.metal_d);
    if (!g(s, "headphones", true)) {
      const hx = dx0 + 2;
      p.pl([[hx, 83], [hx + 1, 80], [hx + 5, 78.5], [hx + 9, 80], [hx + 10, 83]], 1.2, PAL.phone);
      p.ell(hx, 82, 2.2, 2.8, PAL.phone); p.ell(hx + 10, 82, 2.2, 2.8, PAL.phone);
      p.ell(hx, 82, 1.2, 1.7, PAL.cyan); p.ell(hx + 10, 82, 1.2, 1.7, PAL.cyan);
    }
  },
  bed(s, cover = false) {
    const p = this.p, x0 = BED_X0, x1 = BED_X1;
    p.rect(x0 - 3, 64, x0 + 2, 92, PAL.wood_d); p.rect(x0 - 3, 64, x0 + 2, 66, PAL.wood_l);
    p.rect(x1 - 2, 77, x1 + 2, 92, PAL.wood_d); p.rect(x1 - 2, 77, x1 + 2, 79, PAL.wood_l);
    p.rect(x0 + 2, 80, x1 - 1, 88, "#e8e0ff"); p.rect(x0 + 2, 88, x1 - 1, 91, "#a89ae0");
    p.rect(x0 + 2, 91, x0 + 5, 93, PAL.wood_d); p.rect(x1 - 6, 91, x1 - 3, 93, PAL.wood_d);
    p.ell(x0 + 13, 78, 9, 3.4, "#ffffff"); p.ell(x0 + 13, 79, 8, 2, "#dcd4ff");
    if (!cover) {
      const bl = "#ff9fd3", bl2 = "#ffc4e3";
      p.rect(x0 + 22, 79, x1 - 1, 90, bl);
      for (let k = x0 + 24; k < x1 - 1; k += 6) p.rect(k, 79, k + 2, 90, bl2);
      p.rect(x0 + 22, 79, x1 - 1, 81, bl2);
    }
  },
  bed_cover(s) {
    const p = this.p, x0 = BED_X0, x1 = BED_X1, bl = "#ff9fd3", bl2 = "#ffc4e3";
    p.rect(x0 + 8, 84, x1 - 1, 91, bl);
    for (let k = x0 + 10; k < x1 - 1; k += 6) p.rect(k, 84, k + 2, 91, bl2);
    p.rect(x0 + 8, 83, x1 - 1, 85, bl2);
    p.ell(x0 + 38, 84, 14, 3.6, bl); p.ell(x0 + 38, 83.4, 13, 2.2, bl2);
    p.ell(x0 + 20, 83.2 + sin(s.t * 1.6) * 0.5, 7, 3.2, bl);
  },
  snack_table(s) {
    const p = this.p, cx = SNACK_X + 8;
    p.rect(cx - 1, 85, cx + 2, 92, PAL.wood_d); p.rect(cx - 5, 91, cx + 6, 93, PAL.wood_d);
    p.ell(cx + 0.5, 84, 11, 2.6, PAL.wood_l); p.ell(cx + 0.5, 84.8, 11, 2.2, PAL.wood); p.ell(cx + 0.5, 83.2, 8.5, 1.6, "#ffffff");
    const hide = g(s, "eating", false) ? g(s, "snack") : null;
    ["cookie", "donut", "cake"].forEach((kind, i) => { if (kind !== hide) this.food(cx - 5 + i * 5.5, 81.6, kind, 1.0); });
    p.rect(cx + 7, 78, cx + 11, 83, "#cfe8ff"); p.rect(cx + 7, 78, cx + 11, 79, "#ffffff"); p.rect(cx + 8, 80, cx + 10, 83, "#ff9fd3");
  },
  food(x, y, kind, size) {
    const p = this.p, r = Math.max(0.6, size);
    if (kind === "cookie") {
      p.ell(x, y, 3.0 * r, 2.4 * r, "#c98a4b");
      if (size > 0.5) for (const [dx, dy] of [[-1, -1], [1, 0], [-0.5, 1]]) p.px(x + dx, y + dy, "#5a3418");
    } else if (kind === "donut") {
      p.ell(x, y, 3.3 * r, 2.6 * r, "#e8a46a"); p.ell(x, y - 0.4, 3.0 * r, 2.2 * r, "#ff7bb8");
      if (size > 0.6) { p.px(x, y, "#e8a46a"); p.px(x - 1.5, y - 1, "#ffffff"); p.px(x + 1.5, y, "#ffe66b"); }
    } else {
      p.poly([[x - 3.2 * r, y + 2], [x + 3.2 * r, y + 2], [x + 3.2 * r, y - 1.6 * r], [x - 3.2 * r, y - 0.2 * r]], "#fff0e0");
      p.rect(x - 3.2 * r, y + 0.8, x + 3.2 * r, y + 2, "#e8a46a");
      p.rect(x - 3.2 * r, y - 0.4, x + 3.2 * r, y + 0.4, "#ff9fd3");
      p.ell(x + 1.5, y - 1.8 * r, 1.2, 1.2, "#ff4f6d");
    }
  },
};
