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
    a.classList.add("is-placeholder");
    a.title = "Link coming soon";
    a.addEventListener("click", (e) => e.preventDefault());
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
