// tags.js - tiny tag reader: ID3v2 (mp3), MP4/M4A atoms, FLAC comments. Falls back to the file name.
const dec = (buf, enc) => {
  try {
    if (enc === 1) { const u = new Uint8Array(buf); const le = !(u[0] === 0xfe && u[1] === 0xff); return new TextDecoder(le ? "utf-16le" : "utf-16be").decode(u.subarray(2)); }
    if (enc === 2) return new TextDecoder("utf-16be").decode(buf);
    return new TextDecoder(enc === 3 ? "utf-8" : "iso-8859-1").decode(buf);
  } catch (e) { return ""; }
};
const clean = s => (s || "").replace(/\0+$/g, "").replace(/^﻿/, "").trim();
const syncsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];

function id3(b) {
  const out = {};
  if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return out;
  const ver = b[3], size = syncsafe(b, 6), flags = b[5];
  let o = 10; if (flags & 0x40) { o += ver === 4 ? syncsafe(b, o) : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]); }
  const end = Math.min(b.length, 10 + size), idl = ver === 2 ? 3 : 4, hl = ver === 2 ? 6 : 10;
  while (o + hl < end) {
    const id = String.fromCharCode(...b.subarray(o, o + idl));
    if (!/^[A-Z0-9]+$/.test(id)) break;
    const sz = ver === 2 ? (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5] : ver === 4 ? syncsafe(b, o + 4) : ((b[o + 4] << 24) | (b[o + 5] << 16) | (b[o + 6] << 8) | b[o + 7]);
    const d = b.subarray(o + hl, o + hl + sz); o += hl + sz;
    if (!sz) continue;
    const text = () => clean(dec(d.subarray(1), d[0]));
    if (id === "TIT2" || id === "TT2") out.title = text();
    else if (id === "TPE1" || id === "TP1") out.artist = text();
    else if (id === "TALB" || id === "TAL") out.album = text();
    else if (id === "TCON" || id === "TCO") out.genre = text().replace(/^\(\d+\)/, "");
    else if (id === "TYER" || id === "TDRC" || id === "TYE") out.year = parseInt(text().slice(0, 4)) || 0;
    else if (id === "TRCK" || id === "TRK") out.track = parseInt(text()) || 0;
    else if (id === "USLT" || id === "ULT") {
      const enc = d[0]; let p = 4; // skip lang
      const wide = enc === 1 || enc === 2; let q = p;
      while (q < d.length && !(d[q] === 0 && (!wide || d[q + 1] === 0))) q += wide ? 2 : 1;
      q += wide ? 2 : 1; out.lyrics = clean(dec(d.subarray(q), enc));
    } else if ((id === "APIC" || id === "PIC") && !out.cover) {
      const enc = d[0]; let p = 1;
      if (id === "APIC") { let q = p; while (q < d.length && d[q] !== 0) q++; var mime = String.fromCharCode(...d.subarray(p, q)); p = q + 1; } else { mime = "image/" + String.fromCharCode(...d.subarray(p, p + 3)).toLowerCase(); p += 3; }
      p += 1; // picture type
      const wide = enc === 1 || enc === 2;
      while (p < d.length && !(d[p] === 0 && (!wide || d[p + 1] === 0))) p += wide ? 2 : 1;
      p += wide ? 2 : 1;
      out.cover = new Blob([d.slice(p)], { type: mime && mime.includes("/") ? mime : "image/jpeg" });
    }
  }
  return out;
}

