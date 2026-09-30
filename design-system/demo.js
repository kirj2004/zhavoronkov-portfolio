/* ==========================================================================
   demo.js — логика демонстрации компонентов
   Зависимости: format.js (форматирование), Chart.js с CDN (график).
   Данные демонстрационные, обезличенные.
   ========================================================================== */

import {
  formatMoney,
  formatPercent,
  formatNumber,
  formatDate,
  moneyTone,
  kpiClass,
  sparklineSVG,
} from "../assets/format.js";

const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));

/* ── параметры по умолчанию ──────────────────────────────────────────── */

const DEFAULTS = {
  price: 1000,
  cost: 320,
  comm: 18,
  log: 85,
  ads: 12,
  fine: 20,
};

/** Порог доли рекламы, выше которого расходы — предмет внимания. */
const ADS_WARN = 25;

/* ── модель ──────────────────────────────────────────────────────────── */

/**
 * Экономика единицы. Все величины в валюте, проценты — доли цены.
 * @param {{price:number,cost:number,comm:number,log:number,ads:number,fine:number}} p
 */
function econ(p) {
  const commission = p.price * (p.comm / 100);
  const ads = p.price * (p.ads / 100);
  const costs = p.cost + commission + p.log + ads + p.fine;
  const profit = p.price - costs;
  const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
  return { price: p.price, commission, ads, costs, profit, margin, adsShare: p.ads };
}

/** Цена, при которой прибыль равна нулю: (fixed) / (1 − доли). */
function breakEven(p) {
  const fixed = p.cost + p.log + p.fine;
  const share = p.comm / 100 + p.ads / 100;
  const denom = 1 - share;
  return denom > 0.05 ? fixed / denom : null;
}

/* ── калькулятор ─────────────────────────────────────────────────────── */

const INPUTS = ["price", "cost", "comm", "log", "ads", "fine"].map((key) => ({
  key,
  el: $(`#in-${key}`),
  out: $(`#out-${key}`),
}));

const fmt = {
  price: (v) => formatMoney(v, { decimals: 0 }),
  cost: (v) => formatMoney(v, { decimals: 0 }),
  comm: (v) => formatPercent(v, { decimals: 1 }),
  log: (v) => formatMoney(v, { decimals: 0 }),
  ads: (v) => formatPercent(v, { decimals: 0 }),
  fine: (v) => formatMoney(v, { decimals: 0 }),
};

function readParams() {
  const p = {};
  for (const { key, el } of INPUTS) p[key] = Number(el.value);
  return p;
}

function renderInputs(p) {
  for (const { key, out } of INPUTS) {
    out.textContent = fmt[key](p[key]);
  }
}

/* ── модель: параметры текущего расчёта ───────────────────────────────── */

let _p = DEFAULTS;
const costOf = () => _p.cost;
const logOf = () => _p.log;
const fineOf = () => _p.fine;

function renderBreakdown(e) {
  // Порядок строк waterfall: цена, затем вычеты, затем прибыль.
  const items = [
    { label: "Цена продажи", value: e.price, cls: "breakdown-row--total" },
    { label: "Себестоимость", value: -costOf(e), cls: "" },
    { label: "Комиссия площадки", value: -e.commission, cls: "" },
    { label: "Логистика и хранение", value: -logOf(e), cls: "" },
    { label: "Реклама", value: -e.ads, cls: "" },
    { label: "Штрафы и удержания", value: -fineOf(e), cls: "" },
    { label: "Прибыль", value: e.profit, cls: "breakdown-row--total" },
  ];

  $("#out-breakdown").innerHTML = items
    .map((it) => {
      const cls = it.cls ? ` ${it.cls}` : "";
      return (
        `<div class="breakdown-row${cls}">` +
        `<span class="breakdown-label">${it.label}</span>` +
        `<span class="breakdown-value tnum ${kpiClass(it.value)}">` +
        `${formatMoney(it.value, { decimals: 2 })}</span></div>`
      );
    })
    .join("");
}

