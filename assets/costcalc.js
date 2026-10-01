/* costcalc.js — калькулятор себестоимости партии.

   Считает ТОЛЬКО себестоимость. Маржа, комиссии площадки и безубыточность
   в этой форме намеренно не считаются — это предмет платного расчёта.

   Формула:
     себестоимость 1 шт = цена_закупки × курс
                     + (доставка_Китай + доставка_Россия + фулфилмент
                        + доп_расходы) / количество
                     + упаковка_₽/шт

   Проверка на реальном кейсе (case_02, партия 400 шт, себестоимость 32,45 ₽):
     цена 17,50 ₽/шт × 400 = 7 000; доставка по России 2 000;
     фулфилмент 3 500; доставка по Китаю 0; доп. 0
     (7 000 + 2 000 + 3 500) / 400 = 31,25; + упаковка 1,20 = 32,45 ₽ ✓

   Курсы — cbr-xml-daily.ru, JSONP не нужен: там CORS `*`.
*/

const CBR_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
const CBR_TTL_MS = 12 * 60 * 60 * 1000;   // курс меняется раз в сутки

const PART_META = {
  goods: { label: "Товар", color: "#ff6b35" },
  china: { label: "Доставка по Китаю", color: "#f59e0b" },
  russia: { label: "Доставка по России", color: "#38bdf8" },
  fulfillment: { label: "Фулфилмент", color: "#10b981" },
  extra: { label: "Доп. расходы", color: "#a78bfa" },
  pack: { label: "Упаковка", color: "#64748b" },
};

const $ = (id) => document.getElementById(id);

const num = (el, fallback = 0) => {
  const v = Number(String(el.value).replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
};

const rub = (v, dec = 2) =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/* ── Курсы ЦБ ─────────────────────────────────────────────────────────── */

let cbrCache = null;   // { code: rate, date }

async function loadCbr() {
  const status = $("csc-rate-status");
  if (cbrCache && Date.now() - cbrCache.fetchedAt < CBR_TTL_MS) {
    paintRate(cbrCache);
    return cbrCache;
  }
  if (status) {
    status.textContent = "Курс ЦБ РФ загружается…";
    status.classList.remove("csc-rate--error");
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(CBR_URL, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const rates = {};
    for (const [code, v] of Object.entries(data.Valute || {})) {
      // ЦБ отдаёт цену за Nominal единиц: делим, чтобы курс был «за 1 штуку валюты»
      rates[code] = v.Value / (v.Nominal || 1);
    }
    cbrCache = { rates, date: (data.Date || "").slice(0, 10), fetchedAt: Date.now() };
    paintRate(cbrCache);
    return cbrCache;
  } catch (err) {
    // Офлайн или ЦБ недоступен — считаем по последнему ручному курсу,
    // но говорим об этом прямо, чтобы цифра не выглядела проверенной.
    if (status) {
      status.textContent = "Курс ЦБ РФ недоступен — введите курс вручную";
      status.classList.add("csc-rate--error");
    }
    const manual = $("csc-rate-manual");
    if (manual) {
      const rb = document.querySelector('input[name="csc-rate-mode"][value="manual"]');
      if (rb) {
        rb.checked = true;
        manual.hidden = false;
        manual.focus();
      }
    }
    return null;
  }
}

function paintRate(cache) {
  if (!cache) return;
  const status = $("csc-rate-status");
  const mode = document.querySelector('input[name="csc-rate-mode"]:checked');
  const code = $("csc-currency").value;
  if (mode && mode.value === "auto") {
    const rate = code === "RUB" ? 1 : cache.rates[code];
    if (rate) {
      const inp = $("csc-rate");
      if (inp) inp.value = rate.toFixed(4);
      if (status) {
        status.textContent =
          code === "RUB"
            ? "RUB — базовая валюта, курс 1"
            : `Курс ЦБ РФ на ${cache.date}: 1 ${code} = ${rub(rate, 4)} ₽`;
        status.classList.remove("csc-rate--error");
      }
    }
  }
}

/* ── Расчёт ───────────────────────────────────────────────────────────── */

function readInputs() {
  const mode = document.querySelector('input[name="csc-rate-mode"]:checked');
  const qty = Math.max(num($("csc-qty"), 100), 1);
  const currency = $("csc-currency").value;
  // RUB — базовая валюта ЦБ, курс всегда 1. Ручное поле при этом может
  // остаться заполненным от прошлой валюты, поэтому игнорируем его:
  // иначе цена в рублях умножалась бы на курс доллара.
  const rate = currency === "RUB" ? 1 : Math.max(num($("csc-rate"), 1), 0.0001);
  return {
    currency,
    price: Math.max(num($("csc-price")), 0),
    rate,
    rateMode: mode ? mode.value : "auto",
    qty,
    china: Math.max(num($("csc-china")), 0),
    russia: Math.max(num($("csc-russia")), 0),
    pack: Math.max(num($("csc-pack")), 0),
    fulfillment: Math.max(num($("csc-fulfillment")), 0),
    extra: Math.max(num($("csc-extra")), 0),
  };
}

function compute(v) {
  // Закупочная цена переводится в рубли; статьи в валюте закупки — тоже.
  const goodsTotal = v.price * v.rate * v.qty;
  const chinaTotal = v.china * v.rate;
  const batchFixed = v.russia + v.fulfillment + v.extra;
  const batchTotal = goodsTotal + chinaTotal + batchFixed;
  const perUnit = batchTotal / v.qty + v.pack;
  return {
    goodsTotal,
    chinaTotal,
    batchFixed,
    batchTotal,
    perUnit,
    parts: {
      goods: goodsTotal / v.qty,
      china: chinaTotal / v.qty,
      russia: v.russia / v.qty,
      fulfillment: v.fulfillment / v.qty,
      extra: v.extra / v.qty,
      pack: v.pack,
    },
  };
}

function partsForChart(r) {
  return Object.entries(r.parts)
    .filter(([, v]) => v > 0.0000001)
    .map(([k, v]) => ({ label: PART_META[k].label, value: v, color: PART_META[k].color }));
}

/* ── Отрисовка ────────────────────────────────────────────────────────── */

let lastPerUnit = null;
let chart = null;

function renderTable(r, qty) {
  const rows = Object.entries(r.parts)
    .filter(([, v]) => v > 0.0000001)
    .sort((a, b) => b[1] - a[1]);
  const tbody = $("csc-table-body");
  const tfoot = $("csc-table-foot");
  if (!tbody || !tfoot) return;

  tbody.innerHTML = rows
    .map(([k, v]) => {
      const m = PART_META[k];
      const share = r.perUnit > 0 ? (v / r.perUnit) * 100 : 0;
      return `<tr>
        <td><span class="csc-dot" style="background:${m.color}"></span>${m.label}</td>
        <td class="num">${rub(v)} ₽</td>
        <td class="num">${rub(share, 1)} %</td>
      </tr>`;
    })
    .join("");

  tfoot.innerHTML = `<tr>
      <td>Себестоимость 1 шт</td>
      <td class="num">${rub(r.perUnit)} ₽</td>
      <td class="num">100,0 %</td>
    </tr>
    <tr>
      <td>Себестоимость партии (${qty} шт)</td>
      <td class="num">${rub(r.batchTotal)} ₽</td>
      <td class="num">—</td>
    </tr>`;
}

function renderChart(rows, r) {
  const canvas = $("csc-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const data = {
    labels: rows.map((x) => x.label),
    datasets: [
      {
        data: rows.map((x) => x.value),
        backgroundColor: rows.map((x) => x.color),
        borderColor: "#0a0a0f",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };
  if (chart) {
    chart.data = data;
    chart.update();   // плавно, без пересоздания
    return;
  }
  const css = getComputedStyle(document.body);
  chart = new Chart(canvas, {
    type: "doughnut",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      animation: { duration: 420, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const share = total ? (ctx.parsed / total) * 100 : 0;
              return ` ${ctx.label}: ${rub(ctx.parsed)} ₽ (${rub(share, 1)} %)`;
            },
          },
        },
      },
      // центр диаграммы — себестоимость 1 шт
      plugins_centerText: {
        value: () => rub(r.perUnit),
        label: () => "₽ за штуку",
      },
    },
    plugins: [
      {
        id: "cscCenter",
        afterDraw(c) {
          const { ctx, chartArea } = c;
          if (!chartArea) return;
          const x = (chartArea.left + chartArea.right) / 2;
          const y = (chartArea.top + chartArea.bottom) / 2;
          const v = rub(r.perUnit);
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = css.getPropertyValue("--color-text-primary").trim() || "#e8edf7";
          ctx.font = "700 26px Manrope, Inter, sans-serif";
          ctx.fillText(v, x, y - 8);
          ctx.fillStyle = css.getPropertyValue("--color-text-secondary").trim() || "#a3b0c7";
          ctx.font = "500 12px Inter, sans-serif";
          ctx.fillText("₽ за штуку", x, y + 16);
          ctx.restore();
        },
      },
    ],
  });
}

