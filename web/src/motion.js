/** Section reveal + hero count-up; disabled under prefers-reduced-motion. */
export function initMotion() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".reveal").forEach((el) => {
    if (reduced) {
      el.classList.add("is-visible");
      return;
    }
    el.classList.add("reveal-pending");
  });
  if (reduced) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          entry.target.classList.remove("reveal-pending");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  document.querySelectorAll(".reveal-pending").forEach((el) => io.observe(el));

  const heroNum = document.querySelector("[data-count-to]");
  if (heroNum && !reduced) {
    const target = Number(heroNum.dataset.countTo);
    const suffix = heroNum.dataset.countSuffix ?? "";
    const duration = 1800;
    const start = performance.now();
    const from = 1.0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const val = from + (target - from) * eased;
      heroNum.textContent = `${val.toFixed(2)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}