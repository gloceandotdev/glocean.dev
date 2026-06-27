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
    var numPetals = 10;
    var colorOffset = opts.colorOffset != null ? opts.colorOffset : 3;
    var startAngle = -Math.PI / 2;
    var angleOffset = opts.angleOffset != null ? opts.angleOffset : Math.PI;
    var groupAlpha = opts.opacity != null ? opts.opacity : 0.9;
    var corner = opts.corner || 'br';

    var dpr = 1, W = 0, H = 0, petalLength = 200;
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [canvas, buf].forEach(function (cv) {
        cv.width = Math.floor(W * dpr);
        cv.height = Math.floor(H * dpr);
      });
      petalLength = Math.min(W, Math.min(H, window.innerHeight)) * 0.46;
    }

    function petalPath(g, angle) {
      g.save();
      g.rotate(angle);
      var pl = petalLength, pw = pl * 0.22;
      g.moveTo(0, 0);
      g.bezierCurveTo(-pw, -pl * 0.3, -pw * 0.4, -pl * 0.75, 0, -pl);
      g.bezierCurveTo(pw * 0.4, -pl * 0.75, pw, -pl * 0.3, 0, 0);
      g.closePath();
      g.restore();
    }

    function draw(rotation, progress) {
      var pal = PALETTES[getTheme() === 'light' ? 'light' : 'dark'];
      var cx = (corner === 'tl' || corner === 'bl') ? -10 : W + 10;
      var cy = (corner === 'tl' || corner === 'tr') ? -10 : H + 10;
      var eased = easeOut(progress);

      bctx.save();
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      bctx.translate(cx, cy);

      var angleAt = function (i) { return startAngle + ((i / numPetals) * Math.PI * 2 - startAngle) * eased + rotation + angleOffset; };
      var colorAt = function (i) { return pal.colors[(i + colorOffset) % pal.colors.length]; };
      var n = numPetals;
      var clipOutNext = function (i) {
        bctx.beginPath();
        bctx.rect(-1e5, -1e5, 2e5, 2e5);
        petalPath(bctx, angleAt((i + 1) % n));
        bctx.clip('evenodd');
      };
      for (var i = 0; i < n; i++) {
        bctx.save(); clipOutNext(i);
        bctx.beginPath(); petalPath(bctx, angleAt(i));
        bctx.fillStyle = colorAt(i); bctx.fill();
        bctx.restore();
      }
      bctx.lineJoin = 'round';
      bctx.lineWidth = petalLength * 0.013;
      bctx.strokeStyle = pal.base;
      for (var j = 0; j < n; j++) {
        bctx.save(); clipOutNext(j);
        bctx.beginPath(); petalPath(bctx, angleAt(j));
        bctx.stroke();
        bctx.restore();
      }
      bctx.beginPath(); bctx.arc(0, 0, 9, 0, Math.PI * 2);
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
    var rotation = 0, raf;
    var startT = performance.now();
    var last = startT;
    var loop = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rotation += SPIN * dt;
      var progress = Math.min(1, (now - startT) / 5500);
      draw(rotation, progress);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return function stop() {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  };
})();
