// pix.js - Luna's pixel surface (a faithful port of the Python Pix class)
export const GW = 190, GH = 110, SCALE = 2, FY = 96;
export const DESK_X = 164, GAME_X = 54, CENTER = 94, BED_X0 = 72, BED_X1 = 116, SLEEP_X = 87, SNACK_X = 122;

export const SPRITES = {
  drop: [".#.", "###", "###", ".#."],
  vein: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  cross: ["#.#", ".#.", "#.#"],
  spark: ["..#..", "..#..", "#####", "..#..", "..#.."],
  small: [".#.", "###", ".#."],
  heart: [".#.#.", "#####", "#####", ".###.", "..#.."],
  note: ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."],
  z: ["####", "..#.", ".#..", "####"],
};

const _cache = new Map();
export function C(h) {
  let v = _cache.get(h);
  if (!v) { v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; _cache.set(h, v); }
  return v;
}
export function mix(c1, c2, t) {
  const a = C(c1), b = C(c2), r = [0, 1, 2].map(i => Math.trunc(a[i] + (b[i] - a[i]) * t));
  return "#" + r.map(x => x.toString(16).padStart(2, "0")).join("");
}
export const pmod = (a, b) => ((a % b) + b) % b;
export function pyRound(x) {           // Python's banker's rounding
  const f = Math.floor(x), d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}
export function linspace(a, b, n) {
  const o = []; for (let i = 0; i < n; i++) o.push(a + (b - a) * i / (n - 1)); return o;
}
export const rad = d => d * Math.PI / 180;
export function tri(u, len) { return len - Math.abs(pmod(u, 2 * len) - len); }

export class Pix {
  constructor(w, h, S = 1) {
    this.S = S; this.w = w * S; this.h = h * S;
    this.a = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 3; i < this.a.length; i += 4) this.a[i] = 255;
  }
  fill(col) {
    const c = C(col), a = this.a;
    for (let i = 0; i < a.length; i += 4) { a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
  }
  dim(f) {
    const a = this.a, ff = Math.fround(f);
    for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) a[i + k] = Math.floor(Math.fround(a[i + k] * ff));
  }
  _win(x0, y0, x1, y1) {
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w, Math.ceil(x1)); y1 = Math.min(this.h, Math.ceil(y1));
    if (x1 <= x0 || y1 <= y0) return null;
    return [x0, y0, x1, y1];
  }
  _rect(x0, y0, x1, y1, col) {
    x0 = Math.max(0, pyRound(x0)); y0 = Math.max(0, pyRound(y0));
    x1 = Math.min(this.w, pyRound(x1)); y1 = Math.min(this.h, pyRound(y1));
    if (x1 > x0 && y1 > y0) {
      const c = C(col), a = this.a, W = this.w;
      for (let y = y0; y < y1; y++) for (let x = x0, i = (y * W + x0) * 4; x < x1; x++, i += 4) { a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
    }
  }
  _ell(cx, cy, rx, ry, col) {
    rx = Math.max(rx, 0.6); ry = Math.max(ry, 0.6);
    const w = this._win(cx - rx, cy - ry, cx + rx + 1, cy + ry + 1); if (!w) return;
    const [x0, y0, x1, y1] = w, c = C(col), a = this.a, W = this.w;
    for (let y = y0; y < y1; y++) {
      const dy = ((y + 0.5) - cy) / ry, dy2 = dy * dy;
      for (let x = x0; x < x1; x++) {
        const dx = ((x + 0.5) - cx) / rx;
        if (dx * dx + dy2 <= 1) { const i = (y * W + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
      }
    }
  }
  _line(x0, y0, x1, y1, wd, col) {
    const r = Math.max(wd, 1.0) / 2.0;
    const w = this._win(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r + 1, Math.max(y0, y1) + r + 1); if (!w) return;
    const [ax, ay, bx, by] = w, c = C(col), a = this.a, W = this.w;
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) {
      const X = x + 0.5, Y = y + 0.5;
      let t = l2 === 0 ? 0 : ((X - x0) * dx + (Y - y0) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = X - x0 - t * dx, ey = Y - y0 - t * dy;
      if (ex * ex + ey * ey <= r * r) { const i = (y * W + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
    }
  }
  _poly(pts, col) {
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (const q of pts) { mnx = Math.min(mnx, q[0]); mxx = Math.max(mxx, q[0]); mny = Math.min(mny, q[1]); mxy = Math.max(mxy, q[1]); }
    const w = this._win(mnx, mny, mxx + 1, mxy + 1); if (!w) return;
    const [x0, y0, x1, y1] = w, c = C(col), a = this.a, W = this.w, n = pts.length;
    for (let y = y0; y < y1; y++) {
      const Y = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
        if (ay === by) continue;
        if ((ay <= Y && Y < by) || (by <= Y && Y < ay)) xs.push(ax + (Y - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const s = Math.max(x0, Math.ceil(xs[k] - 0.5)), e = Math.min(x1, Math.ceil(xs[k + 1] - 0.5));
        for (let x = s; x < e; x++) { const i = (y * W + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
      }
    }
  }
  // ---- logical coordinates
  px(x, y, col) { const S = this.S; x = Math.trunc(x); y = Math.trunc(y); this._rect(x * S, y * S, (x + 1) * S, (y + 1) * S, col); }
  dot(x, y, col, r = 0.5) { this._ell(x * this.S, y * this.S, r * this.S, r * this.S, col); }
  rect(x0, y0, x1, y1, col) { const S = this.S; this._rect(Math.trunc(x0 * S), Math.trunc(y0 * S), Math.trunc(x1 * S), Math.trunc(y1 * S), col); }
  frect(x0, y0, x1, y1, col) { const S = this.S; this._rect(x0 * S, y0 * S, x1 * S, y1 * S, col); }
  ell(cx, cy, rx, ry, col) { const S = this.S; this._ell(cx * S, cy * S, rx * S, ry * S, col); }
  line(x0, y0, x1, y1, wd, col) { const S = this.S; this._line(x0 * S, y0 * S, x1 * S, y1 * S, wd * S, col); }
  pl(pts, wd, col) { for (let i = 0; i < pts.length - 1; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wd, col); }
  poly(pts, col) { const S = this.S; this._poly(pts.map(q => [q[0] * S, q[1] * S]), col); }
  taper(p0, p1, p2, r0, r1, col, n = 34) {
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
      const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
      const r = r0 + (r1 - r0) * Math.pow(t, 0.7);
      this.ell(x, y, r, r * 1.15, col);
    }
  }
  spr(cx, cy, name, col) {
    const rows = SPRITES[name], x0 = Math.trunc(cx - rows[0].length / 2), y0 = Math.trunc(cy - rows.length / 2);
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") this.px(x0 + i, y0 + j, col); });
  }
}
