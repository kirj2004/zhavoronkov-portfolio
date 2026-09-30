/* ==========================================================================
   format.js — форматирование чисел и дат (ru-RU)
   Единственная точка правды о выводе денег, процентов и дат.

   Правила:
   — валюта без пробела перед знаком: «₽1 500», минус выносится перед
     знаком валюты: «−₽500», а не «₽-500»;
   — типографский минус U+2212, не ASCII-дефис U+002D: локаль ru-RU в
     браузере и в Node отдаёт обычный дефис, а дизайн требует U+2212;
   — разряды разделяются неразрывным пробелом (U+00A0);
   — compact-режим делит на 1000, а не на множитель с нулём:
     «₽1,5 тыс», а не «₽1 500 тыс»;
   — отсутствие данных — тире «—», не ноль;
   — тон выражает смысл, а не модуль: ноль нейтрален, не красный.
   ========================================================================== */

const NBSP = " ";
const MINUS = "−";

/** Приводит дефис локали к типографскому минусу. */
function typographicSign(body) {
  return body.replace(/-/g, MINUS);
}

function isNum(value) {
  return value !== null && value !== undefined && !Number.isNaN(value);
}

/**
 * Деньги. ₽ без пробела, разряды неразрывным пробелом.
 * @param {number|null|undefined} value
 * @param {{compact?: boolean, decimals?: number, withSign?: boolean}} [options]
 * @returns {string}
 */
export function formatMoney(value, options = {}) {
  if (!isNum(value)) return "—";
  const { compact = false, decimals = 0, withSign = false } = options;

  const abs = Math.abs(value);
  // Минус выносим перед знаком валюты: «−₽500».
  const sign = value < 0 ? MINUS : withSign && value > 0 ? "+" : "";

  if (compact && abs >= 1000000) {
    return `${sign}₽${(abs / 1000000).toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${NBSP}млн`;
  }
  if (compact && abs >= 1000) {
    // Делим на 1000: «₽1,5 тыс», а не «₽1 500 тыс».
    return `${sign}₽${(abs / 1000).toLocaleString("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${NBSP}тыс`;
  }

  return `${sign}₽${abs.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Проценты. Один знак; при дельте — со знаком, но не двойной минус.
 * @param {number|null|undefined} value
 * @param {{decimals?: number, withSign?: boolean}} [options]
 */
export function formatPercent(value, options = {}) {
  if (!isNum(value)) return "—";
  const { decimals = 1, withSign = false } = options;
  const body = typographicSign(
    value.toLocaleString("ru-RU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );
  // Знак минуса приходит из локали вместе с body («−5,0») — свой префикс
  // дал бы «−−5,0%». Добавляем только плюс, которого локаль не даёт.
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${body}%`;
}

/**
 * Число без валюты и процента.
 * @param {number|null|undefined} value
 * @param {number} [decimals]
 */
export function formatNumber(value, decimals = 0) {
  if (!isNum(value)) return "—";
  return typographicSign(
    value.toLocaleString("ru-RU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );
}

/**
 * Тон значения: смысл, а не модуль.
 * @param {number|null|undefined} value
 * @returns {"profit"|"loss"|"neutral"}
 */
export function moneyTone(value) {
  if (!isNum(value) || value === 0) return "neutral";
  return value > 0 ? "profit" : "loss";
}

/** CSS-класс тона для текстового элемента. */
export function toneClass(value) {
  return `tone-${moneyTone(value)}`;
}

/** CSS-класс тона для KPI-плитки: AAA-контраст, отдельные токены. */
export function kpiClass(value) {
  const tone = moneyTone(value);
  if (tone === "profit") return "kpi-profit";
  if (tone === "loss") return "kpi-loss";
  return "tone-neutral";
}

/**
 * Дата. Невалидная строка и пустое значение — тире, не «Invalid Date».
 * @param {string|null|undefined} iso
 */
export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Дата и время до минуты. */
export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** «3 ч назад» — для подписи времени обновления. */
export function timeAgo(iso) {
  if (!iso) return "никогда";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "никогда";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

/** ISO-дата в локальном часовом поясе, без сдвига в UTC. */
export function toISODate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Период «последние N дней» как пара границ дат. */
export function periodFromDays(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { date_from: toISODate(from), date_to: toISODate(to) };
}

/* ==========================================================================
   Инлайн-спарклайн
   Полилайн строится вручную: у демо нет зависимостей, а Chart.js
   для 96×24 пикселей — оверинжиниринг.
   ========================================================================== */

/**
 * @param {number[]} data
 * @param {{width?: number, height?: number, tone?: "accent"|"profit"|"loss"|"neutral"|"warning", label?: string}} [options]
 * @returns {string} SVG-разметка
 */
export function sparklineSVG(data, options = {}) {
  const { width = 96, height = 24, tone = "accent", label = "График тренда" } = options;
  if (!Array.isArray(data) || !data.length) return "";

  const stroke = {
    accent: "var(--color-accent)",
    profit: "var(--color-profit)",
    loss: "var(--color-loss)",
    neutral: "var(--color-text-tertiary)",
    warning: "var(--color-warning)",
  }[tone];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((v - min) / range) * (height - 2) - 1).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `role="img" aria-label="${label}">` +
    `<polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="1.5" ` +
    `stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` +
    `</svg>`
  );
}
