// Builds ../index.html from data.mjs so every word of content is plain, crawlable HTML (no JS needed to read it).
// Run: node _build/gen.mjs
import { writeFileSync } from 'node:fs';
import { PROFILE as P, WORKS } from './data.mjs';

const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = n => String(n).padStart(2, '0');
const featured = WORKS.filter(w => w.tag !== 'More' && w.tag !== 'R&D');
const more = WORKS.filter(w => w.tag === 'More' || w.tag === 'R&D');

const stats = [
  { n: 5, suf: '+', label: 'years building production web systems' },
  { n: 100000, suf: '+', label: 'users on a national platform I led as sole core developer' },
  { n: WORKS.length, suf: '', label: 'systems and projects in this portfolio' },
  { n: 95, suf: '%', label: 'classification accuracy on an AI quality-inspection system' },
];
const fmt = n => n.toLocaleString('en-US');

function card(w, i) {
  const img = w.images[0];
  const media = img
    ? `<img src="${img.src}" alt="${e(img.caption)}" loading="lazy" decoding="async" width="800" height="500">`
    : `<div class="card__txt" aria-hidden="true"><span class="mono">${w.images.length ? '' : (w.tag === 'Confidential' ? 'CONFIDENTIAL · NO SCREENSHOTS' : 'NO SCREENSHOTS')}</span><b>${e(w.title)}</b><span class="mono">${e(w.stack.join(' · '))}</span></div>`;
  const gallery = w.images.length ? `<ul class="gal">${w.images.map((m, k) => `<li><button type="button" class="gal__btn" data-src="${m.src}" data-cap="${e(m.caption)}" data-k="${k}"><img src="${m.src}" alt="${e(m.caption)}" loading="lazy" decoding="async"></button></li>`).join('')}</ul>` : '';
  return `
      <article class="card${img ? '' : ' card--text'}" id="work-${w.slug}" data-reveal>
        <button type="button" class="card__open" aria-haspopup="dialog" aria-controls="panel" data-slug="${w.slug}">
          <span class="card__media">${media}</span>
          <span class="card__meta"><span class="mono card__no">${pad(i + 1)} / ${pad(featured.length)}</span><span class="tag mono">${e(w.tag)}</span></span>
          <span class="card__title">${e(w.title)}</span>
          <span class="card__sub mono">${e(w.sector)} · ${e(w.year)}</span>
          <span class="card__cta mono">${w.images.length ? `View details + ${w.images.length} screenshot${w.images.length > 1 ? 's' : ''}` : 'View details'} →</span>
        </button>
        <div class="card__detail" hidden>
          <p class="d-desc">${e(w.desc)}</p>
          ${w.points.length ? `<ul class="d-points">${w.points.map(p => `<li>${e(p)}</li>`).join('')}</ul>` : ''}
          <ul class="chips">${w.stack.map(s => `<li>${e(s)}</li>`).join('')}</ul>
          ${gallery}
          <p class="d-note mono">${e(w.note)}</p>
        </div>
      </article>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(P.name)} | ${e(P.role)}, Kuala Lumpur</title>
<meta name="description" content="${e(P.name)}, ${e(P.role)} in Kuala Lumpur. 5+ years building secure, workflow-heavy web systems for government and enterprise: e-procurement, HRMS, BI dashboards, RBAC and audit trails.">
<meta name="author" content="${e(P.name)}">
<link rel="canonical" href="https://rkean.github.io/">
<meta property="og:type" content="profile">
<meta property="og:url" content="https://rkean.github.io/">
<meta property="og:site_name" content="${e(P.name)}">
<meta property="og:title" content="${e(P.name)} | ${e(P.role)}">
<meta property="og:description" content="Laravel, PHP 8, MySQL, REST APIs, RBAC and audit trails for government and enterprise systems. ${WORKS.length} projects, with screenshots.">
<meta property="og:image" content="https://rkean.github.io/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Portfolio of ${e(P.name)}, ${e(P.role)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(P.name)} | ${e(P.role)}">
<meta name="twitter:description" content="Laravel, PHP 8, MySQL, REST APIs, RBAC and audit trails for government and enterprise systems.">
<meta name="twitter:image" content="https://rkean.github.io/assets/og-image.png">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<link rel="modulepreload" href="assets/vendor/three.module.min.js">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: P.name, jobTitle: P.role, email: 'mailto:' + P.email, telephone: '+60166012962', address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressCountry: 'MY' }, url: 'https://rkean.github.io/', sameAs: [P.linkedin, P.github], knowsAbout: ['Laravel', 'PHP', 'MySQL', 'REST APIs', 'RBAC', 'Audit trails'] })}</script>
<script>document.documentElement.classList.add('js');if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rm');</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="bg" aria-hidden="true"><div class="bg__fallback"></div><canvas id="gl"></canvas><div class="bg__shade"></div></div>

<header class="nav">
  <a class="brand" href="#top" aria-label="${e(P.name)}, back to top"><span class="brand__mark">IZ</span><span class="brand__name mono">IRFAN <sup>©</sup>26’</span></a>
  <nav aria-label="Primary"><ul class="nav__links mono">
    <li><a href="#works">Works</a></li><li><a href="#skills">Skills</a></li><li><a href="#experience">Experience</a></li><li><a href="#contact">Contact</a></li>
  </ul></nav>
  <a class="nav__plaza mono" href="/works/">Enter the plaza ↗</a>
  <span class="nav__prog" aria-hidden="true"></span>
</header>

<main id="main">
  <section class="hero" id="top" data-shape="0" aria-labelledby="hero-name">
    <p class="eyebrow mono"><span class="dot"></span> Senior developer · ${e(P.base)} · Open to roles</p>
    <h1 id="hero-name" class="hero__name"><span>Irfan</span> <span>bin Zainuddin</span></h1>
    <p class="hero__role">PHP / Laravel Developer</p>
    <p class="hero__intro">${e(P.intro)}</p>
    <ul class="hero__facts mono">
      <li>5+ yrs experience</li><li>Government &amp; enterprise systems</li><li>Laravel · PHP 8 · MySQL</li>
    </ul>
    <div class="hero__cta"><a class="btn" href="#works">View selected works</a><a class="btn btn--ghost" href="mailto:${P.email}">${P.email}</a></div>
    <a class="scroll-hint mono" href="#stats" aria-label="Scroll to stats"><span></span>SCROLL</a>
  </section>

  <section class="stats" id="stats" data-shape="1" aria-label="Key figures">
    <ul class="stats__list">
${stats.map(s => `      <li data-reveal><span class="stat__n" data-count="${s.n}" data-suf="${s.suf}">${fmt(s.n)}${s.suf}</span><span class="stat__l mono">${e(s.label)}</span></li>`).join('\n')}
    </ul>
    <p class="stats__note mono">Plus 3 of the 5 main modules of a city-wide government e-procurement platform, in active development.</p>
  </section>

  <section class="works" id="works" data-shape="2" aria-labelledby="works-h">
    <header class="sec-h" data-reveal><p class="mono kicker">01 — Selected works</p><h2 id="works-h">Systems I have built</h2>
      <p class="sec-h__p">Source code for client projects is private. Clients are described by type only. Screenshots come from each system’s user manuals (names, amounts and contact details blurred) or from local runs with invented demo data.</p></header>
    <div class="cards">${featured.map(card).join('')}
    </div>
    <h3 class="more-h mono" data-reveal>More projects</h3>
    <ul class="more">
${more.map(w => `      <li data-reveal><span class="mono tag">${e(w.tag === 'More' ? 'Project' : w.tag)}</span><b>${e(w.title)}</b><span>${e(w.desc)}</span><span class="mono more__stack">${e(w.stack.join(' · '))}</span></li>`).join('\n')}
    </ul>
  </section>

  <section class="skills" id="skills" data-shape="3" aria-labelledby="skills-h">
    <header class="sec-h" data-reveal><p class="mono kicker">02 — Skills</p><h2 id="skills-h">The stack I work in</h2>
      <p class="sec-h__p">${e(P.about[1])}</p></header>
    <div class="skills__grid">
${Object.entries(P.skills).map(([g, list], i) => `      <div class="skill" data-reveal><h3 class="mono"><span>${pad(i + 1)}</span>${e(g)}</h3><ul class="chips">${list.map(s => `<li>${e(s)}</li>`).join('')}</ul></div>`).join('\n')}
    </div>
    <dl class="facts">
${P.facts.map(([k, v]) => `      <div data-reveal><dt class="mono">${e(k)}</dt><dd>${e(v)}</dd></div>`).join('\n')}
    </dl>
  </section>

  <section class="exp" id="experience" data-shape="4" aria-labelledby="exp-h">
    <header class="sec-h" data-reveal><p class="mono kicker">03 — Experience</p><h2 id="exp-h">Where I have worked</h2>
      <p class="sec-h__p">${e(P.about[0])}</p></header>
    <div class="tl"><span class="tl__line" aria-hidden="true"><span class="tl__fill"></span></span><ol>
${P.experience.map(x => `      <li class="tl__item" data-reveal><span class="tl__dot" aria-hidden="true"></span><p class="tl__when mono">${e(x.when)}</p><h3 class="tl__role">${e(x.role)}</h3><p class="tl__where mono">${e(x.where)}</p><ul>${x.points.map(p => `<li>${e(p)}</li>`).join('')}</ul></li>`).join('\n')}
    </ol></div>
  </section>

  <section class="contact" id="contact" data-shape="5" aria-labelledby="contact-h">
    <p class="mono kicker" data-reveal>04 — Contact</p>
    <h2 id="contact-h" class="contact__h" data-reveal>Let’s build something <em>solid.</em></h2>
    <p class="contact__p" data-reveal>Open to Laravel and PHP roles and projects. The quickest way to reach me is email.</p>
    <ul class="contact__list" data-reveal>
      <li><a class="contact__big" href="mailto:${P.email}"><span class="mono">Email</span>${P.email}</a></li>
      <li><a class="contact__big" href="${P.phoneHref}"><span class="mono">Phone</span>${P.phone}</a></li>
    </ul>
    <p class="contact__links mono" data-reveal><a href="${P.linkedin}" rel="noopener" target="_blank">LinkedIn ↗</a><a href="${P.github}" rel="noopener" target="_blank">GitHub ↗</a></p>
    <a class="plaza" href="/works/" data-reveal><span class="mono">Interactive 3D portfolio</span><b>Enter the plaza →</b></a>
  </section>
</main>

<footer class="foot mono"><span>© 2026 ${e(P.name)} · ${e(P.base)}</span><a href="#top">Back to top ↑</a></footer>

<dialog id="panel" class="panel" aria-labelledby="panel-title">
  <div class="panel__in">
    <button type="button" class="panel__x mono" data-close aria-label="Close">ESC ✕</button>
    <p class="panel__meta mono"></p>
    <h2 id="panel-title" class="panel__title"></h2>
    <figure class="viewer" hidden><div class="viewer__img"><img alt=""></div><figcaption class="mono"></figcaption>
      <button type="button" class="viewer__nav viewer__prev" aria-label="Previous screenshot">‹</button><button type="button" class="viewer__nav viewer__next" aria-label="Next screenshot">›</button></figure>
    <div class="panel__body"></div>
  </div>
</dialog>

<script src="assets/js/main.js" defer></script>
<script type="module" src="assets/js/particles.js"></script>
</body>
</html>
`;
writeFileSync(new URL('../index.html', import.meta.url), html);
console.log('index.html', html.length, 'bytes;', featured.length, 'featured,', more.length, 'more');
