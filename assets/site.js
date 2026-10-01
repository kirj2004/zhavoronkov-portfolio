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

/* ── Премиум-слой (этап 1) ──────────────────────────────────────────────────
   Четыре независимые функции, каждая с проверкой наличия своих узлов:
   скрипт подключён ко всем страницам сайта, на resume/products/cases/tools
   этих узлов нет, и функции просто ничего не делают.

   1. reveal()      — появление блоков при скролле (IntersectionObserver)
   2. smoothScroll() — плавная прокрутка к якорям со смещением под шапку
   3. cardGlow()    — подсветка карточек болей за курсором (CSS-переменные)
   4. setYear()     — год в футере
   Плюс painCards() — раскрытие/закрытие карточек по клику и с клавиатуры.
   Без prefers-reduced-motion анимации не запускаются.
*/

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Появление блоков при скролле. Без IntersectionObserver — сразу видимы. */
function reveal() {
  const nodes = document.querySelectorAll(".pfx-reveal");
  if (!nodes.length) return;

  if (REDUCED || !("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("pfx-in-view"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("pfx-in-view");
        io.unobserve(e.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  nodes.forEach((n) => io.observe(n));
}

/** Плавная прокрутка к якорям со смещением, чтобы не залезть под шапку. */
function smoothScroll() {
  const header = document.querySelector(".site-header");
  const offset = () => (header ? header.getBoundingClientRect().height + 12 : 12);

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute("href");
    if (!id || id === "#") return;

    const target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - offset();
    window.scrollTo({ top: Math.max(top, 0), behavior: REDUCED ? "auto" : "smooth" });
    // Фокус на цели — иначе переход по якорю недоступен с клавиатуры.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}

/** Подсветка карточек болей за курсором: пишем координаты в CSS-переменные. */
function cardGlow() {
  const cards = document.querySelectorAll(".pain-card");
  if (!cards.length || REDUCED || !window.matchMedia("(hover: hover)").matches) return;

  cards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--pfx-mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--pfx-my", `${e.clientY - r.top}px`);
    });
  });
}

/** Раскрытие карточек болей: клик по карточке, Enter/Space с клавиатуры. */
function painCards() {
  const cards = document.querySelectorAll(".pain-card");
  if (!cards.length) return;

  cards.forEach((card) => {
    const toggle = () => {
      const open = card.classList.toggle("is-open");
      card.setAttribute("aria-expanded", String(open));
      const label = card.querySelector(".pain-card__toggle-text");
      if (label) label.textContent = open ? "Свернуть" : "Подробнее";
    };

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-expanded", "false");

    card.addEventListener("click", (e) => {
      // Клик по кнопке «У меня такая же проблема» не должен ронять карточку.
      if (e.target.closest("a")) return;
      toggle();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      toggle();
    });
  });
}

/** Год в футере: не даём протухнуть копирайту. */
function setYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-pfx-year]").forEach((el) => {
    el.textContent = el.textContent.replace(/20\d\d/, year);
  });
}


