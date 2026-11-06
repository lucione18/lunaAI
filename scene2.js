// scene2.js - face, head, arms, items (port of luna_pixel.py, second half)
import { FY, CENTER, BED_X0, DESK_X, mix, pmod, linspace, rad } from "./pix.js";
import { PAL, g } from "./scene1.js";
const sin = Math.sin, cos = Math.cos, PI = Math.PI, tr = Math.trunc;
const arc = (a0, a1, n, f) => linspace(rad(a0), rad(a1), n).map(f);

export const SceneFace = {
  eye(ex, ey, kind, blink, side, s) {
    const p = this.p, [gx, gy] = s.gaze, t = s.t;
    if (kind === "happy" || (kind === "wink" && side === 1)) {
      p.pl(arc(20, 160, 9, a => [ex + 5.2 * cos(a), ey + 3 - 5 * sin(a)]), 1.9, PAL.lash); return;
    }
    if (kind === "closed" || kind === "cry") {
      p.pl(arc(20, 160, 9, a => [ex + 5.2 * cos(a), ey - 1 + 4 * sin(a)]), 1.9, PAL.lash);
      if (kind === "cry") {
        for (let k = 0; k < 3; k++) {
          const ty = ey + 4 + pmod(t * 16 + k * 6, 15), x = tr(ex - side * 1.5 + side * k * 0.6);
          p.rect(x, tr(ty), x + 2, tr(ty) + 3, "#7fd3ff");
        }
        p.ell(ex, ey + 4, 2.4, 1.2, "#7fd3ff");
      }
      return;
    }
    if (kind === "squint") { const d = -side; p.pl([[ex + d * 4.5, ey - 1], [ex - d * 3.5, ey + 2.5], [ex + d * 4.5, ey + 6]], 1.8, PAL.lash); return; }
    if (blink) { p.line(ex - 5, ey + 1.5, ex + 5, ey + 1.5, 1.9, PAL.lash); return; }
    let rx = 5.0, ry = 5.8, k = 1.0;
    if (kind === "sleepy") k = 0.45; else if (kind === "surprised") { rx = 5.6; ry = 6.6; }
    const sry = ry * k, cy = ey + ry - sry;
    p.ell(ex, cy, rx, sry, PAL.white);
    const lid = (w) => arc(10, 170, 11, a => [ex + (rx + 0.4) * cos(a), cy - (sry + 0.2) * sin(a)]);
    if (kind === "dizzy") {
      for (let j = 0; j < 16; j++) { const a = j * 0.95 + t * 9, r = 0.4 + j * 0.27; p.px(ex + cos(a) * r, cy + sin(a) * r * 1.1, PAL.iris_d); }
      p.pl(lid(), 1.8, PAL.lash); return;
    }
    const irx = rx - 0.6, iry = Math.max(1.2, sry - 0.5), ix = ex + gx * 0.6, iy = cy + 0.4 + gy * 0.5;
    p.ell(ix, iy, irx, iry, PAL.iris_d);
    p.ell(ix, iy + iry * 0.18, irx - 0.45, iry * 0.82, PAL.iris);
    p.ell(ix, iy + iry * 0.5, irx - 0.9, iry * 0.46, "#b99cff");
    p.ell(ix, iy + iry * 0.62, irx - 1.7, iry * 0.26, "#e3d4ff");
    if (kind === "love") { p.ell(ix, iy, irx, iry, "#ffd0e8"); p.spr(ix, iy, "heart", "#ff4f8a"); }
    else if (kind === "star") {
      p.ell(ix, iy, 1.7, Math.min(2.6, iry * 0.55), PAL.pupil);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) p.px(tr(ix) + dx, tr(iy) + dy, PAL.white);
    } else {
      p.ell(ix, iy + 0.2, 1.7, Math.min(2.7, iry * 0.55), PAL.pupil);
      p.ell(ix - 1.7, iy - 2.1, 1.5, 1.7, PAL.white);
      p.dot(ix + 1.9, iy + 2.3, PAL.white, 0.7);
      p.line(ix + 1.8, iy - 0.2, ix + 1.8, iy + 1.0, 0.7, "#ffffff");
      p.line(ix + 1.2, iy + 0.4, ix + 2.4, iy + 0.4, 0.7, "#ffffff");
    }
    const pts = lid();
    p.pl(pts, 2.0, PAL.lash);
    const [ox, oy] = side === 1 ? pts[0] : pts[pts.length - 1];
    p.line(ox, oy, ox + side * 1.6, oy - 1.3, 1.4, PAL.lash);
    if (kind === "sad") { const ty = ey + 6 + pmod(t * 9, 6); p.rect(tr(ex - 1), tr(ty), tr(ex), tr(ty) + 3, "#7fd3ff"); }
  },
  mouth(hx, hy, kind, v, s) {
    const p = this.p, t = s.t, my = hy + 9;
    if ((kind === "omega" || kind === "smile") && g(s, "speaking", false)) kind = "talk";
    if (kind === "omega") p.pl([[hx - 3, my], [hx - 2, my + 1], [hx - 1, my + 1], [hx, my], [hx + 1, my + 1], [hx + 2, my + 1], [hx + 3, my]], 1.0, PAL.mouth);
    else if (kind === "smile") p.pl(arc(10, 170, 8, a => [hx + 3.5 * cos(a), my - 1 + 2.2 * sin(a)]), 1.1, PAL.mouth);
    else if (kind === "talk") { const o = 0.5 + 0.5 * sin(t * 15); p.ell(hx, my + 1, 2.4, 0.9 + 1.9 * o, PAL.lash); p.ell(hx, my + 1.2, 1.8, 0.5 + 1.4 * o, PAL.mouth); }
    else if (kind === "sing") {
      const rx = 2.4 + v * 1.4, ry = 1.4 + v * 3.6;
      p.ell(hx, my + ry * 0.4, rx + 0.8, ry + 0.8, PAL.lash); p.ell(hx, my + ry * 0.4, rx, ry, PAL.mouth);
      if (ry > 2.6) p.ell(hx, my + ry * 0.9, rx * 0.6, ry * 0.4, PAL.tongue);
    }
    else if (kind === "frown") p.pl(arc(10, 170, 8, a => [hx + 3 * cos(a), my + 3 - 2 * sin(a)]), 1.1, PAL.mouth);
    else if (kind === "o") { p.ell(hx, my + 1.2, 2.0, 2.6, PAL.lash); p.ell(hx, my + 1.4, 1.2, 1.8, PAL.tongue); }
    else if (kind === "flat") p.line(hx - 2.5, my + 1, hx + 2.5, my + 1, 1.1, PAL.mouth);
    else if (kind === "laugh") {
      const o = 0.7 + 0.3 * sin(t * 18);
      p.ell(hx, my + 0.5, 5.0, 3.6 * o, PAL.lash); p.ell(hx, my + 0.7, 4.4, 3.1 * o, PAL.mouth);
      p.rect(tr(hx - 5), tr(my - 4), tr(hx + 6), tr(my), PAL.skin);
      p.rect(tr(hx - 4), tr(my), tr(hx + 5), tr(my) + 1, PAL.white);
      p.ell(hx, my + 2.4, 2.4, 1.1, PAL.tongue);
    }
    else if (kind === "wobble") { const sh = sin(t * 22) * 0.4; p.pl([[hx - 4, my + 2 + sh], [hx - 2, my + 0.5], [hx, my + 2 - sh], [hx + 2, my + 0.5], [hx + 4, my + 2 + sh]], 1.1, PAL.mouth); }
    else if (kind === "pout") { p.ell(hx, my + 1.6, 2.0, 1.0, PAL.mouth); p.px(hx - 3, my + 1, PAL.mouth); p.px(hx + 3, my + 1, PAL.mouth); }
    else if (kind === "chew") { if (tr(t * 6) % 2) p.ell(hx, my + 1.2, 1.8, 1.2, PAL.mouth); else p.line(hx - 2, my + 1, hx + 2, my + 1, 1.1, PAL.mouth); }
    else if (kind === "grimace") p.pl([[hx - 3.5, my + 1.4], [hx - 1.8, my], [hx - 0.2, my + 1.5], [hx + 1.4, my], [hx + 3.5, my + 1.4]], 1.1, PAL.mouth);
    else { const h = 1.6 + v * 2.4; p.ell(hx, my + 0.5, 4.4, h + 0.7, PAL.lash); p.ell(hx, my + 0.5, 3.8, h, PAL.white); p.rect(tr(hx - 4), tr(my - h), tr(hx + 5), tr(my - h) + 1, PAL.lash); }
  },
  glasses(hx, hy) {
    const p = this.p, fr = "#4a3a7a";
    for (const side of [-1, 1]) {
      const ex = hx + side * 8.6, ey = hy + 6;
      p.pl(linspace(0, 2 * PI, 22).map(a => [ex + 6.6 * cos(a), ey + 6.3 * sin(a)]), 1.1, fr);
      p.px(ex - 3.5, ey - 2.5, PAL.white); p.px(ex - 2.5, ey - 3.5, PAL.white);
      p.line(hx + side * 15, hy + 4, hx + side * 18, hy + 2, 1, fr);
    }
    p.line(hx - 2.2, hy + 4.5, hx + 2.2, hy + 4.5, 1, fr);
  },
  face_extras(hx, hy, E, s) {
    const p = this.p, t = s.t;
    if (E.puff) { p.ell(hx - 16, hy + 7, 3.4, 4.2, PAL.skin); p.ell(hx + 16, hy + 7, 3.4, 4.2, PAL.skin); }
    if ((E.blush || 0) >= 0.95) for (const side of [-1, 1]) for (let k = 0; k < 3; k++) p.line(hx + side * 11 - 2 + k * 2, hy + 9, hx + side * 11 - 1 + k * 2, hy + 6.5, 1, "#ff6f8f");
    if (E.sweat) [[-15, -9], [16, -12], [-17, 0]].forEach(([dx, dy], i) => p.spr(hx + dx, hy + dy + pmod(t * 5 + i * 2, 6), "drop", "#7fd3ff"));
    if (E.steam) [-10, 10].forEach((dx, i) => { const yy = hy - 28 - pmod(t * 10 + i * 3, 8); p.ell(hx + dx, yy, 3, 2.2, "#ffe0ec"); p.ell(hx + dx + 2, yy - 1.5, 2, 1.6, "#fff0f6"); });
  },
  head_acc(s, hx, hy) {
    const p = this.p, acc = this.W.acc;
    if (acc.includes("cat ears")) for (const side of [-1, 1]) {
      p.poly([[hx + side * 6, hy - 21], [hx + side * 15, hy - 22], [hx + side * 13, hy - 33]], PAL.hair_d);
      p.poly([[hx + side * 8.5, hy - 22], [hx + side * 13.5, hy - 22.5], [hx + side * 12.6, hy - 29]], "#ffb3d9");
    }
    if (acc.includes("beanie")) {
      p.poly([[hx - 19, hy - 8], [hx - 20, hy - 16], [hx - 12, hy - 25], [hx, hy - 27], [hx + 12, hy - 25], [hx + 20, hy - 16], [hx + 19, hy - 8]], "#7a5af0");
      p.rect(hx - 19.5, hy - 12, hx + 19.5, hy - 7.5, "#5a3ed0");
      for (let k = -9; k < 10; k += 3) p.line(hx + k * 2, hy - 12, hx + k * 2, hy - 7.5, 0.7, "#7a5af0");
      p.ell(hx, hy - 28, 3.6, 3.4, "#f3e8ff");
    }
    if (acc.includes("bow")) this._bow(hx - 14, hy - 17, "#ff66b0", "#d8408a", 0.9);
    if (acc.includes("santa hat")) {
      p.poly([[hx - 19, hy - 9], [hx + 19, hy - 9], [hx + 15, hy - 24], [hx + 6, hy - 31], [hx + 12, hy - 38], [hx - 2, hy - 33], [hx - 14, hy - 24]], "#d8303c");
      p.line(hx - 6, hy - 26, hx - 12, hy - 12, 0.8, "#a82030");
      p.rect(hx - 20, hy - 13, hx + 20, hy - 7.5, "#ffffff"); p.ell(hx + 12, hy - 38, 3.6, 3.6, "#ffffff");
    }
    if (acc.includes("witch hat")) {
      p.ell(hx, hy - 12, 25, 4.2, "#2a2040");
      p.poly([[hx - 14, hy - 12], [hx + 14, hy - 12], [hx + 4, hy - 38], [hx - 1, hy - 40], [hx - 5, hy - 30]], "#3a2a5a");
      p.rect(hx - 14, hy - 17, hx + 14, hy - 13, "#ff9a2a"); p.rect(hx - 2, hy - 18, hx + 2, hy - 12, "#ffe66b");
    }
    if (acc.includes("flower crown")) ["#ffffff", "#ffb3d9", "#ffe66b", "#ffffff", "#ffb3d9", "#ffe66b", "#ffffff"].forEach((col, k) => {
      const a = rad(200 + k * 23), fx = hx + 19.5 * cos(a), fy = hy - 6 + 16 * sin(a);
      p.ell(fx, fy, 2.7, 2.7, col); p.dot(fx, fy, "#f0a030", 0.9); p.line(fx + 2, fy + 1, fx + 4, fy + 2, 0.7, "#4fb870");
    });
  },
  draw_head(s, hx, hy, sway, lift = 0, tailLen = null) {
    const p = this.p, E = s.expr, style = this.W.style || "twin tails";
    p.ell(hx, hy - 3, 21, 19, PAL.hair_d);
    if (style === "bob") {
      p.ell(hx, hy + 3, 22.5, 18, PAL.hair_d); p.ell(hx, hy + 1, 21.5, 16.5, PAL.hair);
      for (const k of [-1, 1]) p.line(hx + k * 17, hy + 4, hx + k * 18, hy + 15, 0.8, PAL.hair_d);
    }
    const tsw = sin(s.t * s.sw - 0.8) * (s.moving ? 3 : 0.8) - sway * 0.6 - s.walk_dir * 2.5;
    const sides = style === "ponytail" ? [1] : style === "bob" ? [] : [-1, 1];
    if (tailLen === null && style === "short twin tails") tailLen = 17;
    for (const side of sides) {
      let bx = hx + side * 19, by = hy + 8, endy = FY - 6 - s.sit * 11 - s.bounce * 2 - lift;
      if (style === "ponytail") { bx = hx + 13; by = hy - 14; p.ell(bx, by, 3.2, 2.6, PAL.hair_d); p.ell(bx + 1, by + 0.5, 1.4, 1.4, "#ff66b0"); }
      if (tailLen) endy = Math.min(endy, by + tailLen);
      const end = [bx + side * (5 + s.bounce * 2.5) + tsw, endy];
      const mid = [bx + side * (9 + s.bounce * 2) + tsw * 0.5, (by + end[1]) / 2 + 2];
      p.taper([bx, by], mid, end, style !== "ponytail" ? 6.5 : 7.5, 1.3, PAL.hair);
      p.line(bx + side * 1, by + 6, end[0] - side * 1, end[1] - 6, 1, PAL.hair_d);
      p.line(bx - side * 2, by + 4, end[0] - side * 2.5, end[1] - 9, 1, PAL.hair_l);
      for (const k of [-1, 1]) {
        p.line(bx + k * 2.2, by + 5, mid[0] + k * 2.0, mid[1], 0.7, PAL.hair_d);
        p.line(mid[0] + k * 1.6, mid[1] + 2, end[0] + k * 1.4, end[1] - 3, 0.7, PAL.hair_l);
      }
      p.taper(end, [end[0] + side * 1.5, end[1] + 2], [end[0] + side * 2.5 + tsw * 0.3, end[1] + 5], 1.6, 0.3, PAL.hair);
      p.taper(end, [end[0] - side * 1.2, end[1] + 2], [end[0] - side * 1.8, end[1] + 4.5], 1.2, 0.3, PAL.hair_d);
      if (style !== "ponytail") p.ell(bx, by - 1, 3.0, 2.4, PAL.hair_d);
    }
    p.ell(hx, hy, 17, 13, PAL.skin);
    p.ell(hx, hy + 12, 9, 1.6, PAL.skin_d);
    p.ell(hx, hy + 9.8, 11, 3.0, mix(PAL.skin, PAL.skin_d, 0.25));
    p.dot(hx, hy + 6.2, PAL.skin_d, 0.5);
    if (!g(s, "headphones", true)) for (const side of [-1, 1]) { p.ell(hx + side * 17.2, hy + 3, 2.4, 3.2, PAL.skin); p.ell(hx + side * 17.2, hy + 3.4, 1.2, 1.8, PAL.skin_d); }
    let bl = mix(PAL.skin, PAL.blush, 0.35 + E.blush * 0.65);
    if (E.blush > 0.9) bl = mix(PAL.skin, "#ff6f8f", 0.75);
    p.ell(hx - 11, hy + 7, 3.3, 1.9, bl); p.ell(hx + 11, hy + 7, 3.3, 1.9, bl);
    this.face_extras(hx, hy, E, s);
    for (const side of [-1, 1]) this.eye(hx + side * 8.6, hy + 1, E.eyes, s.blink, side, s);
    this.mouth(hx, hy, E.mouth, s.v, s);
    for (const side of [-1, 1]) p.poly([[hx + side * 18.5, hy - 5], [hx + side * 15, hy - 7], [hx + side * 15.5, hy + 13], [hx + side * 17.5, hy + 8]], PAL.hair);
    const bang = [[-19, -1.4], [-20, -12], [-15.5, -21.6], [0, -24.4], [15.5, -21.6], [20, -12], [19, -1.4], [16.5, -8.5], [13, -3], [10, -10], [6, -3], [3.2, 3.2], [0.8, -4], [-5, -11], [-8, -3], [-12.5, -9.9], [-16.5, -2.4]];
    p.poly(bang.map(([x, y]) => [hx + x, hy + y]), PAL.hair);
    for (const x of [-12, -6, 7, 13]) p.line(hx + x, hy - 21, hx + x * 0.9, hy - 11, 1, PAL.hair_d);
    p.pl(Array.from({ length: 11 }, (_, k) => [hx - 12 + 1.1 * k, hy - 17.5 - 1.6 * sin(k / 10 * PI)]), 1.4, PAL.hair_l);
    p.pl(Array.from({ length: 8 }, (_, k) => [hx + 3 + 1.1 * k, hy - 20 - 1.3 * sin(k / 10 * PI)]), 1.0, PAL.hair_l);
    const sx = hx + 11.5, sy = hy - 12;
    p.poly([[sx, sy - 4], [sx + 1.1, sy - 1.1], [sx + 4, sy], [sx + 1.1, sy + 1.1], [sx, sy + 4], [sx - 1.1, sy + 1.1], [sx - 4, sy], [sx - 1.1, sy - 1.1]], PAL.cyan);
    p.dot(sx, sy, "#e8fbff", 0.9);
    const BR = { neutral: [0, .3], up: [-1.2, -1.0], sad: [-1.6, .8], angry: [1.3, -.8], soft: [-.5, .5] };
    const [inner, outer] = BR[E.brows];
    for (const side of [-1, 1]) { const ex = hx + side * 8.6, by = hy - 7.5; p.line(ex - side * 3.8, by + inner, ex + side * 4.4, by + outer, 1.3, PAL.brow); }
    if (E.vein) p.spr(hx + 13, hy - 14, "vein", PAL.red);
    if (g(s, "glasses", false) || s.pose === "read") this.glasses(hx, hy);
    const a = sin(s.t * s.sw + 0.5) * 0.8;
    p.pl([[hx, hy - 22], [hx - 0.5 + a * 0.3, hy - 27], [hx + 1.5 + a, hy - 30], [hx + 5 + a * 1.5, hy - 30.5]], 2.1, PAL.hair);
    if (g(s, "headphones", true)) {
      p.pl(linspace(0, PI, 24).map(b => [hx + 21.5 * cos(b), hy + 1 - 22.5 * sin(b)]), 2.4, PAL.phone);
      for (const side of [-1, 1]) {
        const cx = hx + side * 21, cy = hy + 2, gg = 0.8 + s.v * 0.9;
        p.ell(cx, cy, 5.4, 7, PAL.phone); p.ell(cx - side * 0.6, cy - 0.5, 4.6, 6, PAL.phone_l);
        p.ell(cx, cy, 3.2 + gg * 0.4, 3.9 + gg * 0.4, PAL.cyan);
        p.poly([[cx - 3, cy + 8], [cx + 3, cy + 8], [cx, cy + 13]], PAL.cyan);
      }
    }
    this.head_acc(s, hx, hy);
    this.head = [hx, hy - 31];
  },
  hand_pos(s, cx, hx, hy, top, bo) {
    const t = s.t, pose = s.pose, ph = t * s.sw, seated = s.sit > 0.5, sitY = seated ? 83 : 77;
    const ab = Math.abs;
    if (pose === "laptop" && seated) return [[cx - 13, 83 - ab(sin(t * 14))], [cx + 13, 83 - ab(cos(t * 11))]];
    if (pose === "game" && seated) return [[cx - 6, 82.5 + sin(t * 5) * 0.4], [cx + 6, 83.5 - ab(sin(t * 9)) * 0.8]];
    if (pose === "read") return [[cx - 9, top + 18], [cx + 9, top + 18]];
    if (pose === "phone") return [[cx - 4, top + 17 + sin(t * 8) * 0.4], [cx + 4, top + 17 - sin(t * 9) * 0.4]];
    if (pose === "call") return [[cx - 12, 77], [hx + 17.5, hy + 8]];
    if (pose === "walk") { const sp = sin(s.walk_phase); return [[cx - 11, 74 + sp * 3], [cx + 11, 74 - sp * 3]]; }
    if (pose === "fan") return [[hx - 14, hy + 10 + sin(t * 17) * 4], [hx + 14, hy + 10 + sin(t * 17 + PI) * 4]];
    if (pose === "shiver") return [[cx + 7, top + 6], [cx - 7, top + 6]];
    if (pose === "ears") return [[hx - 19, hy + 2], [hx + 19, hy + 2]];
    if (pose === "cupear") return [[cx - 12, 77], [hx + 20, hy + 1]];
    if (pose === "snack") { const bite = ab(sin(t * 3)) * 2.5; return [[cx - 12, 77], [hx + 5, hy + 11 - bite]]; }
    if (pose === "sing") return [[hx - 24, hy - 4 + sin(t * 4) * 5], [hx + 8, hy + 13]];
    if (pose === "angry") return [[cx - 13, top + 14], [cx + 13, top + 14]];
    if (pose === "blush") return [[hx - 13, hy + 8], [hx + 13, hy + 8]];
    if (pose === "cry") { const wp = sin(t * 9) * 1.2; return [[hx - 8, hy + 5 + wp], [hx + 8, hy + 5 - wp]]; }
    if (pose === "laugh") return [[cx - 5, top + 20], [cx + 5, top + 20]];
    if (pose === "wave") return [[cx - 12, 77], [cx + 17, top - 4 + sin(t * 9) * 3]];
    if (pose === "twirl") return [[cx - 22, top + 6 + sin(t * 8) * 3], [cx + 22, top + 6 - sin(t * 8) * 3]];
    if (pose === "stumble") return [[cx - 20, top - 6 + sin(t * 20) * 5], [cx + 20, top - 8 + sin(t * 20 + 2) * 5]];
    if (pose === "held") return [[hx - 15, hy - 14 + sin(t * 7) * 2], [hx + 15, hy - 14 - sin(t * 7) * 2]];
    if (pose === "umbrella") return [[cx - 9, top + 14], [cx + 2, top + 10]];
    const a = pose === "dance" ? s.arms : (seated ? "lap" : "down");
    if (a === "up") return [[cx - 24, 44 + bo + sin(ph * 2) * 5], [cx + 24, 44 + bo + sin(ph * 2 + PI) * 5]];
    if (a === "wave") return [[cx - 19, 62 + bo + sin(ph) * 4], [cx + 19, 62 + bo + sin(ph + 1.5) * 4]];
    if (a === "pump") return [[cx - 15, 58 + bo - sin(ph) * 4], [cx + 15, 58 + bo + sin(ph) * 4]];
    if (a === "lap") { const y = seated ? 83 : 76; return [[cx - 3, y + bo], [cx + 3, y + bo]]; }
    const w = seated ? 11 : 13;
    return [[cx - w, sitY + bo + sin(t * 1.3) * 0.6], [cx + w, sitY + bo + sin(t * 1.3) * 0.6]];
  },
  items(s, hx, hy, cx, top, hands) {
    const p = this.p, t = s.t, pose = s.pose, [lh, rh] = hands;
    if (pose === "call") {
      p.rect(hx + 17, hy - 3, hx + 20.5, hy + 8, PAL.phone); p.rect(hx + 17.5, hy - 2, hx + 18.7, hy + 6, "#7fd3ff");
      this.hand_dot(rh);
      for (let k = 0; k < 2; k++) if (tr(t * 4 + k) % 2) p.line(hx + 23 + k * 2, hy - 1, hx + 23 + k * 2, hy + 5, 1, "#cdb8ff");
    } else if (pose === "phone") {
      p.rect(cx - 3.5, top + 9, cx + 3.5, top + 19.5, PAL.phone);
      p.rect(cx - 2.5, top + 10, cx + 2.5, top + 18.5, tr(t * 2) % 2 ? "#6be3ff" : "#ff9fd3");
      for (let r = 0; r < 3; r++) p.line(cx - 1.5, top + 12 + r * 2.4, cx + 1.5 - (r % 2), top + 12 + r * 2.4, 1, "#ffffff");
      this.hand_dot([cx - 3.8, top + 17]); this.hand_dot([cx + 3.8, top + 17]);
    } else if (pose === "read") {
      const bx0 = cx - 10, by0 = top + 8;
      p.rect(bx0, by0 + 13, cx + 10, by0 + 15, "#c0469a"); p.rect(bx0 + 1, by0, cx - 0.5, by0 + 13, "#fff8f0");
      p.rect(cx + 0.5, by0, cx + 9, by0 + 13, "#fff8f0"); p.rect(cx - 0.5, by0, cx + 0.5, by0 + 13, "#d8c8e8");
      for (let r = 0; r < 4; r++) { const yy = by0 + 2 + r * 3; p.line(bx0 + 2.5, yy, cx - 2, yy, 1, "#b8b0d0"); p.line(cx + 2, yy, cx + 7.5 - (r % 2) * 1.5, yy, 1, "#b8b0d0"); }
      const ph = pmod(t * 0.45, 1);
      if (ph > 0.8) { const wf = 8.5 * (1 - (ph - 0.8) / 0.2); p.rect(cx + 0.5, by0, cx + 0.5 + wf, by0 + 13, "#ffffff"); p.line(cx + 0.5 + wf, by0, cx + 0.5 + wf, by0 + 13, 1, "#d8c8e8"); }
      this.hand_dot([cx - 9.5, by0 + 12]); this.hand_dot([cx + 9.5, by0 + 12]);
    } else if (pose === "sing") {
      p.line(rh[0], rh[1] - 1, hx + 5, hy + 12.5, 1.4, "#a79fd6"); p.ell(hx + 4.5, hy + 12.2, 2.3, 2.3, "#6a5fb0");
      p.px(hx + 3.8, hy + 11.4, "#ffffff"); this.hand_dot(rh);
    } else if (pose === "snack") {
      const size = Math.max(0.4, 1 - g(s, "eat", 0) * 0.6);
      this.food(rh[0], rh[1] - 3, g(s, "snack", "cookie"), size); this.hand_dot(rh);
    } else if (pose === "fan") {
      for (let k = 0; k < 3; k++) { const x = pmod(t * 30 + k * 4, 9), y = hy + 2 + k * 3.2; p.line(hx + 21 + x, y, hx + 24 + x, y, 1, "#cfe6ff"); p.line(hx - 21 - x, y, hx - 24 - x, y, 1, "#cfe6ff"); }
      this.hand_dot(lh); this.hand_dot(rh);
    } else if (pose === "shiver") {
      for (let k = 0; k < 2; k++) { const f = pmod(t * 1.8 + k * 0.5, 1); p.ell(hx + 4 + k * 3 + f * 5, hy + 14 - f * 5, 1.2 + f * 2, 1 + f * 1.4, "#cfe6ff"); }
    } else if (pose === "stumble" && g(s, "ev", 0) > 0.45) {
      for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; p.spr(hx + cos(a) * 14, hy - 27 + sin(a) * 3, "small", PAL.yellow); }
    } else if (pose === "umbrella") {
      const c0x = hx, c0y = hy - 23, pts = linspace(0, PI, 14).map(a => [c0x + 27 * cos(a), c0y - 12 * sin(a)]);
      for (let i = 0; i < 13; i++) p.poly([[c0x, c0y + 1], pts[i], pts[i + 1]], i % 2 === 0 ? "#ff6ab8" : "#ff9fd3");
      p.line(c0x - 27, c0y, c0x + 27, c0y, 1.6, "#c02a7a");
      for (let k = -2; k < 3; k++) p.ell(c0x + k * 11, c0y + 1.2, 2.6, 1.6, "#c02a7a");
      p.px(c0x, c0y - 12.5, "#ffffff");
    }
  },
  controller(s, cx) {
    const p = this.p, t = s.t;
    p.line(cx - 8, 86, cx - 14, 92, 1, "#6a5fb0"); p.line(cx - 14, 92, 30, 92, 1, "#6a5fb0");
    p.rect(cx - 9, 80, cx + 9, 88, PAL.tv); p.rect(cx - 9, 80, cx + 9, 81, "#463f7a");
    p.ell(cx - 4.5, 83, 2.4, 1.4, PAL.shadow);
    const tilt = sin(t * 5) * 2.2;
    p.line(cx - 4.5, 83, cx - 4.5 + tilt, 78.5, 1.3, PAL.collar); p.ell(cx - 4.5 + tilt, 78, 2.1, 2.1, PAL.red);
    p.ell(cx + 3, 84, 1.5, 1.5, tr(t * 6) % 2 ? PAL.cyan : "#1d6a88"); p.ell(cx + 6.5, 82.5, 1.5, 1.5, tr(t * 4) % 2 ? PAL.yellow : "#8a7a2a");
  },
  sparkles(s) {
    const p = this.p, cols = [PAL.cyan, "#ff9fd3", "#ffffff", PAL.yellow], spots = [[-42, 34], [38, 35], [-30, 10], [30, 8]];
    const gx = s.pose === "bed" ? CENTER : s.cx;
    if (s.mood !== "paused" && s.pose !== "bed") spots.forEach(([dx, dy], i) => {
      const ph = sin(s.t * 2.2 + i * 1.7);
      if (ph > -0.2) p.spr(gx + dx, dy + sin(s.t + i) * 1.5, ph > 0.5 ? "spark" : "small", cols[i % 4]);
    });
    for (const [x, y, kind, col] of s.parts) p.spr(x, y, kind, col);
  },
  sleep(s) {
    const p = this.p;
    this.bed(s, false);
    const old = g(s, "headphones", true); s.headphones = false;
    const hx = BED_X0 + 14, hy = 69 + sin(s.t * 1.6) * 0.4;
    this.draw_head(s, hx, hy, 0, 0, 12);
    s.headphones = old;
    this.bed_cover(s);
    this.head = [hx, hy - 31];
  },
};
