/* site.js — логика главной страницы портфолио.

   Зависимости: format.js (форматирование ru-RU), Lucide CDN (иконки).
   Числа в разметке лежат сырыми в data-атрибутах и подставляются здесь:
   единственная точка правды о формате — format.js.

   Атрибуты:
     data-money="1234.5"  — деньги, data-dec — знаков после запятой
     data-pct            — проценты из data-money
     data-pct-num="36"   — проценты из целого числа
*/

import { formatMoney, formatPercent } from "./format.js";

const ATTR = { money: "data-money", dec: "data-dec", pct: "data-pct", pctNum: "data-pct-num" };

/** Подставляет отформатированное значение в элемент. */
function fill(el) {
  const num = Number(el.getAttribute(ATTR.money) ?? el.getAttribute(ATTR.pctNum));
  if (!Number.isFinite(num)) return;

  if (el.hasAttribute(ATTR.pct) || el.hasAttribute(ATTR.pctNum)) {
    el.textContent = formatPercent(num, { decimals: 1 });
    return;
  }

  const dec = Number(el.getAttribute(ATTR.dec) ?? 0);
  el.textContent = formatMoney(num, { decimals: dec });
}

/** Заполняет все числа на странице. */
function renderNumbers(root = document) {
  const selector = Object.values(ATTR)
    .map((a) => `[${a}]`)
    .join(",");
  root.querySelectorAll(selector).forEach(fill);
}

/** Иконки Lucide: strokeWidth 1.5 — правило дизайн-системы. */
function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.5, "aria-hidden": "true", focusable: "false" },
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNumbers();
  renderIcons();
  // Иконки грузятся с defer и могут прийти позже DOMContentLoaded.
  window.addEventListener("load", renderIcons, { once: true });
});
