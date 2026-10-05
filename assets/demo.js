/* Отрисовка демо-страницы: KPI, таблицы и графики Chart.js.
   Все числа берутся из assets/demo-data.js — это те же значения,
   что попали в PDF-отчёты, никаких выдуманных цифр. */

const D = window.DEMO;
const $ = (s) => document.querySelector(s);
const num = (n) => (typeof n === "number" ? n.toLocaleString("ru-RU") : n);
const rub = (n) => `${num(n)} ₽`;
const pct = (n) => `${String(n).replace(".", ",")} %`;

function kpi(el, k, v, note) {
  const d = document.createElement("div");
  d.className = "kpi";
  d.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>` +
    (note ? `<div class="n">${note}</div>` : "");
  el.appendChild(d);
}

function table(el, head, rows) {
  const t = $(el);
  t.innerHTML =
    "<thead><tr>" +
    head.map((h) => `<th class="${h.num ? "num" : ""}">${h.t}</th>`).join("") +
    "</tr></thead><tbody>" +
    rows
      .map(
        (r) =>
          "<tr>" +
          r
            .map((c, i) => {
              const raw = typeof c === "object" ? c.v : c;
              const cls = typeof c === "object" && c.cls ? ` class="${c.cls}"` : "";
              return `<td${i === 0 ? "" : ' class="num"'}${cls}>${raw}</td>`;
            })
            .join("") +
          "</tr>"
      )
      .join("") +
    "</tbody>";
}

/* ── Услуга 1: разбор конкурента ── */
const C = D.competitor;
kpi($("#comp-kpis"), "Рейтинг карточки", String(C.rating).replace(".", ","),
    `${num(C.reviews_total)} отзывов · ${num(C.votes)} голосов`);
kpi($("#comp-kpis"), "Цена сейчас", rub(C.price_now),
    `скидка ${pct(C.discount)} от ${rub(C.price_base)}`);
kpi($("#comp-kpis"), "Остаток", `${C.stock} шт.`,
    `минимум за 12 недель ${rub(C.price_min)}`);
kpi($("#comp-kpis"), "Скачано в анализ", num(C.downloaded),
    `из ${num(C.reviews_total)} · с фото ${C.photo_reviews}`);
kpi($("#comp-kpis"), "Доля отзывов 1–3★", pct(C.bad_share),
    `${C.bad_count} отзывов`);

table("#tbl-card", [{ t: "Показатель" }, { t: "Значение", num: true }], [
  ["Артикул WB", String(C.nm_id)],
  ["Бренд", C.brand],
  ["Категория", C.category],
  ["Текущая цена", rub(C.price_now)],
  ["Базовая цена", rub(C.price_base)],
  ["Скидка", pct(C.discount)],
  ["Среднее / медиана за 12 недель", `${rub(C.price_median)} / ${rub(C.price_median)}`],
]);

table("#tbl-seller", [{ t: "Поле" }, { t: "Значение", num: true }], [
  ["Продавец", C.seller],
  ["ID продавца на WB", C.seller_id],
  [{ v: C.missing, cls: "" }, { v: "не отдаётся WB", cls: "" }],
]);

table("#tbl-defects", [{ t: "Проблема" }, { t: "Отзывов", num: true }],
  C.defects.map((d) => [d.t, num(d.n)]));

/* ── Услуга 2: анализ ниши ── */
const N = D.niche;
kpi($("#niche-kpis"), "Карточек в разборе", num(N.analyzed),
    `найдено по запросу ${num(N.total_found)}`);
kpi($("#niche-kpis"), "Медиана цены", rub(N.median),
    `${rub(N.quartiles.p10)} — ${rub(N.quartiles.max)}`);
kpi($("#niche-kpis"), "Средний рейтинг", String(N.avg_rating).replace(".", ","),
    `доля 1–3★ ${pct(N.bad_share)}`);
kpi($("#niche-kpis"), "Продавцов", num(N.sellers), `${num(N.brands)} брендов`);

$("#sample-note").innerHTML =
  `<strong>О выборке честно:</strong> разобрано ${num(N.analyzed)} карточек из ` +
  `${num(N.total_found)}, которые Wildberries отдаёт по запросу «${N.query}». ` +
  `Число включает весь спектр смежных товаров, не только прямых конкурентов. ` +
  `Динамика цены посчитана по ${num(N.season.products)} карточкам с историей: ` +
  `${num(N.season.up)} вверх, ${num(N.season.down)} вниз, ${num(N.season.flat)} ровно.`;

table("#tbl-leaders",
  [{ t: "Карточка" }, { t: "Рейтинг", num: true }, { t: "Отзывов", num: true }],
  N.leaders.map((l) => [
    `${l.name} · ${l.brand}`,
    String(l.rating).replace(".", ","),
    num(l.reviews),
  ]));

table("#tbl-free", [{ t: "Коридор" }, { t: "Конкурентов", num: true }],
  N.free.map((f) => [`${rub(f.from)} — ${rub(f.to)}`, f.competitors]));

/* Блок «заявлено vs факт» */
const TAG = { yes: ["Да", "yes"], partial: ["Частично", "part"], no: ["Нет", "no"] };
{
  const wrap = $("#tbl-claims");
  const div = document.createElement("div");
  div.className = "card table-scroll";
  div.innerHTML =
    "<table><thead><tr><th>Услуга</th><th>Что заявлено</th>" +
    "<th>Что на самом деле</th><th class='num'>Статус</th></tr></thead><tbody>" +
    D.claimed
      .map((c) => {
        const [label, cls] = TAG[c.v];
        return `<tr><td>${c.s}</td><td>${c.c}</td><td class="claim"><div class="f">${c.f}</div></td>` +
          `<td class="num"><span class="tag ${cls}">${label}</span></td></tr>`;
      })
      .join("") +
    "</tbody></table>";
  wrap.appendChild(div);
}

/* ── Графики ── */
function boot(fn) {
  const go = () => {
    if (typeof Chart === "undefined") return setTimeout(go, 100);
    fn();
  };
  document.readyState === "complete" ? go() : window.addEventListener("load", go);
}

boot(() => {
  const grid = "rgba(163,176,199,.14)";
  const tick = { color: "#a3b0c7", font: { size: 12 } };
  Chart.defaults.color = "#a3b0c7";
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  const tip = {
    backgroundColor: "#1f2b42",
    borderColor: "#33425c",
    borderWidth: 1,
    titleColor: "#e8edf7",
    bodyColor: "#e8edf7",
    padding: 10,
  };

  /* История цены */
  new Chart($("#ch-price"), {
    type: "line",
    data: {
      labels: C.price_history.map((r) => r.d),
      datasets: [{
        label: "Цена, ₽",
        data: C.price_history.map((r) => r.p),
        borderColor: "#5b9bff",
        backgroundColor: "rgba(91,155,255,.14)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: "#5b9bff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tip, callbacks: { label: (c) => rub(Math.round(c.parsed.y)) } },
      },
      scales: {
        y: {
          grid: { color: grid },
          ticks: { ...tick, callback: (v) => num(v) },
          title: { display: true, text: "₽", color: "#7b8aa3" },
        },
        x: { grid: { display: false }, ticks: tick },
      },
    },
  });

  /* Распределение по звёздам */
  const starKeys = ["5", "4", "3", "2", "1"];
  new Chart($("#ch-stars"), {
    type: "bar",
    data: {
      labels: starKeys.map((s) => `${s}★`),
      datasets: [{
        label: "Отзывов",
        data: starKeys.map((s) => C.stars[s]),
        backgroundColor: ["#3ddc97", "#8ab6ff", "#fbbf24", "#ff958c", "#ff6b61"],
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tip,
          callbacks: {
            label: (c) =>
              `${num(c.parsed.x)} отзывов · ${pct(
                Math.round((c.parsed.x / C.reviews_total) * 1000) / 10
              )}`,
          },
        },
      },
      scales: {
        x: { grid: { color: grid }, ticks: { ...tick, callback: (v) => num(v) } },
        y: { grid: { display: false }, ticks: tick },
      },
    },
  });

  /* Ценовые сегменты ниши */
  const q = N.quartiles;
  new Chart($("#ch-seg"), {
    type: "bar",
    data: {
      labels: ["10 % дешевле", "25 % — Q1", "Медиана", "75 % — Q3", "90 % дороже", "Максимум"],
      datasets: [{
        label: "Цена, ₽",
        data: [q.p10, q.p25, q.p50, q.p75, q.p90, q.max],
        backgroundColor: ["#38bdf8", "#5b9bff", "#3ddc97", "#5b9bff", "#8ab6ff", "#fbbf24"],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tip, callbacks: { label: (c) => rub(c.parsed.y) } },
      },
      scales: {
        y: {
          grid: { color: grid },
          ticks: { ...tick, callback: (v) => num(v) },
          title: { display: true, text: "₽", color: "#7b8aa3" },
        },
        x: { grid: { display: false }, ticks: { ...tick, maxRotation: 30, minRotation: 0 } },
      },
    },
  });
});
