(function () {
  'use strict';

  var SNIPPET = '<a href="https://glocean.dev"><img src="https://glocean.dev/88x31.gif" width="88" height="31" alt="glocean.dev"></a>';

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var leaving = false;

  function layers() {
    return Array.prototype.slice.call(document.querySelectorAll('.fade, .meadow, .fall'));
  }

  function show(animate) {
    layers().forEach(function (e) {
      e.style.transition = animate ? 'opacity 280ms ease-out' : 'none';
      e.style.opacity = '1';
    });
  }

  function navigate(url) {
    if (leaving) return;
    if (reduced) { location.href = url; return; }
    leaving = true;
    layers().forEach(function (e) {
      e.style.transition = 'opacity 200ms ease-in';
      e.style.opacity = '0';
    });
    var went = false;
    var go = function () { if (!went) { went = true; location.href = url; } };
    setTimeout(go, 210);
  }

  function initTransitions() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return;
      e.preventDefault();
      if (url.pathname === location.pathname && url.search === location.search) return;
      navigate(url.href);
    });

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { leaving = false; show(false); }
    });

    if (reduced) { show(false); return; }
    requestAnimationFrame(function () { requestAnimationFrame(function () { show(true); }); });
  }

  function initBadgeCopy() {
    var btn = document.getElementById('badgeCopy');
    if (!btn) return;
    var timer;
    btn.addEventListener('click', function () {
      try { navigator.clipboard.writeText(SNIPPET); } catch (e) {}
      btn.textContent = 'copied';
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'copy snippet'; }, 1600);
    });
  }

  function initTagFilter() {
    var bar = document.querySelector('.filter');
    if (!bar) return;
    var rows = Array.prototype.slice.call(document.querySelectorAll('.post-row'));
    var btns = Array.prototype.slice.call(bar.querySelectorAll('button'));
    var count = bar.querySelector('.count');
    var empty = document.querySelector('.empty');

    function apply(tag) {
      var shown = 0;
      rows.forEach(function (r) {
        var tags = (r.getAttribute('data-tags') || '').split(/\s+/);
        var hit = !tag || tags.indexOf(tag) >= 0;
        r.hidden = !hit;
        if (hit) shown++;
      });
      btns.forEach(function (b) { b.classList.toggle('active', (b.getAttribute('data-tag') || '') === tag); });
      if (count) count.textContent = shown === 1 ? '1 post' : shown + ' posts';
      if (empty) empty.hidden = shown !== 0;
      try {
        history.replaceState(null, '', tag ? '?tag=' + encodeURIComponent(tag) : location.pathname);
      } catch (e) {}
    }

    btns.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-tag') || ''); });
    });
    apply(new URLSearchParams(location.search).get('tag') || '');
  }

  function boot() {
    initTransitions();
    initBadgeCopy();
    initTagFilter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