/* ── метрики расчёта ─────────────────────────────────────────────────── */

function renderMetrics(e) {
  const items = [
    { k: "Маржа", v: e.margin, fmt: (v) => formatPercent(v, { withSign: true }) },
    { k: "Прибыль с единицы", v: e.profit, fmt: (v) => formatMoney(v, { decimals: 2 }) },
    { k: "Доля рекламы", v: e.adsShare, fmt: (v) => formatPercent(v) },
    { k: "Всего вычетов", v: e.costs, fmt: (v) => formatMoney(v, { decimals: 2 }) },
  ];
  $("#out-metrics").innerHTML = items
    .map(
      (it) =>
        `<span><span class="k">${it.k}</span>` +
        `<span class="v ${kpiClass(it.v)}">${it.fmt(it.v)}</span></span>`,
    )
    .join("");
}

function renderState(e, p) {
  const badge = $("#out-state");
  const alert = $("#out-alert");

  if (e.profit < 0) {
    badge.className = "badge badge--loss";
    badge.textContent = "Убыточно";
  } else if (e.margin < 5) {
    badge.className = "badge badge--warning";
    badge.textContent = "Тонкая маржа";
  } else {
    badge.className = "badge badge--profit";
    badge.textContent = "Прибыльно";
  }

  if (e.profit < 0) {
    const be = breakEven(p);
    alert.hidden = false;
    $("#out-alert-text").textContent = be
      ? `Каждая единица уходит в минус на ${formatMoney(Math.abs(e.profit), { decimals: 2 })}. ` +
        `Безубыточная цена при текущих долях — ${formatMoney(be, { decimals: 0 })}.`
      : "Доли вычетов слишком велики: безубыточная цена не существует.";
  } else if (p.ads > ADS_WARN) {
    alert.hidden = false;
    alert.className = "alert alert--warning";
    $("#out-alert-text").textContent =
      `Реклама съедает ${formatPercent(p.ads, { decimals: 0 })} выручки — ` +
      `порог внимания ${ADS_WARN} %.`;
  } else {
    alert.hidden = true;
    alert.className = "alert alert--warning";
  }
}

let chart = null;

function updateChart(p) {
  if (!chart) return;
  const points = [];
  for (let price = 200; price <= 5000; price += 100) {
    points.push({ price, margin: econ({ ...p, price }).margin });
  }
  const be = breakEven(p);
  chart.data.datasets[0].data = points.map((d) => d.margin);
  chart.data.labels = points.map((d) => formatNumber(d.price));
  chart.options.scales.x.ticks.callback = (_v, i) => formatNumber(points[i].price);
  chart.data.datasets[1].data =
    be && be >= 200 && be <= 5000
      ? [
          { x: formatNumber(Math.round(be / 100) * 100), y: 0 },
          { x: formatNumber(Math.round(be / 100) * 100), y: 0 },
        ]
      : [];
  chart.update();
  $("#chart-note").textContent = be
    ? `Безубыточная цена — ${formatMoney(be, { decimals: 0 })}`
    : "Безубыточная цена не существует при текущих долях";
}

function render() {
  const p = readParams();
  _p = p;
  const e = econ(p);
  renderInputs(p);
  renderBreakdown(e);
  renderMetrics(e);
  renderState(e, p);
  updateChart(p);

  $("#out-margin").textContent = formatPercent(e.margin, { withSign: true });
  $("#out-margin").className = "calc-hero-value " + kpiClass(e.margin);
  $("#out-profit").textContent = formatMoney(e.profit, { decimals: 2 });
  $("#out-profit").className = "calc-side-value " + kpiClass(e.profit);
}

/* ── метрики-примеры ─────────────────────────────────────────────────── */

