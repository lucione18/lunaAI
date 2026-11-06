// body.js - Luna's body and clothes (port of luna_body.py)
import { FY, mix } from "./pix.js";
import { PAL } from "./scene1.js";
import { TOPS, BOTTOMS, DRESSES, SHOES, SOCKS } from "./wear.js";
const sin = Math.sin, PI = Math.PI;
export const lighter = (c, t = 0.3) => mix(c, "#ffffff", t);
export const darker = (c, t = 0.25) => mix(c, "#000000", t);

export function setPalette(w) {
  const it = DRESSES[w.dress] || TOPS[w.top] || {};
  PAL.dress = it.c || "#5a5ad8"; PAL.dress_d = it.d || "#4343b0";
  PAL.collar = it.collar || it.trim || "#d4cfff";
  PAL.bow = it.bow || "#ff66b0"; PAL.bow_d = it.bow_d || "#d8408a";
  const sh = SHOES[w.shoes] || SHOES.sneakers;
  PAL.shoe = sh.c; PAL.shoe_d = sh.d;
}

export const Body = {
  _leg_pts(cx, side, y0, y1, ya, pad = 0) {
    const po = [], pi = [], n = Math.max(2, Math.trunc((y1 - y0) / 1.5) + 1);
    for (let k = 0; k <= n; k++) {
      const y = y0 + (y1 - y0) * k / n;
      let f = (y - (ya - 15)) / 15; f = Math.max(0, Math.min(1, f));
      const half = pad + 3.6 - 1.7 * f + 0.7 * sin(f * PI * 0.9) * (1 - f);
      const mid = cx + side * (4.4 - 0.5 * f);
      po.push([mid + side * half, y]); pi.push([mid - side * half, y]);
    }
    return po.concat(pi.reverse());
  },
  _legs(s, cx, top, lfl, lfr, w) {
    const p = this.p, yh = top + 15;
    const bottom = !w.dress ? BOTTOMS[w.bottom] : null, sock = SOCKS[w.socks], sh = SHOES[w.shoes] || SHOES.sneakers;
    for (const [side, lf] of [[-1, lfl], [1, lfr]]) {
      const ya = FY - 3.5 - lf, y0 = yh - 1.5;
      p.poly(this._leg_pts(cx, side, y0, ya, ya), PAL.skin);
      p.line(cx + side * 1.0, yh + 2, cx + side * 1.4, ya - 4, 1.0, PAL.skin_d);
      if (sock) {
        p.poly(this._leg_pts(cx, side, ya - sock.h, ya, ya), sock.c);
        if (sock.h >= 7) p.rect(cx + side * 4.4 - 3.6, ya - sock.h, cx + side * 4.4 + 3.6, ya - sock.h + 0.8, sock.d);
        if (sock.h >= 12) p.rect(cx + side * 4.4 - 4.0, ya - sock.h, cx + side * 4.4 + 4.0, ya - sock.h + 1.2, lighter(sock.c, 0.12));
      }
      if (bottom && (bottom.style === "pants" || bottom.style === "legging")) {
        const end = bottom.style === "pants" ? ya - 0.5 : ya - 2.0, wide = bottom.style === "pants" ? 0.5 : 0.05;
        p.poly(this._leg_pts(cx, side, yh - 3, end, ya, wide), bottom.c);
        p.line(cx + side * 7.4, yh + 1, cx + side * 6.0, end - 1, 0.8, bottom.seam);
        p.line(cx + side * 1.2, yh + 3, cx + side * 3.2, end - 1, 0.8, bottom.d);
        if (bottom.cuff) p.rect(cx + side * 4.2 - 3.6, ya - 3.5, cx + side * 4.2 + 3.6, ya - 0.6, bottom.d);
      } else if (bottom && bottom.style === "shorts") {
        p.poly(this._leg_pts(cx, side, yh - 3, yh + 5.5, ya, 0.5), bottom.c);
        p.rect(cx + side * 4.4 - 3.9, yh + 4.6, cx + side * 4.4 + 3.9, yh + 5.7, bottom.d);
        p.line(cx + side * 7.2, yh, cx + side * 7.0, yh + 5, 0.7, bottom.seam);
      }
      this.shoe(cx + side * (4.5 - 0.3 * side), FY - 2 - lf, side, sh);
    }
  },
  shoe(x, y, side, sh) {
    const p = this.p;
    if (sh.tall) { p.rect(x - 3.3, y - 6.5, x + 3.3, y, sh.c); p.rect(x - 3.3, y - 6.5, x + 3.3, y - 5.5, sh.d); }
    if (sh.fluffy) {
      p.ell(x + side * 0.4, y, 5.4, 3.0, sh.c);
      for (const k of [-3, -1, 1, 3]) p.ell(x + k + side * 0.6, y - 1.6, 1.6, 1.3, lighter(sh.c, 0.4));
      return;
    }
    p.ell(x + side * 0.7, y - 0.3, 5.0, 2.8, sh.c);
    p.ell(x + side * 1.8, y + 0.2, 3.0, 2.0, lighter(sh.c, 0.35));
    p.rect(x - 4.8 + side * 0.5, y + 1.2, x + 5.8 + side * 0.5, y + 2.4, "#f4f1ff");
    p.rect(x - 4.8 + side * 0.5, y + 2.0, x + 5.8 + side * 0.5, y + 2.4, "#cfc8ea");
    if (sh.lace) {
      p.line(x - 1.0, y - 2.4, x + 0.4 + side, y - 1.0, 0.8, sh.lace);
      p.line(x - 0.2, y - 1.0, x + 1.4 + side, y + 0.2, 0.8, sh.lace);
    }
    p.ell(x - side * 2.8, y - 0.4, 1.6, 1.4, sh.d);
  },
  draw_body(s, cx, bo, sway, lift = 0, lean = 0) {
    const p = this.p, w = this.W;
    setPalette(w);
    const dress = DRESSES[w.dress], topI = TOPS[w.top], botI = BOTTOMS[w.bottom];
    const seated = s.sit > 0.5, t = s.t, sw = s.sw, pose = s.pose;
    let step = pose === "walk" ? sin(s.walk_phase) : sin(t * sw);
    let stepping = pose === "walk" || (pose === "dance" && ["hype", "happy", "intense"].includes(s.mood)) || pose === "twirl";
    if (pose === "angry") { step = sin(t * 9); stepping = true; }
    if (seated) {
      const top = 70 + bo, lap = dress || botI || topI;
      p.ell(cx, 88, 16.5, 5.0, lap ? darker(lap.c, 0.1) : PAL.dress_d);
      p.ell(cx, 87, 16, 4.4, lap ? lap.c : PAL.dress);
      const sk = (botI && !dress) ? botI : null;
      if (sk && ["pants", "legging", "shorts"].includes(sk.style)) { p.ell(cx - 8, 88.5, 8.5, 4, sk.c); p.ell(cx + 8, 88.5, 8.5, 4, sk.c); }
      this._torso(s, cx, top, lean, w, 0, true);
      const sh = SHOES[w.shoes] || SHOES.sneakers, sock = SOCKS[w.socks];
      for (const side of [-1, 1]) { if (sock) p.ell(cx + side * 15, 90.2, 3.2, 2.6, sock.c); this.shoe(cx + side * 15, 91.6, side, sh); }
      return top;
    }
    const top = 61 + bo - lift, flare = pose === "twirl" ? 4 : 0, skirt = sway * 0.3, yw = top + 10.5, yh = top + 15;
    const lfl = stepping ? Math.max(0, step) * 2.5 : 0, lfr = stepping ? Math.max(0, -step) * 2.5 : 0;
    const sh = SHOES[w.shoes] || SHOES.sneakers;
    if (pose === "held") {
      for (const side of [-1, 1]) {
        const x = cx + side * 4.5, sw_ = sin(t * 6 + side) * 2.2;
        const col = (botI && !dress && ["pants", "legging"].includes(botI.style)) ? botI.c : PAL.skin;
        p.line(x, yh, x + sw_, yh + 11, 5.4, col);
        this.shoe(x + sw_, yh + 13, side, sh);
      }
    } else this._legs(s, cx, top, lfl, lfr, w);
    const skI = dress || (botI && botI.style === "skirt" ? botI : null);
    if (skI) {
      const hem = dress ? top + 23 : yw + 2 + (skI.length || 7), hw = 7.6 + (hem - yw) * 0.5 + flare;
      p.poly([[cx - 7.2 + lean * 0.4, yw - 1], [cx + 7.2 + lean * 0.4, yw - 1], [cx + hw + skirt, hem], [cx - hw + skirt, hem]], skI.c);
      const n = (skI.pleats || dress) ? 7 : 4;
      for (let k = 1; k < n; k++) {
        const u = k / n, x0 = cx - 7.2 + 14.4 * u + lean * 0.4, x1 = cx - hw + skirt + 2 * hw * u;
        p.line(x0, yw, x1, hem - 0.5, 0.7, skI.d);
      }
      if (skI.plaid) for (let yy = Math.trunc(yw) + 2; yy < Math.trunc(hem); yy += 3) p.line(cx - hw, yy, cx + hw, yy, 0.6, skI.plaid);
      p.ell(cx + skirt, hem, hw + 0.3, 0.9, skI.d);
      if (dress) { p.rect(cx - hw + skirt, hem - 2.3, cx + hw + skirt, hem - 0.9, dress.collar); p.rect(cx - hw + skirt, hem - 0.9, cx + hw + skirt, hem - 0.1, dress.bow); }
    } else if (botI && ["pants", "legging", "shorts"].includes(botI.style)) {
      p.poly([[cx - 8.2, yw], [cx + 8.2, yw], [cx + 9.2, yh + 1.2], [cx + 4.5, yh + 4.5], [cx, yh + 3.4], [cx - 4.5, yh + 4.5], [cx - 9.2, yh + 1.2]], botI.c);
      p.line(cx, yh + 3.4, cx, yh + 6, 0.7, botI.d);
      p.rect(cx - 8.2, yw, cx + 8.2, yw + 1.1, botI.d);
    }
    this._torso(s, cx, top, lean, w, flare);
    return top;
  },
  _torso(s, cx, top, lean, w, flare, seated = false) {
    const p = this.p, dress = DRESSES[w.dress], ti = dress ? null : TOPS[w.top], tx = cx + lean * 0.5, lo = seated ? 11.5 : 15;
    p.rect(tx - 2.0, top - 4.5, tx + 2.0, top + 1.5, PAL.skin);
    p.ell(tx, top - 1.0, 2.2, 1.2, PAL.skin_d);
    const pts = [[tx - 7.8, top], [tx + 7.8, top], [tx + 8.8, top + 4.5], [tx + 7.6, top + 7.5], [tx + 6.4, top + 10.5], [tx + 7.8, top + lo * 0.82], [tx + 8.6, top + lo], [tx - 8.6, top + lo], [tx - 7.8, top + lo * 0.82], [tx - 6.4, top + 10.5], [tx - 7.6, top + 7.5], [tx - 8.8, top + 4.5]];
    const item = dress || ti, style = item ? item.style : "tee";
    let hemy = ({ tee: lo - 0.8, crop: 9.2, tank: lo - 0.8, hoodie: lo + 2, sweater: lo + 1, blouse: lo, jersey: lo + 1.5, jacket: lo, sailor: 10.8, sundress: 10.8 })[style];
    if (hemy === undefined) hemy = lo;
    if (seated) hemy = Math.min(hemy, lo + 2);
    const c = item.c, d = item.d, over = ["hoodie", "sweater", "jersey", "jacket"].includes(style) ? 1.2 : 0, gy = top + hemy;
    let garment = [[tx - 7.9 - over * 0.4, top], [tx + 7.9 + over * 0.4, top], [tx + 9.0 + over, top + 4.5], [tx + 7.9 + over * 0.6, top + 7.6], [tx + 6.6 + over * 0.2, top + Math.min(10.5, hemy)], [tx + 8.8 + over, gy], [tx - 8.8 - over, gy], [tx - 6.6 - over * 0.2, top + Math.min(10.5, hemy)], [tx - 7.9 - over * 0.6, top + 7.6], [tx - 9.0 - over, top + 4.5]];
    if (style === "crop") {
      p.poly(pts.slice(0, 3).concat([[tx + 6.4, top + 10.5], [tx - 6.4, top + 10.5]], pts.slice(-3)), PAL.skin);
      p.ell(tx, top + 8.8, 0.7, 0.5, PAL.skin_d);
    }
    if (style === "sailor" || style === "sundress") {
      garment = [[tx - 7.9, top], [tx + 7.9, top], [tx + 8.8, top + 4.5], [tx + 7.6, top + 7.6], [tx + 6.8, top + 10.8], [tx - 6.8, top + 10.8], [tx - 7.6, top + 7.6], [tx - 8.8, top + 4.5]];
      if (seated) garment = [[tx - 7.9, top], [tx + 7.9, top], [tx + 9.0, top + 7], [tx + 11.5, top + 15.5], [tx - 11.5, top + 15.5], [tx - 9.0, top + 7]];
    }
    p.poly(garment, c);
    p.ell(tx - 3.6, top + 7.2, 3.6, 1.5, d); p.ell(tx + 3.6, top + 7.2, 3.6, 1.5, d);
    p.ell(tx - 3.4, top + 5.0, 2.4, 1.5, lighter(c, 0.22)); p.ell(tx + 3.4, top + 5.0, 2.4, 1.5, lighter(c, 0.22));
    p.line(tx - 7.5, top + 9, tx - 6.4, top + 11.5, 0.9, d); p.line(tx + 7.5, top + 9, tx + 6.4, top + 11.5, 0.9, d);
    if (["tee", "tank", "blouse", "hoodie", "sweater", "jersey", "jacket"].includes(style)) p.rect(tx - 8.8 - over, gy - 1.1, tx + 8.8 + over, gy, d);
    if (style === "tee") {
      p.ell(tx, top + 0.6, 4.0, 2.8, PAL.skin); p.ell(tx, top + 1.0, 3.2, 2.0, PAL.skin);
      p.pl(Array.from({ length: 10 }, (_, k) => [tx - 4.2 + 8.4 * k / 9, top + 0.8 + 2.9 * sin(PI * k / 9)]), 0.9, d);
    } else if (style === "crop") {
      p.ell(tx, top + 0.6, 3.6, 2.4, PAL.skin); p.rect(tx - 7.6, top + 8.6, tx + 7.6, top + 9.4, d);
    } else if (style === "tank") {
      p.ell(tx, top + 1.0, 5.2, 4.0, PAL.skin); p.rect(tx - 7.9, top, tx - 5.2, top + 4, c); p.rect(tx + 5.2, top, tx + 7.9, top + 4, c);
    } else if (style === "hoodie") {
      p.ell(tx, top - 0.5, 8.0, 3.6, d); p.ell(tx, top + 0.2, 4.4, 2.6, PAL.skin);
      p.line(tx - 2.4, top + 2.2, tx - 2.8, top + 9, 0.9, item.trim); p.line(tx + 2.4, top + 2.2, tx + 2.8, top + 9, 0.9, item.trim);
      p.rect(tx - 5, gy - 4, tx + 5, gy - 3, d); p.line(tx - 5, gy - 3, tx - 6, gy, 0.8, d); p.line(tx + 5, gy - 3, tx + 6, gy, 0.8, d);
    } else if (style === "sweater") {
      p.ell(tx, top - 0.6, 5.2, 2.0, item.trim); p.ell(tx, top + 0.1, 3.4, 1.4, PAL.skin);
      for (let k = -3; k < 4; k++) p.line(tx + k * 2.4, top + 4, tx + k * 2.4, gy - 1.5, 0.5, d);
      p.rect(tx - 9.4, gy - 1.6, tx + 9.4, gy, item.trim);
    } else if (style === "blouse") {
      p.poly([[tx - 6.6, top], [tx - 1.2, top + 0.6], [tx - 3.4, top + 5.8]], "#ffffff");
      p.poly([[tx + 6.6, top], [tx + 1.2, top + 0.6], [tx + 3.4, top + 5.8]], "#ffffff");
      p.ell(tx, top + 0.3, 2.2, 1.4, PAL.skin); p.line(tx, top + 3, tx, gy - 1, 0.6, d);
      this._bow(tx, top + 5.8, item.bow, darker(item.bow, 0.2), 0.8);
    } else if (style === "jersey") {
      p.poly([[tx - 3.6, top], [tx + 3.6, top], [tx, top + 6]], PAL.skin);
      p.pl([[tx - 3.8, top], [tx, top + 6.2], [tx + 3.8, top]], 1.1, item.trim);
      p.rect(tx - 9.8, top + 8.2, tx + 9.8, top + 9.4, item.trim); p.rect(tx - 9.8, gy - 1.3, tx + 9.8, gy, item.trim);
    } else if (style === "jacket") {
      p.poly([[tx - 2.8, top], [tx + 2.8, top], [tx + 3.4, gy], [tx - 3.4, gy]], item.under);
      p.line(tx - 2.9, top, tx - 3.5, gy, 0.9, d); p.line(tx + 2.9, top, tx + 3.5, gy, 0.9, d);
      p.poly([[tx - 3, top - 0.5], [tx - 7.4, top + 0.5], [tx - 4, top + 4.4]], lighter(c, 0.1));
      p.poly([[tx + 3, top - 0.5], [tx + 7.4, top + 0.5], [tx + 4, top + 4.4]], lighter(c, 0.1));
      p.ell(tx - 5.4, top + 8.5, 1.9, 1.3, d); p.ell(tx + 5.4, top + 8.5, 1.9, 1.3, d);
    } else if (style === "sailor" || style === "sundress") {
      if (style === "sailor") {
        p.poly([[tx - 7.9, top - 0.6], [tx - 1.2, top - 0.2], [tx, top + 8.8], [tx - 9.4, top + 7.2]], item.collar);
        p.poly([[tx + 7.9, top - 0.6], [tx + 1.2, top - 0.2], [tx, top + 8.8], [tx + 9.4, top + 7.2]], item.collar);
        p.line(tx - 8.8, top + 6.6, tx - 0.6, top + 8.2, 0.8, item.bow); p.line(tx + 8.8, top + 6.6, tx + 0.6, top + 8.2, 0.8, item.bow);
        p.poly([[tx - 3.0, top + 0.4], [tx, top + 6.0], [tx + 3.0, top + 0.4]], PAL.skin); p.ell(tx, top - 0.3, 2.6, 1.0, PAL.skin);
      } else {
        p.ell(tx, top + 0.6, 4.8, 3.4, PAL.skin);
        p.line(tx - 5.0, top + 0.6, tx - 6.3, top + 5, 0.9, item.collar); p.line(tx + 5.0, top + 0.6, tx + 6.3, top + 5, 0.9, item.collar);
        p.rect(tx - 7.6, top + 9.6, tx + 7.6, top + 10.8, item.bow);
      }
      this._bow(tx, style === "sailor" ? top + 8.2 : top + 6.4, item.bow, item.bow_d, 1.0);
    }
    const acc = w.acc || [];
    if (acc.includes("choker")) { p.rect(tx - 2.3, top - 1.6, tx + 2.3, top - 0.3, "#2a2540"); p.dot(tx, top + 0.1, "#ff66b0", 0.8); }
    if (acc.includes("scarf")) {
      p.ell(tx, top - 0.2, 6.4, 2.6, "#ff8fc7"); p.ell(tx, top - 0.6, 5.0, 1.4, "#ffc4e3");
      p.poly([[tx + 2, top + 1], [tx + 6, top + 1], [tx + 5, top + 10], [tx + 1.5, top + 9]], "#e06aa8"); p.line(tx + 3, top + 6, tx + 5.6, top + 6, 0.8, "#ffffff");
    }
    if ((style === "sailor" || style === "sundress") && !seated) p.rect(tx - 7.2, top + 10.3, tx + 7.2, top + 11.1, d);
  },
  _bow(x, y, col, dcol, sc = 1) {
    const p = this.p;
    p.poly([[x - 5.2 * sc, y - 3.2 * sc], [x, y], [x - 5.6 * sc, y + 3.6 * sc], [x - 4 * sc, y + 0.2 * sc]], col);
    p.poly([[x + 5.2 * sc, y - 3.2 * sc], [x, y], [x + 5.6 * sc, y + 3.6 * sc], [x + 4 * sc, y + 0.2 * sc]], col);
    p.line(x - 4.6 * sc, y - 1.8 * sc, x - 1.0 * sc, y - 0.1 * sc, 0.7, lighter(col, 0.35));
    p.line(x + 4.6 * sc, y - 1.8 * sc, x + 1.0 * sc, y - 0.1 * sc, 0.7, lighter(col, 0.35));
    p.ell(x, y, 1.7 * sc, 1.7 * sc, dcol); p.dot(x - 0.4, y - 0.5, lighter(dcol, 0.4), 0.5);
    p.poly([[x - 1, y + 1], [x - 3 * sc, y + 5.8 * sc], [x - 0.6, y + 3.6 * sc]], dcol);
    p.poly([[x + 1, y + 1], [x + 3 * sc, y + 5.8 * sc], [x + 0.6, y + 3.6 * sc]], dcol);
  },
  hand_dot(h) {
    const p = this.p;
    p.ell(h[0], h[1], 2.3, 2.3, PAL.skin); p.ell(h[0] + 0.9, h[1] - 0.9, 1.0, 1.0, lighter(PAL.skin, 0.2)); p.dot(h[0] - 1.3, h[1] + 1.4, PAL.skin_d, 0.5);
  },
  draw_arms(s, cx, top, hands) {
    const p = this.p, w = this.W, item = DRESSES[w.dress] || TOPS[w.top] || {}, style = item.style || "tee";
    const longs = ["sailor", "hoodie", "sweater", "jersey", "jacket", "blouse"].includes(style), shorts = ["tee", "crop", "sundress"].includes(style), puffy = ["sailor", "blouse", "sundress"].includes(style);
    const c = item.c || "#5a5ad8", d = item.d || "#4343b0";
    const cuff = style === "sailor" ? (item.collar || item.trim || "#d4cfff") : (item.trim || d);
    const ys = top + 2.4;
    [[-1, hands[0]], [1, hands[1]]].forEach(([side, hand]) => {
      const sx = cx + side * 8.0, [hx, hy] = hand, dx = hx - sx, dy = hy - ys;
      const mx = sx + dx * 0.5 + side * 1.4, my = ys + dy * 0.5 + 0.8;
      p.taper([sx, ys], [mx, my], [hx, hy], 2.4, 1.7, PAL.skin);
      if (longs || shorts) {
        const f = longs ? 0.88 : 0.42, ex = sx + dx * f, ey = ys + dy * f;
        const mx2 = sx + dx * f * 0.5 + side * 1.2, my2 = ys + dy * f * 0.5 + 0.8;
        const r1 = puffy ? 3.7 : (longs ? 3.2 : 2.9);
        p.taper([sx, ys], [mx2, my2], [ex, ey], 3.1, !puffy ? r1 : 2.8, c);
        if (puffy) { p.ell(mx2, my2, 3.6, 3.4, c); p.ell(mx2 - side * 0.8, my2 - 0.8, 1.9, 1.4, lighter(c, 0.22)); p.ell(ex, ey, 3.0, 2.9, c); }
        if (longs) { p.ell(ex, ey, 2.7, 2.2, cuff); p.ell(ex, ey, 2.0, 1.5, darker(cuff, 0.12)); } else p.ell(ex, ey, 2.5, 2.0, d);
      } else p.ell(sx, ys, 2.6, 2.4, PAL.skin);
      p.ell(hx, hy, 2.3, 2.3, PAL.skin); p.ell(hx + 0.9, hy - 0.9, 1.0, 1.0, lighter(PAL.skin, 0.2)); p.dot(hx - 1.3, hy + 1.4, PAL.skin_d, 0.5);
    });
  },
};