/*
   5. navProgress() — полоса прочитанного в шапке
   6. orderForm()   — заявка в три шага

   navProgress считает по scrollY и высоте документа, а не по числу
   секций: высота — единственная величина, которая одинаково верна и
   на длинной, и на короткой странице.
*/
function navProgress() {
  const bar = document.getElementById("nav-progress");
  if (!bar) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    // -innerHeight: на последнем экране прогресс обязан быть 1, иначе
    // полоса вечно застревает на 95 %.
    const span = doc.scrollHeight - window.innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 1;
    bar.style.transform = `scaleX(${p})`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

/* ── Форма заявки ─────────────────────────────────────────────────────── */

const ORDER_STEPS = 3;

const ORDER_EMAIL = "ip.zhavoronkov.ka@yandex.ru";
const ORDER_MAX = "https://max.ru/u/f9LHodD0cOLdp8PLl5xLOgbVyMIGA-CzKgczzqM_HK-bc2fsqmhaWQNg7Lk";

/** Собирает тему и текст письма из полей формы. Чистая функция: DOM не трогает.
 *
 *  Поддерживает две формы: общую (главная) и экспресс-аудит. Поля экспресса
 *  помечены префиксом ea-, поэтому одна функция покрывает обе без копипасты.
 *  Приоритет у формы — значение data-product на <form>.
 */
export function buildOrderMail(fd, product) {
  const val = (k) => String(fd.get(k) ?? "").trim();
  const briefs = fd.getAll("brief").map(String);
  const channel = String(fd.get("channel") ?? "MAX");

  const lines = [
    product ? `Услуга: ${product}` : "Заявка с портфолио",
    "",
    product ? "" : `Задача: ${val("task") || "не указана"}`,
    // Экспресс-аудит
    fd.get("express") ? "Формат: экспресс-аудит за 24 часа (6 900 ₽)" : "",
    val("cost") ? `Себестоимость: ${val("cost")} ₽` : "",
    val("ea-sku") ? `Артикул или ссылка: ${val("ea-sku")}` : "",
    val("ea-cost") ? `Себестоимость: ${val("ea-cost")} ₽` : "",
    val("ea-api") ? `API-ключ получен: да` : "",
    // Общая форма
    val("shop") ? `Магазин: ${val("shop")}` : "",
    val("sku") ? `SKU: ${val("sku")}` : "",
    val("price") ? `Средняя цена: ${val("price")} ₽` : "",
    val("term") ? `Когда нужно: ${val("term")}` : "",
    val("budget") ? `Бюджет: ${val("budget")}` : "",
    briefs.length ? `Что уже есть: ${briefs.join(", ")}` : "",
    val("name") ? `Обращаться: ${val("name")}` : "",
    `Канал ответа: ${channel}`,
    val("comment") ? `Комментарий: ${val("comment")}` : "",
  ].filter(Boolean);

  const subject = product
    ? `Заявка: ${product}`
    : `Заявка: ${val("task") || "консультация по маркетплейсам"}`;

  return { subject, body: lines.join("\n"), channel };
}

/** Проверяет поля шага, помеченные data-required.
 *  Пустое обязательное поле останавливает переход: отчёт без себестоимости
 *  или без артикула считать нечем. */
function validateStep(panel) {
  const required = Array.from(panel.querySelectorAll("[data-required]"));
  const bad = required.find((el) => !el.value.trim());
  if (!bad) return null;
  bad.classList.add("is-invalid");
  bad.focus();
  return bad;
}

function orderForm() {
  const form = document.getElementById("order-form");
  if (!form) return;

  const product = form.dataset.product || "";
  const hasRequired = Boolean(form.querySelector("[data-required]"));

  // Экспресс-формат делает себестоимость обязательной: без неё точку
  // безубыточности посчитать нельзя, а ради неё форма и заказана.
  const express = form.querySelector('input[name="express"]');
  const cost = form.querySelector("#of-cost");
  const costHint = form.querySelector("[data-cost-hint]");
  if (express && cost) {
    const syncCost = () => {
      const on = express.checked;
      // Атрибут data-required читает валидатор, а required — браузер.
      // Без чекбокса оба снимаются: поле остаётся необязательным, как
      // и было до появления экспресс-формата.
      if (on) cost.dataset.required = "required";
      else delete cost.dataset.required;
      cost.required = on;
      if (costHint) costHint.hidden = !on;
      if (!on) cost.classList.remove("is-invalid");
    };
    express.addEventListener("change", syncCost);
    syncCost();
  }
  form.querySelectorAll("[data-required]").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("is-invalid"));
  });

  const panels = Array.from(form.querySelectorAll(".order-panel"));
  const dots = Array.from(document.querySelectorAll(".order-step"));
  const back = document.getElementById("of-back");
  const next = document.getElementById("of-next");
  const send = document.getElementById("of-send");
  const status = document.getElementById("of-status");
  let step = 1;

  const show = (n) => {
    step = Math.min(ORDER_STEPS, Math.max(1, n));
    panels.forEach((p) => {
      const on = Number(p.dataset.step) === step;
      p.hidden = !on;
      p.classList.toggle("is-open", on);
    });
    dots.forEach((d) => {
      const i = Number(d.dataset.goto);
      d.classList.toggle("is-active", i === step);
      d.classList.toggle("is-done", i < step);
      if (i === step) d.setAttribute("aria-current", "step");
      else d.removeAttribute("aria-current");
    });
    back.hidden = step === 1;
    next.hidden = step === ORDER_STEPS;
    send.hidden = step !== ORDER_STEPS;
    // На первом шаге подсказка нужна, дальше она молчит.
    status.textContent = step === 1
      ? (hasRequired ? "Поля со звёздочкой обязательны" : "Поля со звёздочкой необязательны")
      : "";
    status.classList.remove("is-warn");
  };

  // Вперёд идут только после проверки текущего шага: назад — всегда,
  // иначе застрять в пустом поле было бы невозможно.
  const goNext = () => {
    const bad = validateStep(panels.find((p) => Number(p.dataset.step) === step));
    if (bad) {
      status.textContent = "Заполните обязательное поле";
      status.classList.add("is-warn");
      return;
    }
    show(step + 1);
  };

  dots.forEach((d) => d.addEventListener("click", () => show(Number(d.dataset.goto))));
  back.addEventListener("click", () => show(step - 1));
  next.addEventListener("click", goNext);

  // Enter в одном поле не должен отправлять форму, пока шаг не третий:
  // иначе «дальше» пришлось бы жать мышью.
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (step < ORDER_STEPS) goNext();
  });

  /* Бэкенда нет и не будет: форма пишет письмо, дальше его отправляет
     почтовый клиент пользователя. Так токены и доступы нигде не оседают. */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { subject, body, channel } = buildOrderMail(new FormData(form), product);

    // MAX не умеет deep-link с готовым текстом письма: ссылка-приглашение
    // открывает чат, а сообщение пользователь вставляет сам. Поэтому
    // для MAX дополнительно копируем текст в буфер — иначе пришлось бы
    // переписывать всё письмо руками.
    if (channel === "MAX") {
      const text = `${subject}\n\n${body}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      status.textContent = "Текст заявки скопирован — вставьте его в MAX";
      window.open(ORDER_MAX, "_blank", "noopener");
    } else {
      status.textContent = "Открываю почтовый клиент — отправьте это письмо";
      // Ссылка вместо присваивания location: mailto-клик работает
      // одинаково во всех браузерах.
      const a = document.createElement("a");
      a.href = `mailto:${ORDER_EMAIL}`
        + `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      a.hidden = true;
      form.appendChild(a);
      a.click();
      a.remove();
    }
    status.classList.add("is-warn");
  });

  show(1);
}

document.addEventListener("DOMContentLoaded", () => {
  renderNumbers();
  renderIcons();
  // Иконки грузятся с defer и могут прийти позже DOMContentLoaded.
  window.addEventListener("load", renderIcons, { once: true });

  reveal();
  smoothScroll();
  cardGlow();
  painCards();
  setYear();
  navProgress();
  orderForm();
});