function mp4(b) {
  const out = {}, dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const atoms = (s, e, cb) => {
    let o = s;
    while (o + 8 <= e) {
      let sz = dv.getUint32(o), type = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]), hl = 8;
      if (sz === 1) { sz = dv.getUint32(o + 12); hl = 16; } else if (sz === 0) sz = e - o;
      if (sz < 8) break;
      cb(type, o + hl, Math.min(e, o + sz)); o += sz;
    }
  };
  atoms(0, b.length, (t, s, e) => {
    if (t !== "moov") return;
    atoms(s, e, (t2, s2, e2) => {
      if (t2 !== "udta") return;
      atoms(s2, e2, (t3, s3, e3) => {
        if (t3 !== "meta") return;
        atoms(s3 + 4, e3, (t4, s4, e4) => {
          if (t4 !== "ilst") return;
          atoms(s4, e4, (k, ks, ke) => {
            atoms(ks, ke, (t5, ds, de) => {
              if (t5 !== "data") return;
              const flag = dv.getUint32(ds) & 0xffffff, payload = b.subarray(ds + 8, de);
              const txt = () => clean(new TextDecoder().decode(payload));
              if (k === "©nam") out.title = txt(); else if (k === "©ART") out.artist = txt();
              else if (k === "©alb") out.album = txt(); else if (k === "©gen") out.genre = txt();
              else if (k === "©day") out.year = parseInt(txt().slice(0, 4)) || 0;
              else if (k === "covr") out.cover = new Blob([payload.slice()], { type: flag === 14 ? "image/png" : "image/jpeg" });
            });
          });
        });
      });
    });
  });
  return out;
}

function flac(b) {
  const out = {};
  if (String.fromCharCode(...b.subarray(0, 4)) !== "fLaC") return out;
  let o = 4;
  while (o + 4 < b.length) {
    const last = b[o] & 0x80, type = b[o] & 0x7f, len = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]; o += 4;
    if (type === 4) {
      const dv = new DataView(b.buffer, b.byteOffset + o, len); let p = 0; const vl = dv.getUint32(p, true); p += 4 + vl; const n = dv.getUint32(p, true); p += 4;
      for (let i = 0; i < n && p < len; i++) {
        const l = dv.getUint32(p, true); p += 4;
        const s = new TextDecoder().decode(b.subarray(o + p, o + p + l)); p += l;
        const [k, ...v] = s.split("="); const val = v.join("=").trim(), K = k.toUpperCase();
        if (K === "TITLE") out.title = val; else if (K === "ARTIST") out.artist = val; else if (K === "ALBUM") out.album = val;
        else if (K === "GENRE") out.genre = val; else if (K === "DATE") out.year = parseInt(val.slice(0, 4)) || 0; else if (K === "LYRICS") out.lyrics = val;
      }
    } else if (type === 6 && !out.cover) {
      const dv = new DataView(b.buffer, b.byteOffset + o, len); let p = 4; const ml = dv.getUint32(p); p += 4;
      const mime = String.fromCharCode(...b.subarray(o + p, o + p + ml)); p += ml; const dl = dv.getUint32(p); p += 4 + dl + 16; const pl = dv.getUint32(p); p += 4;
      out.cover = new Blob([b.slice(o + p, o + p + pl)], { type: mime || "image/jpeg" });
    }
    o += len; if (last) break;
  }
  return out;
}

export async function readTags(file) {
  let t = {};
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const size = syncsafe(head, 6) + 10;
      t = id3(new Uint8Array(await file.slice(0, Math.min(file.size, size)).arrayBuffer()));
    } else if (String.fromCharCode(...head.subarray(4, 8)) === "ftyp") {
      t = mp4(new Uint8Array(await file.slice(0, Math.min(file.size, 6e6)).arrayBuffer()));
      if (!t.title) t = mp4(new Uint8Array(await file.slice(Math.max(0, file.size - 6e6)).arrayBuffer()));
    } else if (String.fromCharCode(...head.subarray(0, 4)) === "fLaC") {
      t = flac(new Uint8Array(await file.slice(0, Math.min(file.size, 4e6)).arrayBuffer()));
    }
  } catch (e) { /* fall back to the file name */ }
  const base = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ").trim();
  if (!t.title) {
    const m = base.match(/^(.+?)\s+-\s+(.+)$/);
    if (m) { t.artist = t.artist || m[1].trim(); t.title = m[2].trim(); } else t.title = base.replace(/^\d+[\s.\-]+/, "") || base;
  }
  t.artist = t.artist || "Unknown artist"; t.album = t.album || "Unknown album"; t.genre = t.genre || "";
  return t;
}
