const KEY = "itt-theme";

export function initTheme() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("theme");
  const stored = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = fromUrl === "dark" || fromUrl === "light" ? fromUrl : stored ?? (prefersDark ? "dark" : "light");
  applyTheme(theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.setAttribute("aria-pressed", String(theme === "dark"));
    btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(KEY, next);
      btn.setAttribute("aria-pressed", String(next === "dark"));
      btn.textContent = next === "dark" ? "Light mode" : "Dark mode";
    });
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}