// wear.js - Luna's wardrobe (port of luna_wear.py)
export const TOPS = {
  "white tee": { style: "tee", c: "#f4f1ff", d: "#cfc8ea" },
  "pink tee": { style: "tee", c: "#ff8fc7", d: "#e06aa8" },
  "black tee": { style: "tee", c: "#3a3550", d: "#26223a" },
  "crop top": { style: "crop", c: "#ff74b8", d: "#d9529a" },
  "tank top": { style: "tank", c: "#7be0c8", d: "#4fb8a0" },
  "hoodie": { style: "hoodie", c: "#7a5af0", d: "#5a3ed0", trim: "#f3e8ff" },
  "pink hoodie": { style: "hoodie", c: "#ff8fc7", d: "#e06aa8", trim: "#ffffff" },
  "sweater": { style: "sweater", c: "#f6e4cf", d: "#d9c3a6", trim: "#e8cfae" },
  "blouse": { style: "blouse", c: "#ffffff", d: "#d9d4ee", bow: "#ff66b0" },
  "jersey": { style: "jersey", c: "#3f6ad8", d: "#2d4fb0", trim: "#ffffff" },
  "denim jacket": { style: "jacket", c: "#4a78c0", d: "#35599a", under: "#ffffff" },
  "cardigan": { style: "jacket", c: "#ffc4e3", d: "#e69cc4", under: "#f4f1ff" },
};
export const BOTTOMS = {
  "jeans": { style: "pants", c: "#3f5fa8", d: "#2d4580", seam: "#8aa6e8" },
  "black jeans": { style: "pants", c: "#2e2a44", d: "#1f1c33", seam: "#6a6490" },
  "cargo pants": { style: "pants", c: "#6f8a5a", d: "#52693f", seam: "#9ab284" },
  "joggers": { style: "pants", c: "#8a8fa8", d: "#686c86", seam: "#c8ccdf", cuff: true },
  "leggings": { style: "legging", c: "#2a2540", d: "#1b1730", seam: "#4a4470" },
  "denim shorts": { style: "shorts", c: "#4f74c0", d: "#3a5a9c", seam: "#9ab6f0" },
  "white shorts": { style: "shorts", c: "#f4f1ff", d: "#cfc8ea", seam: "#ffffff" },
  "mini skirt": { style: "skirt", c: "#2e2a44", d: "#1f1c33", length: 7 },
  "pleated skirt": { style: "skirt", c: "#ff8fc7", d: "#e06aa8", length: 9, pleats: true },
  "tennis skirt": { style: "skirt", c: "#ffffff", d: "#cfc8ea", length: 7, pleats: true },
  "plaid skirt": { style: "skirt", c: "#c23a5a", d: "#8f2a45", length: 9, pleats: true, plaid: "#f4d0d8" },
};
export const DRESSES = {
  "sailor dress": { style: "sailor", c: "#5a5ad8", d: "#4343b0", collar: "#d4cfff", bow: "#ff66b0", bow_d: "#d8408a" },
  "sundress": { style: "sundress", c: "#ffcf4d", d: "#e0a82a", collar: "#fff4c9", bow: "#ff4f6d", bow_d: "#c8304d" },
  "cherry dress": { style: "sundress", c: "#e8486f", d: "#b82f52", collar: "#ffe3ec", bow: "#ffffff", bow_d: "#d4cfff" },
  "mint dress": { style: "sailor", c: "#3fc8a4", d: "#2a9c7e", collar: "#e0fff5", bow: "#ff9fd3", bow_d: "#d86aa8" },
  "lilac dress": { style: "sundress", c: "#b79bff", d: "#8d70dc", collar: "#f3e8ff", bow: "#ff9fd3", bow_d: "#d86aa8" },
  "santa dress": { style: "sundress", c: "#d8303c", d: "#a82030", collar: "#ffffff", bow: "#2f9c5a", bow_d: "#1f7a42" },
  "witch dress": { style: "sundress", c: "#3a2a5a", d: "#2a1c44", collar: "#ff9a2a", bow: "#ff9a2a", bow_d: "#c8701a" },
  "valentine dress": { style: "sailor", c: "#ff5a8a", d: "#d8386a", collar: "#ffe3ec", bow: "#ffffff", bow_d: "#ffc4d8" },
};
export const SHOES = {
  "sneakers": { c: "#ffffff", d: "#cfc8ea", lace: "#ff66b0" },
  "pink sneakers": { c: "#ff8fc7", d: "#d9529a", lace: "#ffffff" },
  "boots": { c: "#6a4a3a", d: "#4a3228", tall: true },
  "flats": { c: "#2e2a44", d: "#1f1c33" },
  "loafers": { c: "#8a4a3a", d: "#633226" },
  "slippers": { c: "#ffc4e3", d: "#e69cc4", fluffy: true },
  "strap shoes": { c: "#ff6fb0", d: "#d84a90" },
};
export const SOCKS = {
  "none": null,
  "white socks": { c: "#ffffff", d: "#cfc8ea", h: 3 },
  "pink socks": { c: "#ff9fd3", d: "#d86aa8", h: 3 },
  "knee socks": { c: "#f4f1ff", d: "#cfc8ea", h: 7 },
  "thigh highs": { c: "#2a2540", d: "#1b1730", h: 12 },
};
export const ACCESSORIES = ["glasses", "beanie", "cat ears", "bow", "scarf", "choker", "headphones", "santa hat", "witch hat", "flower crown"];
export const HAIR = {
  pink: ["#ff6ab8", "#e24a9c", "#ff9fd3"], blue: ["#5aa8ff", "#3a7ad8", "#9fcfff"],
  purple: ["#a672ff", "#7a4ad8", "#cfaaff"], mint: ["#4fe0b4", "#2fb08a", "#9ff5d6"],
  blonde: ["#ffd45a", "#e0a82a", "#ffeb9f"], silver: ["#d6dcf0", "#a4abc8", "#f4f6ff"],
  red: ["#ff4f5a", "#c8303c", "#ff9fa6"], orange: ["#ff9a4a", "#d8702a", "#ffc994"],
  black: ["#3a3552", "#242038", "#6a6490"],
};
export const STYLES = ["twin tails", "short twin tails", "ponytail", "bob"];
export const PRESETS = {
  sailor: { dress: "sailor dress", shoes: "strap shoes", socks: "white socks" },
  sunshine: { dress: "sundress", shoes: "flats", socks: "none" },
  cherry: { dress: "cherry dress", shoes: "strap shoes", socks: "white socks" },
  mint: { dress: "mint dress", shoes: "sneakers", socks: "none" },
  lilac: { dress: "lilac dress", shoes: "flats", socks: "knee socks" },
  hoodie: { top: "hoodie", bottom: "joggers", shoes: "sneakers", socks: "none" },
  streetwear: { top: "pink hoodie", bottom: "black jeans", shoes: "boots", socks: "none" },
  casual: { top: "white tee", bottom: "jeans", shoes: "sneakers", socks: "none" },
  summer: { top: "tank top", bottom: "denim shorts", shoes: "pink sneakers", socks: "white socks" },
  denim: { top: "denim jacket", bottom: "plaid skirt", shoes: "boots", socks: "thigh highs" },
  sporty: { top: "jersey", bottom: "tennis skirt", shoes: "sneakers", socks: "knee socks" },
  cozy: { top: "sweater", bottom: "leggings", shoes: "slippers", socks: "none" },
  school: { top: "blouse", bottom: "pleated skirt", shoes: "loafers", socks: "knee socks" },
  cute: { top: "crop top", bottom: "mini skirt", shoes: "pink sneakers", socks: "thigh highs" },
  pajamas: { top: "cardigan", bottom: "leggings", shoes: "slippers", socks: "none" },
  christmas: { dress: "santa dress", shoes: "boots", socks: "thigh highs", acc: ["santa hat"] },
  halloween: { dress: "witch dress", shoes: "boots", socks: "thigh highs", acc: ["witch hat"] },
  valentine: { dress: "valentine dress", shoes: "strap shoes", socks: "white socks", acc: ["bow"] },
};
export const DEFAULT_WEAR = { top: "white tee", bottom: "jeans", dress: "sailor dress", shoes: "strap shoes", socks: "white socks", acc: ["headphones"] };