const KPI_SAMPLES = [
  {
    label: "Маржа по каталогу",
    value: "+18,4 %",
    delta: "+2,1 п.п.",
    deltaLabel: "к прошлому периоду",
    tone: "profit",
    spark: [11, 12, 11.5, 14, 15, 14.4, 17, 18.4],
    icon: "trending-up",
  },
  {
    label: "Прибыль за период",
    value: "₽412,6 тыс",
    delta: "−7,3 %",
    deltaLabel: "к прошлому периоду",
    tone: "loss",
    spark: [52, 49, 51, 46, 44, 45, 41, 41.3],
    icon: "wallet-cards",
  },
  {
    label: "Доля рекламы",
    value: "12 %",
    hint: "порог 25 %",
    tone: "neutral",
    spark: [14, 13, 13.5, 12.5, 13, 12, 12],
    icon: "megaphone",
  },
  {
    label: "Позиций в убытке",
    value: "7 из 84",
    delta: "−2",
    deltaLabel: "за месяц",
    tone: "warning",
    spark: [12, 11, 11, 10, 9, 8, 8, 7],
    icon: "triangle-alert",
  },
];

function renderKpis() {
  $("#kpi-row").innerHTML = KPI_SAMPLES.map((k) => {
    // Иконки — Lucide: открытый SVG, currentColor, единая сетка 24×24.
    // Заливка приходит из токена темы, поэтому hex в разметке не нужен.
    const icon = k.icon
      ? `<span class="metric-icon"><i data-lucide="${k.icon}" size="16" ` +
        `stroke-width="1.5" aria-hidden="true"></i></span>`
      : "";
    const spark = k.spark
      ? sparklineSVG(k.spark, { tone: k.tone === "neutral" ? "neutral" : k.tone, label: `${k.label}: тренд` })
      : "";
    // Дельта уже отформатирована со знаком: тон выводим из первого символа.
    const deltaCls = k.delta
      ? k.delta.startsWith("+")
        ? "tone-profit"
        : k.delta.startsWith("−")
          ? "tone-loss"
          : "tone-neutral"
      : "";
    return (
      `<div class="metric">` +
      `<div class="metric-top"><span class="metric-label">${k.label}</span>${icon}</div>` +
      `<div class="metric-body">` +
      `<span class="metric-value ${k.tone === "profit" ? "kpi-profit" : k.tone === "loss" ? "kpi-loss" : "tone-" + k.tone}">${k.value}</span>` +
      spark +
      `</div>` +
      `<div class="metric-foot">` +
      (k.delta ? `<span class="metric-delta tnum ${deltaCls}">${k.delta}</span>` : "") +
      `<span class="metric-hint">${k.deltaLabel || k.hint || ""}</span>` +
      `</div></div>`
    );
  }).join("");
}

/* ── таблица ─────────────────────────────────────────────────────────── */

const ROWS = [
  { name: "Товар A", sub: "арт. 1001 · категория 1", price: 1000, revenue: 184200, margin: 18.4, profit: 33920, state: "ok" },
  { name: "Товар B", sub: "арт. 1002 · категория 2", price: 640, revenue: 91200, margin: 11.2, profit: 10214, state: "ok" },
  { name: "Товар C", sub: "арт. 1003 · категория 1", price: 1290, revenue: 38600, margin: 3.1, profit: 1196, state: "warn" },
  { name: "Товар D", sub: "арт. 1004 · категория 3", price: 490, revenue: 21400, margin: -6.8, profit: -1455, state: "bad" },
  { name: "Товар E", sub: "арт. 1005 · категория 2", price: 2150, revenue: 129000, margin: 26.7, profit: 34443, state: "ok" },
  { name: "Товар F", sub: "арт. 1006 · категория 3", price: 780, revenue: 52300, margin: 8.4, profit: 4393, state: "ok" },
];

