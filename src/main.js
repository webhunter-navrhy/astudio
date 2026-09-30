(() => {
  /* navigace + mobilní menu */
  const nav = document.getElementById('nav');
  const mbar = document.getElementById('mbar');
  const onScroll = () => {
    nav.classList.toggle('scrolled', scrollY > 10);
    const on = scrollY > 280;
    if (mbar.classList.contains('on') !== on) {
      mbar.classList.toggle('on', on);
      document.documentElement.style.setProperty('--mbar-h', on ? mbar.offsetHeight + 'px' : '0px');
    }
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.getElementById('toggle');
  const menu = document.getElementById('menu');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* odhalování při scrollu */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal, .reveal-group').forEach(el => io.observe(el));

  /* rozvrh — záložky dnů, výchozí je dnešek */
  document.querySelectorAll('[data-sched]').forEach(s => {
    const tabs = [...s.querySelectorAll('.sched-tab')];
    const days = [...s.querySelectorAll('.sched-day')];
    const show = i => {
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
      days.forEach((d, k) => d.classList.toggle('is-on', k === i));
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    show((new Date().getDay() + 6) % 7);
  });

  /* lekce — filtr */
  const chips = [...document.querySelectorAll('.chip[data-filter]')];
  const lessons = [...document.querySelectorAll('.lesson[data-group]')];
  const filter = g => {
    chips.forEach(c => c.classList.toggle('is-on', c.dataset.filter === g));
    lessons.forEach(l => { l.hidden = g !== 'all' && l.dataset.group !== g; });
  };
  chips.forEach(c => c.addEventListener('click', () => filter(c.dataset.filter)));
  const hash = location.hash.replace('#', '');
  if (hash === 'barre') filter('Barre');
  if (hash === 'pilates') filter('Pilates');

  /* FAQ — vždy jedna otevřená ve skupině */
  document.querySelectorAll('.faq').forEach(f => {
    const items = [...f.querySelectorAll('details')];
    items.forEach(d => d.addEventListener('toggle', () => { if (d.open) items.forEach(o => { if (o !== d) o.open = false; }); }));
  });

  /* cookies — Google Analytics se načte až po souhlasu (a jen pokud je v site.json vyplněné ga_id) */
  const KEY = 'astudio-cookies';
  const box = document.getElementById('cookies');
  const gaId = document.body.dataset.ga;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  const loadGA = () => {
    if (!gaId || window.gtag) return;
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', gaId, { anonymize_ip: true });
  };
  const clearGA = () => {
    document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => /^_ga/.test(n)).forEach(n => {
      const host = location.hostname.split('.').slice(-2).join('.');
      [location.hostname, '.' + host].forEach(d => { document.cookie = n + '=; Max-Age=0; path=/; domain=' + d; });
      document.cookie = n + '=; Max-Age=0; path=/';
    });
  };
  const save = analytics => {
    const had = (read() || {}).analytics;
    localStorage.setItem(KEY, JSON.stringify({ analytics, ts: new Date().toISOString() }));
    box.hidden = true;
    if (analytics) loadGA();
    else if (had) { clearGA(); location.reload(); }
  };
  const open = settings => {
    const c = read();
    document.getElementById('cookies-analytics').checked = !!(c && c.analytics);
    document.getElementById('cookies-set').hidden = !settings;
    document.getElementById('cookies-save').hidden = !settings;
    document.getElementById('cookies-toggle').hidden = settings;
    box.hidden = false;
  };
  if (box) {
    const c = read();
    if (!c) open(false); else if (c.analytics) loadGA();
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-cookies]'); if (!a) return;
      const v = a.dataset.cookies;
      if (v === 'all') save(true);
      else if (v === 'none') save(false);
      else if (v === 'settings') open(true);
      else if (v === 'save') save(document.getElementById('cookies-analytics').checked);
    });
    document.querySelectorAll('[data-cookies-open]').forEach(b => b.addEventListener('click', () => open(true)));
  }
})();
