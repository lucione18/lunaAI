// scene.js - puts the room, body and face together (port of Scene.render)
import { Pix, GW, GH, SCALE, FY, DESK_X, CENTER, mix } from "./pix.js";
import { PAL, g, SceneRoom } from "./scene1.js";
import { SceneFace } from "./scene2.js";
import { Body } from "./body.js";
import { SceneExtras } from "./scene3.js";
import { cleanWear, makeWear, HAIR } from "./wear.js";
const sin = Math.sin;
export const FACE_POSES = ["ears", "cupear", "blush", "cry", "fan", "call", "snack", "sing", "held", "wave", "twirl", "stumble"];
const OLD = ["sailor", "sunshine", "cherry", "mint", "lilac", "hoodie", "pajamas"];

export class Scene {
  constructor() { this.p = new Pix(GW, GH, SCALE); this.head = [GW >> 1, 30]; this.W = makeWear("sailor"); }
  render(s) {
    const p = this.p;
    this.W = s.wear ? cleanWear(s.wear) : makeWear(OLD.includes(s.outfit) ? s.outfit : "sailor");
    [PAL.hair, PAL.hair_d, PAL.hair_l] = HAIR[this.W.hair] || HAIR.pink;
    let pose = s.pose;
    this.room(s); this.tv(s); this.snack_table(s);
    if (pose === "bed") {
      this.drawPet(s); this.sleep(s); this.sparkles(s); p.dim(0.66); return p;
    }
    this.bed(s, false);
    const atDesk = pose === "laptop" && Math.abs(s.cx - DESK_X) < 2.5 && s.sit > 0.5;
    if (!atDesk) this.desk(s, false);
    this.drawPet(s);
    const lift = g(s, "lift", 0), lean = g(s, "lean", 0), look = g(s, "look", [0, 0]);
    p.ell(s.cx, FY, 13 - s.bounce * 2 - lift * 0.15, 2.2, PAL.shadow);
    if (s.sit > 0.5 && ["sit", "game", "read", "phone", "stumble"].includes(pose)) { p.ell(s.cx, 92.5, 19, 4.6, "#c24a90"); p.ell(s.cx, 91.8, 18, 4, "#ff7cb8"); }
    let oy = -s.bounce * s.amp + sin(s.t * 2.2) * 0.5;
    let sway = s.moving ? sin(s.t * s.sw) * s.sway : sin(s.t * 1.2) * 0.8;
    if (pose === "shiver") sway += sin(s.t * 46) * 1.4;
    if (pose === "laugh") oy -= Math.abs(sin(s.t * 16)) * 1.4;
    const hx = s.cx + sway * 0.35 + lean + look[0] * 0.9 + (pose === "cupear" ? 2 : 0);
    const hy = 49 + 9 * s.sit + oy - lift + look[1] * 0.5, bo = oy * 0.5;
    if (pose === "umbrella") p.line(hx, hy - 22, s.cx + 2, 71 + bo, 1.4, "#c02a7a");
    const top = this.draw_body(s, s.cx, bo, sway, lift, lean);
    const hands = this.hand_pos(s, s.cx, hx, hy, top, bo), face = FACE_POSES.includes(pose);
    if (!face) this.draw_arms(s, s.cx, top, hands);
    this.draw_head(s, hx, hy, sway, lift);
    if (face) this.draw_arms(s, s.cx, top, hands);
    this.items(s, hx, hy, s.cx, top, hands);
    if (atDesk) {
      this.desk(s, true);
      for (const [side, y] of [[-1, 83 - Math.abs(sin(s.t * 14))], [1, 83 - Math.abs(Math.cos(s.t * 11))]]) this.hand_dot([s.cx + side * 14, y]);
    }
    if (pose === "game" && s.sit > 0.5) this.controller(s, s.cx);
    this.sparkles(s);
    return p;
  }
}
Object.assign(Scene.prototype, SceneRoom, SceneFace, Body, SceneExtras);
export { PAL };