const STATE_BADGE = {
  ok: { cls: "badge--profit", label: "Прибыльно" },
  warn: { cls: "badge--warning", label: "Тонкая маржа" },
  bad: { cls: "badge--loss", label: "Убыточно" },
};

function renderRows() {
  $("#rows-body").innerHTML = ROWS.map((r) => {
    const b = STATE_BADGE[r.state];
    return (
      `<tr>` +
      `<td class="cell-stack"><span class="cell-name">${r.name}</span>` +
      `<span class="cell-sub">${r.sub}</span></td>` +
      `<td class="num">${formatMoney(r.price, { compact: true })}</td>` +
      `<td class="num">${formatMoney(r.revenue, { compact: true })}</td>` +
      `<td class="num lead ${kpiClass(r.margin)}">${formatPercent(r.margin, { withSign: true })}</td>` +
      `<td class="num col-md ${kpiClass(r.profit)}">${formatMoney(r.profit, { compact: true })}</td>` +
      `<td class="num"><span class="badge ${b.cls}">${b.label}</span></td>` +
      `</tr>`
    );
  }).join("");
}

/* ── бейджи, прогресс, токены ────────────────────────────────────────── */

function renderBadges() {
  const items = [
    ["badge--profit", "Прибыльно"],
    ["badge--warning", "Внимание"],
    ["badge--loss", "Убыточно"],
    ["badge--info", "Замечание"],
    ["badge--neutral", "Нет данных"],
  ];
  $("#badge-row").innerHTML = items
    .map(([c, l]) => `<span class="badge ${c}">${l}</span>`)
    .join("");
}

function renderProgress() {
  const rows = [
    { label: "Бюджет освоен", value: 64, tone: "" },
    { label: "Достигнуто порога", value: 80, tone: "progress-bar--warning" },
    { label: "Почти исчерпан", value: 95, tone: "progress-bar--warning-strong" },
    { label: "Лимит исчерпан", value: 100, tone: "progress-bar--loss" },
  ];
  $("#progress-row").innerHTML = rows
    .map(
      (r) =>
        `<div><div class="field-row"><span class="field-label">${r.label}</span>` +
        `<span class="field-value">${formatPercent(r.value, { decimals: 0 })}</span></div>` +
        `<div class="progress"><div class="progress-bar ${r.tone}" style="width:${r.value}%"></div></div></div>`,
    )
    .join("");

  // Три ступени шкалы: на 80 % и на 95 % разница обязана быть видна,
  // иначе «приближается к лимиту» и «достигло 95 %» неразличимы.
  $("#alert-scale").innerHTML = [
    ["alert--warning", "triangle-alert", "Порог 80 %: расход приближается к лимиту"],
    ["alert--warning-strong", "triangle-alert", "Порог 95 %: лимит будет достигнут"],
    ["alert--loss", "octagon-alert", "Лимит исчерпан, дальнейшие расходы заблокированы"],
  ]
    .map(
      ([cls, icon, text]) =>
        `<div class="alert ${cls}"><i data-lucide="${icon}" size="16" stroke-width="1.5" ` +
        `aria-hidden="true"></i><span>${text}</span></div>`,
    )
    .join("");
}

const SWATCH_SEMANTIC = [
  "profit", "loss", "warning", "warning-strong", "info", "accent",
  "profit-kpi", "loss-kpi", "focus-ring",
];
const SWATCH_SURFACE = [
  "bg", "surface", "surface-raised", "well", "hover", "overlay",
  "border", "border-strong", "border-control",
];

function renderSwatches(target, prefix, keys) {
  $(target).innerHTML = keys
    .map((k) => {
      const name = `--color-${prefix ? prefix + "-" : ""}${k}`;
      return (
        `<div class="swatch">` +
        `<div class="swatch-chip" style="background:var(${name})"></div>` +
        `<div class="swatch-meta">` +
        `<div class="swatch-name">${k}</div>` +
        `<div class="swatch-val" data-token="${name}">—</div>` +
        `</div></div>`
      );
    })
    .join("");
}

