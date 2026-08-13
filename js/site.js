(function () {
  'use strict';

  var GITHUB = 'https://github.com/gloceandotdev';

  var PROJECTS = [
    { name: 'dotfiles',           lang: 'Shell',                url: GITHUB + '/dotfiles',
      desc: 'Minimal macOS dotfiles with automatic light/dark mode switching.' },
    { name: 'iris-rockbox-theme', lang: 'Markup',               url: GITHUB + '/iris-rockbox-theme',
      desc: 'A clean Rosé Pine theme for Rockbox that does not use any beatmaps.' },
    { name: '.emacs.d',           lang: 'Emacs Lisp',           url: GITHUB + '/.emacs.d',
      desc: 'Elegant, no-distraction Emacs configuration with evil-mode and a custom Rosé Pine theme.' },
    { name: 'glocean.dev',        lang: 'HTML, CSS, JavaScript', url: GITHUB + '/glocean.dev',
      desc: 'A framework-free personal site in vanilla HTML, CSS, and JS.' }
  ];

  var MOON = '<svg class="moon" viewBox="0 0 16 15" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
    '<rect x="5" y="0" width="3" height="1"></rect><rect x="3" y="1" width="4" height="1"></rect>' +
    '<rect x="2" y="2" width="4" height="1"></rect><rect x="1" y="3" width="4" height="1"></rect>' +
    '<rect x="1" y="4" width="4" height="1"></rect><rect x="0" y="5" width="5" height="1"></rect>' +
    '<rect x="0" y="6" width="5" height="1"></rect><rect x="0" y="7" width="5" height="1"></rect>' +
    '<rect x="15" y="7" width="1" height="1"></rect><rect x="0" y="8" width="6" height="1"></rect>' +
    '<rect x="14" y="8" width="2" height="1"></rect><rect x="0" y="9" width="7" height="1"></rect>' +
    '<rect x="13" y="9" width="3" height="1"></rect><rect x="1" y="10" width="14" height="1"></rect>' +
    '<rect x="1" y="11" width="14" height="1"></rect><rect x="2" y="12" width="12" height="1"></rect>' +
    '<rect x="3" y="13" width="10" height="1"></rect><rect x="5" y="14" width="6" height="1"></rect></svg>';

  var SUN = '<svg class="sun" viewBox="0 0 9 9" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
    '<rect x="4" y="0" width="1" height="1"></rect><rect x="1" y="1" width="1" height="1"></rect>' +
    '<rect x="7" y="1" width="1" height="1"></rect><rect x="4" y="2" width="1" height="1"></rect>' +
    '<rect x="3" y="3" width="3" height="1"></rect><rect x="0" y="4" width="1" height="1"></rect>' +
    '<rect x="2" y="4" width="5" height="1"></rect><rect x="8" y="4" width="1" height="1"></rect>' +
    '<rect x="3" y="5" width="3" height="1"></rect><rect x="4" y="6" width="1" height="1"></rect>' +
    '<rect x="1" y="7" width="1" height="1"></rect><rect x="7" y="7" width="1" height="1"></rect>' +
    '<rect x="4" y="8" width="1" height="1"></rect></svg>';

  var GLASS = '<svg class="glass" viewBox="0 0 15 15" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
    '<rect x="3" y="0" width="5" height="1"></rect><rect x="2" y="1" width="1" height="1"></rect>' +
    '<rect x="8" y="1" width="1" height="1"></rect><rect x="1" y="2" width="1" height="1"></rect>' +
    '<rect x="9" y="2" width="1" height="1"></rect><rect x="0" y="3" width="1" height="5"></rect>' +
    '<rect x="10" y="3" width="1" height="5"></rect><rect x="1" y="8" width="1" height="1"></rect>' +
    '<rect x="9" y="8" width="1" height="1"></rect><rect x="2" y="9" width="1" height="1"></rect>' +
    '<rect x="8" y="9" width="3" height="1"></rect><rect x="3" y="10" width="5" height="1"></rect>' +
    '<rect x="9" y="10" width="3" height="1"></rect><rect x="10" y="11" width="3" height="1"></rect>' +
    '<rect x="11" y="12" width="3" height="1"></rect><rect x="12" y="13" width="3" height="1"></rect>' +
    '<rect x="13" y="14" width="2" height="1"></rect></svg>';

  var root = document.documentElement;
  var sys = window.matchMedia('(prefers-color-scheme: dark)');
  var page = document.body.getAttribute('data-page') || 'home';

  function theme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (window.spill) window.spill.setTheme(t);
  }

  function toggleTheme() {
    var next = theme() === 'dark' ? 'light' : 'dark';
    try {
      if (next === (sys.matches ? 'dark' : 'light')) localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch (e) {}
    applyTheme(next);
  }

  if (sys.addEventListener) {
    sys.addEventListener('change', function (e) {
      var stored = null;
      try { stored = localStorage.getItem('theme'); } catch (err) {}
      if (!stored) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  function bindToggles(scope) {
    var btns = (scope || document).querySelectorAll('.toggle');
    Array.prototype.forEach.call(btns, function (b) { b.addEventListener('click', toggleTheme); });
  }

  function navLink(id, label, href) {
    var active = id === page || (id === 'blog' && page === 'post');
    return '<a' + (active ? ' class="active"' : '') + ' href="' + href + '">' + label + '</a>';
  }

  function buildHeader() {
    var el = document.getElementById('topbar');
    if (!el) return;
    el.innerHTML =
      '<a class="brand" href="/">Glocean</a>' +
      '<nav>' +
        navLink('about', 'About', '/about/') +
        navLink('blog', 'Blog', '/blog/') +
        navLink('projects', 'Projects', '/projects/') +
        '<button type="button" class="iconbtn search" id="searchTrigger" aria-label="Search">' + GLASS + '</button>' +
        '<button type="button" class="iconbtn toggle" aria-label="Toggle light / dark theme">' + MOON + SUN + '</button>' +
      '</nav>';

    var st = document.getElementById('searchTrigger');
    if (st) st.addEventListener('click', openSearch);

    var measure = function () {
      var h = Math.ceil(el.getBoundingClientRect().height);
      if (h) root.style.setProperty('--header-h', h + 'px');
    };
    if (window.ResizeObserver) new ResizeObserver(measure).observe(el);
    else window.addEventListener('resize', measure);
    measure();
  }

  var overlay, input, results, hits = [], sel = 0;

  function pool() {
    var posts = (window.BLOG_POSTS || []).map(function (p) {
      return {
        title: p.title, kind: 'Writing', url: p.url,
        hay: (p.title + ' ' + p.excerpt + ' ' + (p.tags || []).join(' ')).toLowerCase()
      };
    });
    return posts.concat(PROJECTS.map(function (p) {
      return {
        title: p.name, kind: 'Project', url: p.url, external: true,
        hay: (p.name + ' ' + p.desc + ' ' + p.lang).toLowerCase()
      };
    }));
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildSearch() {
    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML =
      '<div class="search-panel">' +
        '<div class="search-field">' + GLASS +
          '<input type="text" spellcheck="false" autocomplete="off" aria-label="Search writing and projects">' +
        '</div>' +
        '<div class="search-results"></div>' +
      '</div>';
    (document.querySelector('.page') || document.body).appendChild(overlay);
    input = overlay.querySelector('input');
    results = overlay.querySelector('.search-results');

    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeSearch(); });
    input.addEventListener('input', function () { render(); });
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    var all = pool();
    hits = q ? all.filter(function (h) { return h.hay.indexOf(q) !== -1; }) : all;
    if (sel >= hits.length) sel = 0;
    if (!hits.length) {
      results.innerHTML = '<p class="search-empty">Nothing matches that.</p>';
      return;
    }
    results.innerHTML = hits.map(function (h, i) {
      return '<a class="hit' + (i === sel ? ' sel' : '') + '" href="' + esc(h.url) + '" data-i="' + i + '">' +
        '<span class="t">' + esc(h.title) + '</span>' +
        '<span class="k">' + h.kind + '</span></a>';
    }).join('');
    Array.prototype.forEach.call(results.querySelectorAll('.hit'), function (a) {
      a.addEventListener('mouseenter', function () { setSel(+a.getAttribute('data-i')); });
      a.addEventListener('click', function (e) { e.preventDefault(); go(hits[+a.getAttribute('data-i')]); });
    });
  }

  function setSel(i) {
    var as = results.querySelectorAll('.hit');
    if (!as.length) return;
    if (as[sel]) as[sel].classList.remove('sel');
    sel = (i + as.length) % as.length;
    as[sel].classList.add('sel');
    if (as[sel].scrollIntoView) as[sel].scrollIntoView({ block: 'nearest' });
  }

  function go(hit) {
    if (!hit) return;
    closeSearch();
    if (hit.external) window.open(hit.url, '_blank', 'noopener');
    else if (window.spill && window.spill.navigate) window.spill.navigate(hit.url);
    else window.location.href = hit.url;
  }

  function isOpen() { return overlay && overlay.classList.contains('open'); }

  function openSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    overlay.classList.add('open');
    input.value = '';
    sel = 0;
    render();
    setTimeout(function () { input.focus(); input.select(); }, 20);
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('open');
    input.value = '';
    sel = 0;
  }

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) {
      var typing = /^(input|textarea)$/i.test((e.target && e.target.tagName) || '') ||
        (e.target && e.target.isContentEditable);
      if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
        e.preventDefault();
        openSearch();
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
    if (!hits.length) return;
    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key.toLowerCase() === 'n')) { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key.toLowerCase() === 'p')) { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[sel]); }
  });

  function initBadgeCopy() {
    var btn = document.getElementById('badgeCopy');
    if (!btn) return;
    var snippet = '<a href="https://glocean.dev"><img src="https://glocean.dev/badge.png" width="88" height="31" alt="glocean.dev"></a>';
    var timer;
    btn.addEventListener('click', function () {
      try { navigator.clipboard.writeText(snippet); } catch (e) {}
      btn.textContent = 'copied';
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'copy'; }, 1600);
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
    buildHeader();
    buildSearch();
    bindToggles(document);
    initBadgeCopy();
    initTagFilter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
