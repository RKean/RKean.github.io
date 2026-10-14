// Set these once the profiles are ready. Empty = shown as "coming soon".
const LINKS = {
  linkedin: "", // e.g. "https://www.linkedin.com/in/your-handle"
  github: ""    // e.g. "https://github.com/your-handle"
};

document.querySelectorAll("[data-placeholder]").forEach((a) => {
  const url = LINKS[a.dataset.placeholder];
  if (url) {
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    const label = a.querySelector("span");
    if (label && a.classList.contains("contact__item")) {
      a.lastChild.textContent = url.replace(/^https?:\/\/(www\.)?/, "");
    }
  } else {
    // Hide until a real URL is set, so visitors never hit a dead link.
    (a.closest("li") || a).hidden = true;
  }
});

const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

document.getElementById("year").textContent = new Date().getFullYear();

// Lightbox for screenshots: groups by data-lightbox, keyboard and swipe friendly.
(() => {
  const dlg = document.getElementById("lightbox");
  if (!dlg || typeof dlg.showModal !== "function") return; // falls back to opening the image link
  const img = dlg.querySelector("img"), cap = dlg.querySelector("figcaption");
  let group = [], i = 0, opener = null;
  const show = () => {
    const a = group[i];
    img.src = a.getAttribute("href");
    img.alt = (a.querySelector("img") || {}).alt || "";
    cap.textContent = (a.dataset.caption || "") + (group.length > 1 ? `  (${i + 1} / ${group.length})` : "");
  };
  const step = (d) => { i = (i + d + group.length) % group.length; show(); };
  document.querySelectorAll("a[data-lightbox]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      opener = a;
      group = [...document.querySelectorAll(`a[data-lightbox="${a.dataset.lightbox}"]`)];
      i = group.indexOf(a);
      dlg.toggleAttribute("data-single", group.length < 2);
      show();
      dlg.showModal();
    })
  );
  dlg.querySelector(".lightbox__close").addEventListener("click", () => dlg.close());
  dlg.querySelector(".lightbox__prev").addEventListener("click", () => step(-1));
  dlg.querySelector(".lightbox__next").addEventListener("click", () => step(1));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  let x0 = null;
  dlg.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  });
  dlg.addEventListener("close", () => { img.removeAttribute("src"); if (opener) opener.focus(); });
})();
