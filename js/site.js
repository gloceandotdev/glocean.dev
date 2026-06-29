(function () {
  'use strict';

  var GITHUB = 'https://github.com/gloceandotdev';
  var EMAIL  = 'hello@glocean.dev';
  var RSS    = '/feed.xml';

  var root = document.documentElement;
  var sys = window.matchMedia('(prefers-color-scheme: dark)');
  function theme() { return root.getAttribute('data-theme') || 'dark'; }
  function updateFavicon(t) {
    var l = document.getElementById('favicon');
    if (!l) return;
    var base = (l.getAttribute('href') || 'favicon.svg').replace(/favicon(-light)?\.svg.*$/, '');
    l.setAttribute('href', base + (t === 'light' ? 'favicon-light.svg' : 'favicon.svg'));
  }
  function applyTheme(t) { root.setAttribute('data-theme', t); updateFavicon(t); }
  if (sys.addEventListener) {
    sys.addEventListener('change', function (e) {
      if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  var I = {
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="flex:none"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path></svg>',
    github: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"></path></svg>',
    email: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3.5 7.5l8.5 5.5 8.5-5.5"></path></svg>',
    rss: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="19" r="2"></circle><path d="M4 11a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6v-3z"></path><path d="M4 4a16 16 0 0 1 16 16h-3A13 13 0 0 0 4 7V4z"></path></svg>',
    moon: '<svg class="moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sun: '<svg class="sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>'
  };

  var PAGES = [
    { title: 'About',   sub: 'Who I am · /about',          url: '/about' },
    { title: 'Blog',    sub: 'Writing & notes · /blog',    url: '/blog' },
    { title: 'Projects',sub: "Things I've built · /projects", url: '/projects' }
  ];
  var PROJECTS = [
    { title: 'dotfiles',           sub: 'Project · Shell',         url: GITHUB + '/dotfiles' },
    { title: 'iris-rockbox-theme', sub: 'Project · Rockbox theme', url: GITHUB + '/iris-rockbox-theme' },
    { title: '.emacs.d',           sub: 'Project · Emacs Lisp',    url: GITHUB + '/.emacs.d' },
    { title: 'glocean.dev',        sub: 'Project · HTML/CSS/JS',   url: GITHUB + '/glocean.dev' }
  ];
  var POSTS = (window.BLOG_POSTS || []).map(function (p) {
    return { title: p.title, sub: 'Blog post · ' + p.date, url: p.url };
  });
  var INDEX = PAGES.concat(POSTS, PROJECTS);

  function navItem(id, label, dotClass, href, active) {
    return '<a class="nav-item' + (active === id ? ' active' : '') + '" href="' + href + '">' +
      '<span class="dot ' + dotClass + '"></span><span>' + label + '</span></a>';
  }
  function buildSidebar() {
    var el = document.getElementById('sidebar');
    if (!el) return;
    var active = document.body.getAttribute('data-page') || '';
    el.innerHTML =
      '<a class="logo" href="/">Glocean</a>' +
      '<button class="search-trigger" type="button" id="searchTrigger">' + I.search +
        '<span style="flex:1">Search</span><kbd>⌘K</kbd></button>' +
      '<nav>' +
        navItem('about', 'about', 'dot-about', '/about', active) +
        navItem('blog', 'blog', 'dot-blog', '/blog', active) +
        navItem('projects', 'projects', 'dot-projects', '/projects', active) +
      '</nav>' +
      '<div class="spacer"></div>' +
      '<div class="foot"><div class="rule"></div><div class="row">' +
        '<div class="socials">' +
          '<a href="' + GITHUB + '" target="_blank" rel="noopener" aria-label="GitHub">' + I.github + '</a>' +
          '<a href="mailto:' + EMAIL + '" aria-label="Email">' + I.email + '</a>' +
          '<a href="' + RSS + '" aria-label="RSS feed">' + I.rss + '</a>' +
        '</div>' +
        '<button class="theme-toggle" type="button" id="themeToggle" aria-label="Toggle theme">' + I.moon + I.sun + '</button>' +
      '</div></div>';

    var tt = document.getElementById('themeToggle');
    if (tt) tt.addEventListener('click', function () {
      var next = theme() === 'dark' ? 'light' : 'dark';
      if (next === (sys.matches ? 'dark' : 'light')) localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
      applyTheme(next);
    });

    var st = document.getElementById('searchTrigger');
    if (st) st.addEventListener('click', openSearch);
  }

  var overlay, input, results, current = [], sel = 0;

  function buildSearch() {
    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML =
      '<div class="search-box"><div class="field">' + I.search +
      '<input id="searchInput" type="text" placeholder="Search pages, posts, projects…" autocomplete="off" spellcheck="false"></div>' +
      '<div class="search-results" id="searchResults"></div></div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('#searchInput');
    results = overlay.querySelector('#searchResults');

    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeSearch(); });
    input.addEventListener('input', function () { renderResults(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(current[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    });
  }

  function renderResults(q) {
    q = (q || '').trim().toLowerCase();
    current = q
      ? INDEX.filter(function (it) { return (it.title + ' ' + it.sub).toLowerCase().indexOf(q) >= 0; })
      : INDEX.slice();
    sel = 0;
    if (!current.length) { results.innerHTML = '<div class="search-empty">No matches</div>'; return; }
    results.innerHTML = current.map(function (it, i) {
      return '<a href="' + it.url + '" data-i="' + i + '" class="' + (i === 0 ? 'sel' : '') + '">' +
        '<span class="r-title">' + it.title + '</span><span class="r-sub">' + it.sub + '</span></a>';
    }).join('');
    Array.prototype.forEach.call(results.querySelectorAll('a'), function (a) {
      a.addEventListener('mouseenter', function () { setSel(+a.getAttribute('data-i')); });
      a.addEventListener('click', function (e) { e.preventDefault(); go(current[+a.getAttribute('data-i')]); });
    });
  }

  function setSel(i) {
    var as = results.querySelectorAll('a');
    if (!as.length) return;
    if (as[sel]) as[sel].classList.remove('sel');
    sel = (i + as.length) % as.length;
    as[sel].classList.add('sel');
  }
  function moveSel(d) { setSel(sel + d); }

  function go(it) {
    if (!it) return;
    if (/^https?:/.test(it.url)) window.open(it.url, '_blank', 'noopener');
    else window.location.href = it.url;
  }

  function openSearch() {
    overlay.classList.add('open');
    input.value = '';
    renderResults('');
    setTimeout(function () { input.focus(); }, 20);
  }
  function closeSearch() { overlay.classList.remove('open'); }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (overlay.classList.contains('open')) closeSearch(); else openSearch();
    } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeSearch();
    }
  });

  function initFlower() {
    var fc = document.querySelector('.flower-canvas');
    if (!fc || !window.initCornerFlower) return;
    var corner = fc.getAttribute('data-corner') || 'br';
    var co = parseInt(fc.getAttribute('data-color-offset') || '3', 10);
    window.initCornerFlower(fc, theme, { corner: corner, colorOffset: co });
  }

  function initTagFilter() {
    var bar = document.querySelector('.tag-filter');
    if (!bar) return;
    var rows = Array.prototype.slice.call(document.querySelectorAll('.post-row'));
    var chips = Array.prototype.slice.call(bar.querySelectorAll('.tagchip'));
    function apply(tag) {
      rows.forEach(function (r) {
        var tags = (r.getAttribute('data-tags') || '').split(/\s+/);
        r.hidden = !!tag && tags.indexOf(tag) < 0;
      });
      chips.forEach(function (c) { c.classList.toggle('active', (c.getAttribute('data-tag') || '') === tag); });
      history.replaceState(null, '', tag ? '?tag=' + encodeURIComponent(tag) : location.pathname);
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { apply(c.getAttribute('data-tag') || ''); });
    });
    apply(new URLSearchParams(location.search).get('tag') || '');
  }

  function boot() {
    buildSidebar();
    buildSearch();
    initFlower();
    initTagFilter();
    updateFavicon(theme());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