function paintTokenValues() {
  $all("[data-token]").forEach((el) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(el.dataset.token)
      .trim();
    el.textContent = v || "—";
  });
}

/* ── сноски ──────────────────────────────────────────────────────────── */

function initFootnotes() {
  $all(".fn-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = btn.getAttribute("aria-expanded") === "true";
      $all(".fn-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  document.addEventListener("click", () => {
    $all(".fn-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $all(".fn-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
  });
  // Крайние сноски разворачиваются вбок, чтобы не уехать за экран.
  $all(".fn-pop").forEach((pop) => {
    if (pop.getBoundingClientRect().right > window.innerWidth - 24) {
      pop.parentElement.classList.add("fn--right");
    }
  });
}

/* ── тема ────────────────────────────────────────────────────────────── */

function initTheme() {
  const btn = $("#theme-toggle");
  const setLabel = () => {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    btn.textContent = light ? "Тёмная тема" : "Светлая тема";
  };
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", cur === "light" ? "dark" : "light");
    setLabel();
    paintTokenValues();
    render();
    renderIcons();
  });
  setLabel();
}

/* ── график ──────────────────────────────────────────────────────────── */

function initChart() {
  if (typeof Chart === "undefined") return;
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.font.family = css.getPropertyValue("--font-sans").trim();
  Chart.defaults.color = css.getPropertyValue("--color-text-tertiary").trim();

  const ctx = $("#chart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Маржа, %",
          data: [],
          borderColor: css.getPropertyValue("--color-accent").trim(),
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.25,
        },
        {
          label: "Безубыточность",
          type: "line",
          data: [],
          borderColor: css.getPropertyValue("--color-text-tertiary").trim(),
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: css.getPropertyValue("--color-surface-overlay").trim(),
          borderColor: css.getPropertyValue("--color-border-strong").trim(),
          borderWidth: 1,
          titleColor: css.getPropertyValue("--color-text-primary").trim(),
          bodyColor: css.getPropertyValue("--color-text-secondary").trim(),
          callbacks: {
            label: (ctx2) => `Маржа ${formatPercent(ctx2.parsed.y, { withSign: true })}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Цена продажи" },
          grid: { color: css.getPropertyValue("--color-border").trim() },
          ticks: { maxTicksLimit: 8, callback: (v) => formatNumber(v) },
        },
        y: {
          title: { display: true, text: "Маржа, %" },
          grid: { color: css.getPropertyValue("--color-border").trim() },
          ticks: { callback: (v) => formatPercent(v, { decimals: 0 }) },
        },
      },
    },
  });
}

/* ── иконки ──────────────────────────────────────────────────────────── */

/** Lucide подменяет <i data-lucide> на <svg>. Без CDN иконок не будет. */
function renderIcons() {
  if (typeof lucide === "undefined") return;
  if (lucide.createIcons) lucide.createIcons();
}

/* ── инициализация ───────────────────────────────────────────────────── */

function init() {
  // Стартовые значения берём из разметки: HTML — источник состояния,
  // DEFAULTS нужен только для кнопки сброса.
  for (const { key, el } of INPUTS) {
    if (el.value === "") el.value = DEFAULTS[key];
  }

  renderKpis();
  renderRows();
  renderBadges();
  renderProgress();
  renderSwatches("#sw-semantic", "", SWATCH_SEMANTIC);
  renderSwatches("#sw-surface", "", SWATCH_SURFACE);
  paintTokenValues();

  initFootnotes();
  initTheme();
  initChart();

  for (const { el } of INPUTS) {
    el.addEventListener("input", render);
  }
  $("#btn-reset").addEventListener("click", () => {
    for (const { key, el } of INPUTS) el.value = DEFAULTS[key];
    render();
  });

  render();
  renderIcons();
  $("#live-region").textContent = "Калькулятор готов";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

void formatDate;