function render() {
  const v = readInputs();
  const r = compute(v);

  const elUnit = $("csc-per-unit");
  const elBatch = $("csc-batch");
  if (elUnit) elUnit.textContent = rub(r.perUnit) + " ₽";
  if (elBatch) elBatch.textContent = rub(r.batchTotal) + " ₽";
  if ($("csc-qty-echo")) $("csc-qty-echo").textContent = v.qty;

  renderTable(r, v.qty);
  const rows = partsForChart(r);
  renderChart(rows, r);

  // пульсация только когда итог реально изменился
  if (lastPerUnit !== null && Math.abs(lastPerUnit - r.perUnit) > 0.005 && elUnit) {
    elUnit.classList.remove("is-pulse");
    void elUnit.offsetWidth;            // рестарт анимации
    elUnit.classList.add("is-pulse");
  }
  lastPerUnit = r.perUnit;

  const live = $("live-region");
  if (live) {
    live.textContent = `Себестоимость одной штуки ${rub(r.perUnit)} рублей. Партия ${
      v.qty
    } штук на ${rub(r.batchTotal)} рублей.`;
  }
}

function toggleRateManual() {
  const mode = document.querySelector('input[name="csc-rate-mode"]:checked');
  const box = $("csc-rate-manual");
  if (!mode || !box) return;
  box.hidden = mode.value !== "manual";
  if (mode.value === "auto") loadCbr();
}

function init() {
  const ids = ["csc-price", "csc-qty", "csc-china", "csc-russia", "csc-pack",
               "csc-fulfillment", "csc-extra", "csc-rate"];
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", render);
  });
  const cur = $("csc-currency");
  if (cur) cur.addEventListener("change", () => { paintRate(cbrCache); render(); });
  document.querySelectorAll('input[name="csc-rate-mode"]').forEach((r) => {
    r.addEventListener("change", toggleRateManual);
  });
  // Chart.js грузится defer — скрипт наш тоже, но порядок не гарантирован
  if (typeof Chart === "undefined") {
    window.addEventListener("load", () => render(), { once: true });
  }
  toggleRateManual();
  render();
  loadCbr().then(render);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
