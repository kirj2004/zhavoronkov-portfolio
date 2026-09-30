/* ==========================================================================
   resume.js — поведение страницы резюме
   Зависимость: Lucide с CDN (иконки). Всё остальное — нативный браузер.
   ========================================================================== */

/* ── Печать / сохранение в PDF ─────────────────────────────────────────── */

// window.print() открывает диалог печати, где «Сохранить в PDF» —
// целевой сценарий. Отдельной генерации файла не делаем: headless-версия
// теряет системные шрифты и отдаёт файл хуже, чем делает это сам браузер.
document.getElementById("print-btn")?.addEventListener("click", () => {
  window.print();
});

// Ctrl/Cmd+P — тот же путь, но без напечатанной кнопки в шапке.
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
    // Не перехватываем: событие браузер обработает сам, наша задача —
    // убрать из раскладки то, что на бумаге не нужно.
    document.querySelector(".site-header")?.classList.add("no-print");
  }
});

/* ── Иконки ───────────────────────────────────────────────────────────── */

// Lucide подключён с defer и может прийти позже нашего модуля,
// поэтому ждём его явно, а не полагаемся на порядок.
function paintIcons() {
  if (!window.lucide) return;
  window.lucide.createIcons({
    attrs: { "aria-hidden": "true", focusable: "false" },
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    paintIcons();
    if (!window.lucide) setTimeout(paintIcons, 400);
  });
} else {
  paintIcons();
  if (!window.lucide) setTimeout(paintIcons, 400);
}

/* ── Доступность ──────────────────────────────────────────────────────── */

// Раздел, к которому перешли по якорю, должен быть озвучен: смена
// заголовка страницы без объявления для скринридера незаметна.
const nav = document.querySelector(".nav");
nav?.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute("href"));
  if (!target) return;
  setTimeout(() => {
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, 0);
});
