(function () {
  'use strict';

  var root = document.querySelector('.root');
  if (!root) return;

  var mode = document.body.getAttribute('data-page') === 'home' ? 'home' : 'horizon';

  var el = {
    root: root,
    meadow: root.querySelector('.meadow'),
    fall: root.querySelector('.fall'),
    wmBox: root.querySelector('.wordmark'),
    wm: root.querySelector('.wordmark canvas'),
    wmBtn: root.querySelector('.wordmark button'),
    nav: root.querySelector('.nav'),
    homeText: root.querySelector('.home h1'),
    latest: root.querySelector('.latest'),
    foot: root.querySelector('.foot'),
    page: root.querySelector('.page, .post')
  };

  var G = {
    g: [2, ['.###', '#..#', '#..#', '#..#', '.###', '...#', '###.']],
    l: [0, ['##.', '.#.', '.#.', '.#.', '.#.', '.#.', '.##']],
    o: [2, ['.##.', '#..#', '#..#', '#..#', '.##.']],
    c: [2, ['.###', '#...', '#...', '#...', '.###']],
    e: [2, ['.##.', '#..#', '####', '#...', '.###']],
    a: [2, ['.##.', '...#', '.###', '#..#', '.###']],
    n: [2, ['###.', '#..#', '#..#', '#..#', '#..#']]
  };

  var types = {
    five: { k: 5, pet: 0.62, bk: 0, cw: 'white', leaf: true, ld: 1, rot: 1.04, cx: 0.44, bx: 0.58, R: 0.3 },
    thirteen: { k: 13, pet: 0.8, bk: 13, cw: 'white', leaf: false, ld: 1, rot: 0.2, cx: 0.46, bx: 0.6, R: 0.33 },
    six: { k: 6, pet: 0.7, bk: 6, cw: 'lav', leaf: true, ld: -1, rot: 0.5, cx: 0.43, bx: 0.55, R: 0.31 }
  };

  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var base = ['#1f1a24', null, null, null, null, '#a9b8ac', '#4f6356', '#4f6356', '#6b7d71'];
  function mk(petal, throat, outline, back) {
    return base.map(function (c, i) { return rgb([null, petal, throat, outline, back][i] || c); });
  }
  var pal = { white: mk('#ebe7f0', '#c4b5e3', '#9d8cc4', '#5d5077'), lav: mk('#c4b5e3', '#9d8cc4', '#7d6c8f', '#ebe7f0') };
  var petalHex = { white: ['#ebe7f0', '#c4b5e3', '#9d8cc4'], lav: ['#c4b5e3', '#9d8cc4', '#7d6c8f'] };
  var ink = rgb('#ebe7f0');
  var cnt = new Int8Array(12);

  var falls = [], meadow = [], mKey = '', last = 0, panic = 0, nextGlance = 0;

  function assign(a, b) { for (var k in b) a[k] = b[k]; return a; }
  function hash(x, s) { var v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); }

  function text(str, scale) {
    var cols = [], x = 0, slot = -1;
    str.split('').forEach(function (ch) {
      if (ch === 'o') { slot = x; x += 8 * scale; return; }
      var top = G[ch][0], rows = G[ch][1], w = rows[0].length;
      rows.forEach(function (row, rr) {
        row.split('').forEach(function (c, cc) { if (c === '#') cols.push([x + cc * scale, (top + rr) * scale]); });
      });
      x += (w + 1) * scale;
    });
    var w = x - scale, h = 9 * scale, buf = new Uint8Array(w * h);
    cols.forEach(function (p) {
      for (var dy = 0; dy < scale; dy++) for (var dx = 0; dx < scale; dx++) buf[(p[1] + dy) * w + p[0] + dx] = 1;
    });
    return { w: w, h: h, ink: buf, slot: slot };
  }

  var wm = text('glocean', 2);
  var wmF = assign(assign({}, types.five), { N: 16, cx: 0.5, cy: 0.55, R: 0.42, stem: false, leaf: false, noOutline: true, ph: 0, pg: [0, 0, 0, 0, 0], def: null, tgt: null, until: 0 });

  function buildF(f, t) {
    var ez = function (x) { return x * x * (3 - 2 * x); };
    var open = 0.93 + 0.07 * Math.sin(t / 3200 + f.ph);
    var sh = panic > t ? Math.round((Math.random() - 0.5) * 2.4) / f.N : 0;
    var F = {
      k: f.k, pet: f.pet, R: f.R * open, rot: f.rot, hx: f.cx + sh, hy: f.cy, tilt: 0.92, cr: 0.2, tr: 0.42,
      bk: f.bk, bs: 0.94, ow: f.noOutline ? 0 : 1.1 / f.N, stem: f.stem !== false, bx: f.bx,
      sw: Math.max(0.6 / f.N, 0.022), leaf: f.leaf, gn: 1
    };
    F.g = f.pg.map(function (p) { return p ? ez(Math.max(0, Math.min(1, (t - p - 5000) / 3000))) : 1; });
    f.pg = f.pg.map(function (p, i) { return F.g[i] >= 1 ? 0 : p; });
    if (F.leaf) {
      var s = 0.58, la = f.ld > 0 ? -0.8 : Math.PI + 0.8, big = f.N < 32;
      F.lx = F.bx + (F.hx - F.bx) * Math.pow(1 - s, 1.6);
      F.ly = F.hy + s * (1.05 - F.hy);
      F.lc = Math.cos(la); F.ls = Math.sin(la);
      F.ll = big ? 0.3 : 0.24; F.lw = big ? 0.08 : 0.06;
    }
    return F;
  }

  function samp(F, u, v) {
    var dx = u - F.hx, dy = (v - F.hy) / F.tilt, d = Math.hypot(dx, dy);
    if (d < F.R * 1.02) {
      if (d < F.R * F.cr) return 5;
      var th = Math.atan2(dy, dx), a = F.k * (th + F.rot) / 2, rc = F.R * F.cr;
      var e = F.R * (1 - F.pet + F.pet * Math.sqrt(Math.abs(Math.cos(a))));
      var n = ((Math.round(a / Math.PI) % F.k) + F.k) % F.k;
      e = rc + (e - rc) * F.g[n] * F.gn;
      if (d <= e) return d > e - F.ow ? 3 : d < F.R * F.tr ? 2 : 1;
      if (F.bk) {
        var eb = F.R * F.bs * (1 - F.pet + F.pet * Math.sqrt(Math.abs(Math.cos(F.bk * (th + F.rot + Math.PI / F.bk) / 2))));
        if (d <= rc + (eb - rc) * F.gn) return 4;
      }
    }
    if (F.stem && v > F.hy) {
      var s = (v - F.hy) / (1.05 - F.hy), sx = F.bx + (F.hx - F.bx) * Math.pow(Math.max(0, 1 - s), 1.6);
      if (Math.abs(u - sx) < F.sw) return 7;
    }
    if (F.leaf) {
      var lx = u - F.lx, ly = v - F.ly, al = lx * F.lc + ly * F.ls, ac = -lx * F.ls + ly * F.lc;
      if (al > 0 && al < F.ll && Math.abs(ac) < F.lw * Math.sin(Math.PI * al / F.ll)) return 8;
    }
    return 0;
  }

  function ssPix(F, ss, size) {
    return function (px, py) {
      cnt.fill(0);
      for (var sy = 0; sy < ss; sy++) for (var sx = 0; sx < ss; sx++) cnt[samp(F, (px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size)]++;
      var b = 0, bc = cnt[0];
      for (var i = 1; i < cnt.length; i++) if (cnt[i] > bc || (cnt[i] === bc && b === 0 && cnt[i] > 0)) { b = i; bc = cnt[i]; }
      return b;
    };
  }

  function fIdx(f, lx, ly) {
    var i = f.pix(lx, ly);
    return i === 5 && f.cur && lx === f.cur.c && (ly === f.cur.r || ly === f.cur.r + 1) ? 6 : i;
  }

  var NEIGH = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];

  function eye(f, F) {
    var N = f.N, pix = f.pix, memo = new Map();
    var ok = function (c, r) {
      var k = c * 512 + r;
      if (!memo.has(k)) memo.set(k, pix(c, r) === 5 || pix(c, r + 1) === 5);
      return memo.get(k);
    };
    var c0 = Math.round(F.hx * N) - 1, r0 = Math.round(F.hy * N) - 1;
    if (!ok(c0, r0)) {
      var found = false;
      for (var i = 0; i < NEIGH.length; i++) {
        if (ok(c0 + NEIGH[i][0], r0 + NEIGH[i][1])) { c0 += NEIGH[i][0]; r0 += NEIGH[i][1]; found = true; break; }
      }
      if (!found) { f.cur = null; return; }
    }
    var c = c0, r = r0, g = f.tgt;
    if (g) {
      if (g.y && ok(c0, r0 + g.y)) r = r0 + g.y;
      if (g.x) for (var k = 1; k <= 3; k++) { if (ok(c0 + g.x * k, r)) c = c0 + g.x * k; else break; }
    }
    if (!f.cur || !ok(f.cur.c, f.cur.r)) { f.cur = { c: c, r: r }; return; }
    var nc = f.cur.c + Math.sign(c - f.cur.c), nr = f.cur.r + Math.sign(r - f.cur.r);
    f.cur = ok(nc, nr) ? { c: nc, r: nr } : { c: c, r: r };
  }

  function lookers() { return [wmF].concat(meadow); }

  function lookAt(f, x, y, at, dur) {
    var dx = x - f.sx, dy = y - f.sy, d = Math.hypot(dx, dy) || 1;
    var q = function (v) { return Math.abs(v) > 0.38 ? Math.sign(v) : 0; };
    f.pend = { at: at, tgt: { x: q(dx / d), y: q(dy / d) }, until: at + dur };
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function gaze(t) {
    var all = lookers();
    all.forEach(function (f) {
      if (f.pend && t >= f.pend.at) { f.tgt = f.pend.tgt; f.until = f.pend.until; f.pend = null; }
      if (f.until && t > f.until) { f.tgt = f.def; f.until = 0; }
    });
    if (panic > t) {
      all.forEach(function (f) {
        if (f.sx == null || t < (f.pnext || 0)) return;
        var o = pick(NEIGH);
        f.pend = null; f.tgt = { x: o[0], y: o[1] };
        f.until = panic + 300 + Math.random() * 500;
        f.pnext = t + 110 + Math.random() * 240;
      });
      return;
    }
    if (!nextGlance) nextGlance = t + 5000 + Math.random() * 5000;
    if (t < nextGlance) return;
    nextGlance = t + 11000 + Math.random() * 14000;
    var seen = all.filter(function (f) { return f.sx != null; });
    var free = seen.filter(function (f) { return !f.until && !f.pend; });
    if (!free.length) return;
    var f = pick(free);
    var near = seen.filter(function (o) { return o !== f && Math.abs(o.sx - f.sx) < 400; });
    if (near.length && Math.random() < 0.75) {
      var o = pick(near);
      lookAt(f, o.sx, o.sy, t, 1800 + Math.random() * 1500);
      if (!o.until && !o.pend && Math.random() < 0.4) lookAt(o, f.sx, f.sy, t + 600 + Math.random() * 500, 1500 + Math.random() * 800);
    } else {
      f.pend = { at: t, tgt: { x: 0, y: -1 }, until: t + 1800 + Math.random() * 1500 };
    }
  }

  function paintWm(t) {
    var cv = el.wm;
    if (!cv) return;
    var f = wmF, ox = wm.slot - 1, P = pal.white;
    f.F = buildF(f, t); f.pix = ssPix(f.F, 3, 16); eye(f, f.F);
    if (el.wmBtn) {
      var b = el.wmBtn.getBoundingClientRect();
      f.sx = b.left + f.F.hx * b.width; f.sy = b.top + f.F.hy * b.height;
    }
    if (cv.width !== wm.w || cv.height !== wm.h) { cv.width = wm.w; cv.height = wm.h; cv._c = null; cv._i = null; }
    var c = cv._c || (cv._c = cv.getContext('2d')), img = cv._i || (cv._i = c.createImageData(wm.w, wm.h)), d = img.data;
    for (var y = 0; y < wm.h; y++) for (var x = 0; x < wm.w; x++) {
      var col = P[0];
      if (wm.ink[y * wm.w + x]) col = ink;
      else {
        var lx = x - ox;
        if (lx >= 0 && lx < 16 && y < 16) { var i = fIdx(f, lx, y); if (i) col = P[i]; }
      }
      var o = (y * wm.w + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }

  function fall(t) {
    var cv = el.fall;
    if (!cv) return;
    var W = Math.ceil(root.offsetWidth / 5), H = Math.ceil(root.offsetHeight / 5);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv._c = null; cv.style.width = W * 5 + 'px'; cv.style.height = H * 5 + 'px'; }
    var c = cv._c || (cv._c = cv.getContext('2d'));
    if (!falls.length) { if (cv._dirty) { c.clearRect(0, 0, W, H); cv._dirty = false; } return; }
    cv._dirty = true; c.clearRect(0, 0, W, H);
    falls = falls.filter(function (p) {
      var dt = Math.min(0.05, (t - p.last) / 1000), age = (t - p.t0) / 1000;
      p.last = t;
      p.vy = Math.min(10, p.vy + 8 * dt);
      var k = Math.exp(-2.5 * dt);
      p.ox *= k; p.oy *= k;
      p.x += (p.ox + p.dr + 3.2 * Math.cos(age * 1.5 + p.ph)) * dt;
      p.y += (p.oy + p.vy) * dt;
      p.a += p.spin * dt; p.tum += p.tr * dt;
      if (p.x < -8 || p.x > W + 8 || p.y > H + 8) return false;
      var ca = Math.cos(p.a), sa = Math.sin(p.a), sq = Math.cos(p.tum);
      var hw = p.HW * Math.max(0.3, Math.abs(sq)), back = sq < 0, R = Math.ceil(p.L) + 1;
      var x0 = Math.floor(p.x - R), y0 = Math.floor(p.y - R);
      for (var py = y0; py <= y0 + 2 * R; py++) for (var px = x0; px <= x0 + 2 * R; px++) {
        var rx = px + 0.5 - p.x, ry = py + 0.5 - p.y, lx = rx * ca + ry * sa, ly = -rx * sa + ry * ca;
        if ((lx / p.L) * (lx / p.L) + (ly / hw) * (ly / hw) > 1) continue;
        c.fillStyle = lx < -p.L * 0.35 ? p.cBase : back ? p.cBack : p.cBody;
        c.fillRect(px, py, 1, 1);
      }
      return true;
    });
  }

  function pluckF(f, u, v, cl, ct, cs) {
    if (!f.F) return;
    var F = f.F, k = F.k, TAU = 2 * Math.PI;
    var n0 = Math.round(k * (Math.atan2((v - F.hy) / F.tilt, u - F.hx) + F.rot) / TAU);
    var n = -1;
    for (var o = 0; o <= k && n < 0; o++) {
      for (var si = 0; si < 2; si++) {
        var j = (((n0 + (si ? -1 : 1) * o) % k) + k) % k;
        if (!f.pg[j]) { n = j; break; }
      }
    }
    if (n < 0) return;
    var t = performance.now(), tn = TAU * n / k - F.rot, rr = F.R * 0.62, rt = root.getBoundingClientRect();
    f.pg[n] = t;
    var px = cl + (F.hx + Math.cos(tn) * rr) * cs - rt.left, py = ct + (F.hy + Math.sin(tn) * rr * F.tilt) * cs - rt.top;
    var L = Math.max(2.5, F.R * f.N * 0.42), HW = Math.max(1.5, L * (k > 8 ? 0.36 : 0.64)), hex = petalHex[f.cw];
    falls.push({
      x: px / 5, y: py / 5, L: L, HW: HW, cBody: hex[0], cBase: hex[1], cBack: hex[2],
      ox: Math.cos(tn) * 5, oy: Math.sin(tn) * 5 - 2, vy: 0, a: tn, spin: (Math.random() - 0.5) * 1.4,
      tum: 0, tr: 1.4 + Math.random() * 1.2, ph: Math.random() * 6, dr: (Math.random() - 0.5) * 2.4, t0: t, last: t
    });
    var q = function (x) { return Math.abs(x) > 0.38 ? Math.sign(x) : 0; };
    f.pend = null; f.tgt = { x: q(Math.cos(tn)), y: q(Math.sin(tn) * F.tilt) }; f.until = t + 2400;
    var fx = cl + F.hx * cs, fy = ct + F.hy * cs;
    lookers().forEach(function (o) {
      if (o === f || o.sx == null) return;
      var dd = Math.hypot(o.sx - fx, o.sy - fy);
      if (dd < 560) lookAt(o, fx, fy, t + 120 + dd * 0.9 + Math.random() * 200, 2400);
    });
  }

  function genMeadow(W, H, ex) {
    var s = 11;
    var rnd = function () {
      s = (s + 0x6D2B79F5) | 0;
      var x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    var out = [], keys = ['five', 'five', 'six', 'thirteen'], bg = pal.white[0];
    var cl = function (v) { return Math.max(0, Math.min(1, v)); };
    var target, tries, pos;
    if (mode === 'horizon') {
      var B = Math.min(H * 0.6, 72), y0 = H - B;
      target = Math.min(120, Math.round(W * B / 260)); tries = target * 25;
      pos = function () {
        var by = y0 + rnd() * (B + 12), depth = cl((by - y0) / B), N = Math.round(12 + depth * 24 + rnd() * 6);
        return [Math.round(rnd() * (W + N) - N), Math.round(by - N), N, (1 - depth) * 0.78];
      };
    } else {
      target = Math.min(110, Math.round(W * H / 420)); tries = 2500;
      pos = function () {
        var by = 6 + rnd() * (H + 14), depth = Math.min(1, by / H), N = Math.round(13 + depth * 22 + rnd() * 6);
        return [Math.round(rnd() * (W + N) - N), Math.round(by - N), N, (1 - depth) * 0.55];
      };
    }
    for (var i = 0; i < tries && out.length < target; i++) {
      var p = pos(), x = p[0], y = p[1], N = p[2], fog = p[3];
      var hx = x + 0.45 * N, hy = y + 0.38 * N, hr = 0.34 * N;
      if (ex.some(function (b) { return x + N > b[0] && x < b[2] && y + N > b[1] && y < b[3]; })) continue;
      if (out.some(function (o) { return Math.hypot(o.hx - hx, o.hy - hy) < (o.hr + hr) * 0.82; })) continue;
      var type = keys[Math.floor(rnd() * keys.length)], T = types[type], lx = rnd() < 0.35 ? { x: 1, y: 0 } : null;
      var f = assign(assign({}, T), {
        type: type, N: N, x: x, y: y, hx: hx, hy: hy, hr: hr, cy: 0.36 + rnd() * 0.06, ph: rnd() * 20,
        pg: new Array(T.k).fill(0), def: lx, tgt: lx, until: 0, baseY: y + N - 1
      });
      f.palFog = pal[f.cw].map(function (c) { return c.map(function (v, j) { return Math.round(v + (bg[j] - v) * fog); }); });
      f.blades = [];
      var bx = x + Math.round(f.bx * N);
      for (var k = -3; k <= 3; k++) {
        if (k && rnd() < 0.55) f.blades.push({ x: bx + k, h: 1 + Math.floor(rnd() * (2 + N / 10)), c: rnd() < 0.5 ? 7 : 8, ph: rnd() * 40 });
      }
      out.push(f);
    }
    return out.sort(function (a, b) { return b.baseY - a.baseY; });
  }

  function paintMeadow(t) {
    var cv = el.meadow;
    if (!cv) return;
    var W = Math.ceil(root.offsetWidth / 5), H = Math.ceil(root.offsetHeight / 5), rr = root.getBoundingClientRect();
    var u = function (b) {
      return [Math.floor((b.left - rr.left) / 5), Math.floor((b.top - rr.top) / 5), Math.ceil((b.right - rr.left) / 5), Math.ceil((b.bottom - rr.top) / 5)];
    };
    var els = [el.wmBox, el.nav, el.homeText, el.latest].filter(Boolean);
    if (el.foot) els = els.concat(Array.prototype.slice.call(el.foot.children));
    var ex = els.map(function (e) { var b = u(e.getBoundingClientRect()); return [b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 2]; });
    if (mode === 'horizon' && el.page) { var pb = u(el.page.getBoundingClientRect()); ex.push([pb[0] - 6, pb[1] - 6, pb[2] + 6, pb[3] + 6]); }
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv._c = null; cv._i = null; cv.style.width = W * 5 + 'px'; cv.style.height = H * 5 + 'px'; }
    var key = W + 'x' + H + ':' + ex.join('|');
    if (key !== mKey) { mKey = key; meadow = genMeadow(W, H, ex); }
    var fl = meadow, gr = cv.getBoundingClientRect(), sc = gr.width / W;
    var v0 = Math.max(0, Math.floor(-gr.top / sc) - 30), v1 = Math.min(H, Math.ceil((window.innerHeight - gr.top) / sc) + 30);
    if (v1 <= v0) { fl.forEach(function (f) { f.sx = null; }); return; }
    var c = cv._c || (cv._c = cv.getContext('2d')), img = cv._i || (cv._i = c.createImageData(W, H)), d = img.data, bg = pal.white[0];
    for (var o = v0 * W * 4, e = v1 * W * 4; o < e; o += 4) { d[o] = bg[0]; d[o + 1] = bg[1]; d[o + 2] = bg[2]; d[o + 3] = 255; }
    var put = function (x, y, col) {
      if (x < 0 || y < v0 || x >= W || y >= v1) return;
      var i = (y * W + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    };
    for (var i = fl.length - 1; i >= 0; i--) {
      var f = fl[i];
      if (f.y > v1 || f.baseY + 1 < v0) { f.sx = null; continue; }
      f.F = buildF(f, t); f.pix = ssPix(f.F, 2, f.N); eye(f, f.F);
      f.sx = gr.left + (f.x + f.F.hx * f.N) * sc; f.sy = gr.top + (f.y + f.F.hy * f.N) * sc;
      f.blades.forEach(function (b) {
        for (var j = 0; j < b.h; j++) put(b.x + (j === b.h - 1 && b.h >= 3 ? Math.round(Math.sin(t / 1500 + b.ph) * 0.8) : 0), f.baseY - j, f.palFog[b.c]);
      });
      for (var ly = 0; ly < f.N; ly++) for (var lx = 0; lx < f.N; lx++) { var k = fIdx(f, lx, ly); if (k) put(f.x + lx, f.y + ly, f.palFog[k]); }
    }
    c.putImageData(img, 0, 0, 0, v0, W, v1 - v0);
  }

  function geo(f) {
    if (f === wmF) { var b = el.wmBtn && el.wmBtn.getBoundingClientRect(); return b ? [b.left, b.top, b.width] : null; }
    if (!el.meadow || meadow.indexOf(f) < 0) return null;
    var r = el.meadow.getBoundingClientRect(), s = r.width / el.meadow.width;
    return [r.left + f.x * s, r.top + f.y * s, f.N * s];
  }

  function shake() {
    var t = performance.now();
    if (panic > t) return;
    panic = t + 3400;
    lookers().forEach(function (f) {
      if (!f.F || f.sx == null) return;
      var left = f.pg.map(function (p, n) { return p ? -1 : n; }).filter(function (n) { return n >= 0; });
      var keep = f.k > 8 ? 3 : 0;
      left.sort(function () { return Math.random() - 0.5; }).slice(0, Math.max(0, left.length - keep)).forEach(function (n) {
        setTimeout(function () {
          var g = geo(f);
          if (!g || f.pg[n] || !f.F) return;
          var F = f.F, tn = 2 * Math.PI * n / f.k - F.rot;
          pluckF(f, F.hx + Math.cos(tn) * F.R * 0.6, F.hy + Math.sin(tn) * F.R * 0.6 * F.tilt, g[0], g[1], g[2]);
        }, 80 + Math.random() * 1600);
      });
    });
  }

  function meadowHit(e) {
    var cv = el.meadow;
    if (!cv || !cv.width) return null;
    var r = cv.getBoundingClientRect(), s = r.width / cv.width, x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    for (var i = 0; i < meadow.length; i++) {
      var f = meadow[i];
      if (!f.F || f.sx == null) continue;
      var u = (x - f.x) / f.N, v = (y - f.y) / f.N;
      if (Math.hypot(u - f.F.hx, (v - f.F.hy) / f.F.tilt) < f.F.R * 1.05) return [f, u, v, r.left + f.x * s, r.top + f.y * s, f.N * s];
    }
    return null;
  }

  function interactive(t) { return t.closest && t.closest('a,button,input,textarea,select,label'); }

  root.addEventListener('click', function (e) {
    if (interactive(e.target)) return;
    var hit = meadowHit(e);
    if (hit) pluckF(hit[0], hit[1], hit[2], hit[3], hit[4], hit[5]);
  });

  root.addEventListener('pointermove', function (e) {
    var want = !interactive(e.target) && meadowHit(e) ? 'pointer' : '';
    if (root.style.cursor !== want) root.style.cursor = want;
  });

  if (el.wmBtn) {
    el.wmBtn.addEventListener('click', function (e) {
      if (wmF.F && wmF.pg.every(function (p) { return p; })) { shake(); return; }
      var b = el.wmBtn.getBoundingClientRect();
      pluckF(wmF, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, b.left, b.top, b.width);
    });
  }

  function tick() {
    requestAnimationFrame(tick);
    var t = performance.now();
    fall(t);
    if (t - last < 60) return;
    last = t;
    gaze(t);
    paintWm(t);
    paintMeadow(t);
  }

  tick();
})();
