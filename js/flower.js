(function () {
  window.initCornerFlower = function initCornerFlower(canvas, getTheme, opts) {
    opts = opts || {};
    if (!canvas) return function () {};
    var ctx = canvas.getContext('2d');
    var buf = document.createElement('canvas');
    var bctx = buf.getContext('2d');

    var PALETTES = {
      dark:  { colors: ['#eb6f92', '#9ccfd8', '#f6c177', '#31748f', '#c4a7e7'], base: '#191724' },
      light: { colors: ['#b4637a', '#56949f', '#ea9d34', '#286983', '#907aa9'], base: '#faf4ed' }
    };
    var corner = opts.corner || 'br';
    var colorOffset = opts.colorOffset != null ? opts.colorOffset : 3;
    var startAngle = -Math.PI / 2;
    var angleOffset = opts.angleOffset != null ? opts.angleOffset : Math.PI;
    var groupAlpha = opts.opacity != null ? opts.opacity : 0.9;

    var dpr = 1, W = 0, H = 0;
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    var flower = null;

    function buildFlower() {
      if (corner === 'bottom') {
        var r = Math.max(30, Math.min(W * 0.5, H) - 10);
        flower = { x: W / 2, y: H + Math.max(14, r * 0.13), r: r, small: true };
      } else {
        flower = {
          x: (corner === 'tl' || corner === 'bl') ? -10 : W + 10,
          y: (corner === 'tl' || corner === 'tr') ? -10 : H + 10,
          r: Math.min(W, Math.min(H, window.innerHeight)) * 0.46,
          small: false
        };
      }
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [canvas, buf].forEach(function (cv) {
        cv.width = Math.floor(W * dpr);
        cv.height = Math.floor(H * dpr);
      });
      buildFlower();
    }

    function petalPath(g, angle, pl) {
      g.save();
      g.rotate(angle);
      var pw = pl * 0.22;
      g.moveTo(0, 0);
      g.bezierCurveTo(-pw, -pl * 0.3, -pw * 0.4, -pl * 0.75, 0, -pl);
      g.bezierCurveTo(pw * 0.4, -pl * 0.75, pw, -pl * 0.3, 0, 0);
      g.closePath();
      g.restore();
    }

    function draw(rotation, elapsed) {
      var pal = PALETTES[getTheme() === 'light' ? 'light' : 'dark'];
      var f = flower;
      var eased = easeOut(Math.min(1, elapsed / 5500));
      var n = 10;
      var rot = rotation + angleOffset;

      bctx.save();
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      bctx.translate(f.x, f.y);

      var angleAt = function (i) { return startAngle + ((i / n) * Math.PI * 2 - startAngle) * eased + rot; };
      var colorAt = function (i) { return pal.colors[(i + colorOffset) % pal.colors.length]; };
      var clipOutNext = function (i) {
        bctx.beginPath();
        bctx.rect(-1e5, -1e5, 2e5, 2e5);
        petalPath(bctx, angleAt((i + 1) % n), f.r);
        bctx.clip('evenodd');
      };

      for (var i = 0; i < n; i++) {
        bctx.save(); clipOutNext(i);
        bctx.beginPath(); petalPath(bctx, angleAt(i), f.r);
        bctx.fillStyle = colorAt(i); bctx.fill();
        bctx.restore();
      }
      bctx.lineJoin = 'round';
      bctx.lineWidth = f.small ? Math.max(1.2, f.r * 0.02) : f.r * 0.013;
      bctx.strokeStyle = pal.base;
      for (var j = 0; j < n; j++) {
        bctx.save(); clipOutNext(j);
        bctx.beginPath(); petalPath(bctx, angleAt(j), f.r);
        bctx.stroke();
        bctx.restore();
      }
      bctx.beginPath();
      bctx.arc(0, 0, f.small ? Math.max(3, f.r * 0.06) : 9, 0, Math.PI * 2);
      bctx.fillStyle = pal.base; bctx.fill();
      bctx.restore();

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = groupAlpha;
      ctx.drawImage(buf, 0, 0);
      ctx.restore();
    }

    resize();
    var ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(canvas); }

    var SPIN = 0.078;
    // bottom flowers share one spin clock across pages (per browser session),
    // so navigating never resets the rotation or replays the unravel
    var CONT = corner === 'bottom';
    var KEY = 'glocean-flower-epoch';
    var epoch = Date.now(), fresh = true;
    if (CONT) {
      try {
        var s = sessionStorage.getItem(KEY);
        if (s) { epoch = +s; fresh = false; }
        else { sessionStorage.setItem(KEY, String(epoch)); }
      } catch (e) {}
    }
    var rotation = 0, raf;
    var startT = performance.now();
    var last = startT;
    var loop = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (CONT) {
        rotation = SPIN * ((Date.now() - epoch) / 1000);
        draw(rotation, fresh ? now - startT : 1e9);
      } else {
        rotation += SPIN * dt;
        draw(rotation, now - startT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return function stop() {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  };
})();
