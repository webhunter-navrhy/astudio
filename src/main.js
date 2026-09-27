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
})();