export function makeWear(preset = "sailor", acc = null, keep = null) {
  const w = { ...DEFAULT_WEAR };
  w.hair = "pink"; w.style = "twin tails";
  if (keep) { w.hair = keep.hair || "pink"; w.style = keep.style || "twin tails"; }
  w.acc = [...(acc || ["headphones"])];
  const pr = PRESETS[preset] || PRESETS.sailor;
  for (const a of pr.acc || []) if (!w.acc.includes(a)) w.acc.push(a);
  w.dress = pr.dress || null;
  if (!w.dress) { w.top = pr.top; w.bottom = pr.bottom; } else { w.top = DEFAULT_WEAR.top; w.bottom = DEFAULT_WEAR.bottom; }
  w.shoes = pr.shoes || "sneakers"; w.socks = pr.socks || "none";
  return w;
}
export function cleanWear(w) {
  const out = makeWear("sailor");
  if (!w || typeof w !== "object") return out;
  for (const [k, t] of [["top", TOPS], ["bottom", BOTTOMS], ["shoes", SHOES], ["socks", SOCKS]]) if (w[k] in t) out[k] = w[k];
  out.hair = w.hair in HAIR ? w.hair : "pink";
  out.style = STYLES.includes(w.style) ? w.style : "twin tails";
  out.dress = w.dress in DRESSES ? w.dress : null;
  out.acc = (w.acc || ["headphones"]).filter(a => ACCESSORIES.includes(a));
  return out;
}
export function findItem(text) {
  const t = text.toLowerCase().trim();
  let best = null;
  for (const [slot, table] of [["top", TOPS], ["bottom", BOTTOMS], ["dress", DRESSES], ["shoes", SHOES], ["socks", SOCKS]])
    for (const name of Object.keys(table)) if (name !== "none" && t.includes(name) && (!best || name.length > best[1].length)) best = [slot, name];
  for (const a of ACCESSORIES) if (t.includes(a) && (!best || a.length > best[1].length)) best = ["acc", a];
  for (const h of Object.keys(HAIR))
    if (new RegExp(`\\b${h}\\s+hair\\b|\\bhair\\s+${h}\\b|\\bdye\\b.*\\b${h}\\b`).test(t) && (!best || h.length + 5 > best[1].length)) best = ["hair", h];
  for (const st of STYLES) if (t.includes(st) || (st === "twin tails" && t.includes("pigtails"))) best = ["style", st];
  return best;
}
export const SEASON_THEME = { christmas: "christmas", halloween: "halloween", valentine: "sakura", spring: "sakura", summer: "summer", autumn: "autumn", winter: "winter" };
export const HOLIDAY_OUTFIT = { christmas: "christmas", halloween: "halloween", valentine: "valentine" };
export const HOLIDAY_LINE = {
  christmas: "It's Christmas season! I put on my santa outfit. Jingle jingle~",
  halloween: "Happy Halloween season! Do you like my witch outfit?",
  valentine: "Happy Valentine's! I wore something pink for you.",
};
export function seasonName(d = new Date(), south = true) {
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day <= 27) return "christmas";
  if ((m === 10 && day >= 17) || (m === 11 && day === 1)) return "halloween";
  if (m === 2 && day >= 8 && day <= 15) return "valentine";
  const north = { 12: "winter", 1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring", 6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn", 11: "autumn" }[m];
  if (south) return { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" }[north];
  return north;
}
