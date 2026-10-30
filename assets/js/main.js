/* rkean.github.io UI: reveals, count-up, timeline, nav progress, project panel. No dependencies. */
(() => {
  'use strict';
  const root = document.documentElement;
  const RM = root.classList.contains('rm');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // count-up
  function count(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const to = +el.dataset.count, suf = el.dataset.suf || '';
    if (RM || !isFinite(to)) { el.textContent = fmt(to) + suf; return; }
    const t0 = performance.now(), dur = 1600;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e) + suf; if (k < 1) requestAnimationFrame(step); };
    el.textContent = '0' + suf; requestAnimationFrame(step);
  }

  // reveal
  const rev = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in'); io.unobserve(en.target);
      $$('[data-count]', en.target).forEach(count);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rev.forEach(el => io.observe(el));
  } else { rev.forEach(el => el.classList.add('in')); $$('[data-count]').forEach(count); }

  // scroll-linked: nav progress, timeline fill, active link
  const prog = $('.nav__prog'), tl = $('.tl'), fill = $('.tl__fill'), items = $$('.tl__item');
  const links = $$('.nav__links a'), secs = links.map(a => $(a.getAttribute('href')));
  let ticking = false;
  function onScroll() {
    ticking = false;
    const h = root.scrollHeight - innerHeight, y = scrollY;
    if (prog) prog.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    if (tl && fill) {
      const r = tl.getBoundingClientRect(), mid = innerHeight * .62;
      const k = RM ? 1 : Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
      fill.style.setProperty('--tl', k.toFixed(4));
      items.forEach(it => it.classList.toggle('lit', RM || it.getBoundingClientRect().top < mid));
    }
    let on = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .45) on = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === on));
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); onScroll();

  // project panel
  const panel = $('#panel');
  if (!panel) return;
  const body = $('.panel__body', panel), title = $('#panel-title'), meta = $('.panel__meta', panel);
  const viewer = $('.viewer', panel), vImg = $('img', viewer), vCap = $('figcaption', viewer);
  let shots = [], cur = 0, opener = null;
  const hasDialog = typeof panel.showModal === 'function';

  function show(k) {
    if (!shots.length) return;
    cur = (k + shots.length) % shots.length;
    const b = shots[cur];
    vImg.src = b.dataset.src; vImg.alt = b.dataset.cap; vCap.textContent = `${cur + 1} / ${shots.length} · ${b.dataset.cap}`;
    shots.forEach((s, i) => s.classList.toggle('on', i === cur));
  }
  function open(card, push) {
    const btn = $('.card__open', card), det = $('.card__detail', card);
    if (!btn || !det) return;
    opener = btn;
    title.textContent = $('.card__title', card).textContent;
    meta.textContent = [$('.tag', card).textContent, $('.card__sub', card).textContent].join(' · ');
    body.innerHTML = ''; body.appendChild(det.cloneNode(true)).hidden = false;
    shots = $$('.gal__btn', body);
    shots.forEach((b, i) => b.addEventListener('click', () => { show(i); viewer.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' }); }));
    viewer.hidden = !shots.length; $$('.viewer__nav', viewer).forEach(n => n.hidden = shots.length < 2);
    if (shots.length) show(0);
    if (hasDialog) { if (!panel.open) panel.showModal(); } else panel.setAttribute('open', '');
    root.classList.add('no-scroll'); panel.scrollTop = 0;
    if (push !== false && history.replaceState) history.replaceState(null, '', '#' + card.id);
  }
  function close() {
    if (hasDialog && panel.open) panel.close(); else panel.removeAttribute('open');
  }
  panel.addEventListener('close', () => {
    root.classList.remove('no-scroll');
    if (/^#work-/.test(location.hash) && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    if (opener) opener.focus({ preventScroll: true });
  });
  $$('.card__open').forEach(b => b.addEventListener('click', () => open(b.closest('.card'))));
  $('[data-close]', panel).addEventListener('click', close);
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
  $('.viewer__prev', panel).addEventListener('click', () => show(cur - 1));
  $('.viewer__next', panel).addEventListener('click', () => show(cur + 1));
  panel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && shots.length) { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight' && shots.length) { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'Escape' && !hasDialog) close();
  });
  const fromHash = () => { const m = /^#(work-[\w-]+)$/.exec(location.hash); const c = m && document.getElementById(m[1]); if (c && c.classList.contains('card')) open(c, false); };
  addEventListener('hashchange', fromHash); fromHash();
})();
