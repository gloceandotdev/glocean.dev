(function () {
  'use strict';

  var STOPS = {
    dark:  ['#191724', '#1f1d2e', '#26233a', '#31748f', '#9ccfd8', '#c4a7e7', '#eb6f92', '#f6c177'],
    light: ['#faf4ed', '#f2e9e1', '#dfdad9', '#56949f', '#286983', '#907aa9', '#d7827e', '#f6c177']
  };
  var RAMP_BANDS = 22;

  function hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  function buildRamp(stops, n) {
    var pts = stops.map(hexToRgb);
    var segs = pts.length - 1;
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = (i / (n - 1)) * segs;
      var s = Math.min(segs - 1, Math.floor(t));
      var f = t - s;
      var a = pts[s], b = pts[s + 1];
      out.push([
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f)
      ]);
    }
    return out;
  }

  var BAYER = [
    0,32,8,40,2,34,10,42, 48,16,56,24,50,18,58,26,
    12,44,4,36,14,46,6,38, 60,28,52,20,62,30,54,22,
    3,35,11,43,1,33,9,41, 51,19,59,27,49,17,57,25,
    15,47,7,39,13,45,5,37, 63,31,55,23,61,29,53,21
  ];

  var PIXEL_SIZE = 5;
  var DRIFT_SPEED = 0.48;
  var TURBULENCE = 1;
  var ARMS = 10;
  var WIPE_MS = 260;
  var CLOCK_KEY = 'spillClock';

  function hash(x, y) {
    var n = Math.imul(x | 0, 1619) ^ Math.imul(y | 0, 31337);
    n = Math.imul(n ^ (n >>> 15), 2246822519);
    n = Math.imul(n ^ (n >>> 13), 3266489917);
    n ^= n >>> 16;
    return (n >>> 0) / 2147483648 - 1;
  }

  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  function fbm(x, y, oct) {
    var s = 0, amp = 0.5, f = 1;
    for (var i = 0; i < oct; i++) {
      s += amp * vnoise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return s * 1.85;
  }

  function readClock() {
    try {
      var v = parseFloat(sessionStorage.getItem(CLOCK_KEY));
      return isFinite(v) && v >= 0 ? v : 0;
    } catch (e) { return 0; }
  }

  function writeClock(seconds) {
    try { sessionStorage.setItem(CLOCK_KEY, String(seconds)); } catch (e) {}
  }

  function Spill(canvas, wipeCanvas, page) {
    this.cv = canvas;
    this.wcv = wipeCanvas;
    this.page = page;
    this.theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    this.reduced = false;
    try { this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dirty = true;
    this.buildPalette();
    this.resize();
    this.observe();
    this.start();
  }

  Spill.prototype.buildPalette = function () {
    var ramp = buildRamp(STOPS[this.theme === 'light' ? 'light' : 'dark'], RAMP_BANDS);
    this.pal = new Uint32Array(ramp.length);
    for (var i = 0; i < ramp.length; i++) {
      var c = ramp[i];
      this.pal[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
      if (i === 0) this.baseARGB = this.pal[i];
    }
  };

  Spill.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var small = r.width < 760;
    var px = Math.max(2, PIXEL_SIZE + (small ? 2 : 0));
    this.w = Math.max(8, Math.ceil(r.width / px));
    this.h = Math.max(8, Math.ceil(r.height / px));
    this.small = small;
    this.cv.width = this.w;
    this.cv.height = this.h;
    this.img = this.ctx.createImageData(this.w, this.h);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.dirty = true;
  };

  Spill.prototype.observe = function () {
    var self = this;
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.resize(); });
      this.ro.observe(this.cv);
    } else {
      window.addEventListener('resize', function () { self.resize(); });
    }
  };

  Spill.prototype.still = function () { return this.reduced || this.small; };

  Spill.prototype.elapsed = function (now) { return (now - this.t0) / 1000; };

  Spill.prototype.start = function () {
    var self = this;
    this.t0 = performance.now() - readClock() * 1000;
    var lastDraw = 0, lastSave = 0;

    var loop = function (now) {
      var still = self.still();
      var budget = self.small ? 1000 / 20 : 1000 / 30;
      if (still) {
        if (self.dirty) { self.dirty = false; self.paint(0); }
      } else if (now - lastDraw >= budget) {
        lastDraw = now;
        self.dirty = false;
        self.paint(self.elapsed(now));
      }
      if (now - lastSave >= 250) {
        lastSave = now;
        writeClock(self.elapsed(now));
      }
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);

    var flush = function () { writeClock(self.elapsed(performance.now())); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });

    this.paint(this.still() ? 0 : this.elapsed(performance.now()));
    this.reveal();
    this.bindNav();
  };

  Spill.prototype.setTheme = function (t) {
    this.theme = t === 'light' ? 'light' : 'dark';
    this.buildPalette();
    this.dirty = true;
    this.paint(this.still() ? 0 : this.elapsed(performance.now()));
  };

  Spill.prototype.paint = function (time) {
    var w = this.w, h = this.h, buf = this.buf, pal = this.pal;
    if (!buf || !pal) return;
    var bands = pal.length - 1;
    var page = this.page === 'home' ? 0 : 1;
    var wide = this.page === 'blog' || this.page === 'projects';
    var reading = this.page === 'post';
    var t = time * DRIFT_SPEED;
    var scale = 3.1 / Math.max(w, h);
    var aspect = w / h;
    var cx = 0.5, cy = 0.5;
    var oct = this.small ? 2 : 3;
    var gamma = reading ? 1.65 : (page ? 1.5 : 1.28);
    var colWidth = this.small ? 1.15 : (wide ? 0.4 : (reading ? 0.44 : 0.36));

    for (var y = 0; y < h; y++) {
      var ny = y / h;
      var dy = (ny - cy) * 1.12;
      var row = y * w;
      var topCalm = page ? Math.min(1, Math.max(0, (ny - 0.03) / 0.24)) : 1;
      for (var x = 0; x < w; x++) {
        var nx = x / w;
        var dx = (nx - cx) * aspect;
        var r = Math.sqrt(dx * dx + dy * dy);

        var sx = x * scale * 3.4, sy = y * scale * 3.4;
        var q1 = fbm(sx + t * 0.09, sy - t * 0.045, 2);
        var q2 = fbm(sx + 4.7 - t * 0.05, sy + 2.3 + t * 0.07, 2);
        var v = fbm(sx + TURBULENCE * 1.75 * q1 + t * 0.035, sy + TURBULENCE * 1.55 * q2 - t * 0.02, oct);
        v += 0.42 * fbm(sx * 0.42 - t * 0.06, sy * 0.42, 2);

        if (ARMS > 0) {
          var th = Math.atan2(dy, dx);
          var fall = Math.exp(-Math.pow((r - 0.4) * 2.0, 2));
          v += 0.24 * fall * Math.sin(ARMS * th + t * 0.22 + r * 5.5);
        }

        var calm;
        if (page) {
          calm = Math.min(1, Math.max(0, (Math.abs(dx) / colWidth - 1) / 0.7));
        } else {
          var ex = dx / 0.68, ey = ((ny - 0.515) * 1.12) / 0.44;
          calm = Math.min(1, Math.max(0, (Math.sqrt(ex * ex + ey * ey) - 0.52) / 0.72));
        }
        calm = Math.min(calm, topCalm);
        var sm = calm * calm * (3 - 2 * calm);
        var amp = 0.16 + 0.84 * sm;
        v = v * amp - (1 - amp) * 0.42 + 0.15 * (ny - 0.5) * amp;
        v += 0.1 * Math.sin(t * 0.35 + r * 4.2);
        v -= 0.22 * Math.max(0, r - 0.86);

        var n = 0.5 + 0.6 * v;
        n = n < 0 ? 0 : n > 1 ? 1 : n;
        n = Math.pow(n, gamma);

        var s = n * bands;
        var i = s | 0;
        if (s - i > (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64) i++;
        buf[row + x] = pal[i > bands ? bands : i];
      }
    }
    this.ctx.putImageData(this.img, 0, 0);
  };

  Spill.prototype.drawWipe = function (p) {
    var cv = this.wcv;
    if (!cv) return;
    var rect = cv.getBoundingClientRect();
    var cell = 7;
    var w = Math.max(4, Math.ceil(rect.width / cell));
    var h = Math.max(4, Math.ceil(rect.height / cell));
    if (cv.width !== w || cv.height !== h || !this.wimg) {
      cv.width = w;
      cv.height = h;
      this.wctx = cv.getContext('2d');
      this.wimg = this.wctx.createImageData(w, h);
      this.wbuf = new Uint32Array(this.wimg.data.buffer);
    }
    var buf = this.wbuf, fill = this.baseARGB;
    for (var y = 0; y < h; y++) {
      var ny = y / h;
      var row = y * w;
      var local = Math.min(1, Math.max(0, p * 1.7 - ny * 0.62));
      for (var x = 0; x < w; x++) {
        var rnd = (hash(x, y) + 1) * 0.5;
        var ord = (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
        buf[row + x] = (rnd * 0.62 + ord * 0.38) < local ? fill : 0;
      }
    }
    this.wctx.putImageData(this.wimg, 0, 0);
    this.wipeP = p;
  };

  Spill.prototype.animateWipe = function (from, to, done) {
    var self = this, cv = this.wcv;
    if (!cv) { if (done) done(); return; }
    if (this.wraf) cancelAnimationFrame(this.wraf);
    var ms = Math.max(1, WIPE_MS * Math.abs(to - from));
    cv.style.display = 'block';
    this.drawWipe(from);
    cv.style.background = 'none';
    var start = 0;
    var step = function (now) {
      if (!start) start = now;
      var p = Math.min(1, (now - start) / ms);
      self.drawWipe(from + (to - from) * p);
      if (p >= 1) { self.wraf = null; if (done) done(); return; }
      self.wraf = requestAnimationFrame(step);
    };
    this.wraf = requestAnimationFrame(step);
  };

  Spill.prototype.reveal = function () {
    var cv = this.wcv;
    if (!cv) return;
    if (this.reduced) { cv.style.display = 'none'; return; }
    this.leaving = false;
    this.animateWipe(1, 0, function () { cv.style.display = 'none'; });
  };

  Spill.prototype.cover = function (done) {
    if (this.reduced || !this.wcv) { done(); return; }
    var from = this.wraf ? (this.wipeP || 0) : 0;
    this.animateWipe(from, 1, done);
  };

  Spill.prototype.navigate = function (url) {
    if (this.leaving) return;
    if (this.reduced) { location.href = url; return; }
    this.leaving = true;
    var went = false;
    var go = function () { if (!went) { went = true; location.href = url; } };
    setTimeout(go, WIPE_MS + 150);
    this.cover(go);
  };

  Spill.prototype.bindNav = function () {
    var self = this;
    document.addEventListener('click', function (e) {
      if (self.reduced || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return;
      e.preventDefault();
      self.navigate(url.href);
    });

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) self.reveal();
    });
  };

  function boot() {
    var cv = document.querySelector('canvas.spill');
    if (!cv) return;
    var page = document.body.getAttribute('data-page') || 'home';
    window.spill = new Spill(cv, document.querySelector('canvas.wipe'), page);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
