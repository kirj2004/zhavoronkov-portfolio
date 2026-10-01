/* case-lab.js — интерактивный расчёт в кейсах 09–12.
 *
 *  ТЗ требует в каждом новом кейсе ползунки (РРЦ, себестоимость, комиссия),
 *  график маржи и точку безубыточности. Кейсы 01–08 имеют статический
 *  график и ползунки им не нужны — поэтому скрипт грузится только там.
 *
 *  Формула повторяет методику econ_v3, а не копирует оферту целиком:
 *   выручка             = цена покупателя × (1 − возврат)
 *   комиссия            = цена × ставка кВВ            (п. 5.1, 12.2)
 *   НДС                 = цена × 5 / 105               (п. 12.2)
 *   доход               = цена − НДС
 *   логистика + ПВЗ     = фиксированные на единицу
 *   реклама             = цена × ДРР                    (сценарий, не норма)
 *   возврат             = цена × доля возврата + логистика возврата
 *
 *  Все суммы считаются НА ПРОДАННУЮ единицу, но выручка берётся с учётом
 *  доли возврата — иначе маржа на каталожную единицу завышается.
 *
 *  Без Chart.js не работает: график рисуется только если window.Chart есть.
 */
(function () {
  "use strict";

  var CFG = window.__CASE_LAB__;
  if (!CFG) return;

  var $ = function (sel) { return document.querySelector(CFG.root + " " + sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(CFG.root + " " + sel)); };

  var rub = function (v, dec) {
    return v.toLocaleString("ru-RU", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  var dec = CFG.dec == null ? 2 : CFG.dec;

  // Формула. Все входы — в ₽ и долях.
  function compute(v) {
    var price = v.price;
    var ret = v.returns;
    // Доля выручки, реально дошедшая до продавца после возврата.
    var effRevenue = price * (1 - ret);
    var commission = price * v.commission;
    var vat = (price * 5) / 105;
    var logistics = v.logistics + v.pvz;
    var ad = price * (v.ad || 0);
    // Возврат: цена покупателя теряется полностью, а логистика платится дважды
    // (туда и обратно) — плюс хранение и утилизация по тарифам п. 7.1.
    var returnCost = (v.logistics * 2 + v.pvz + v.returnFixed) * ret;
    var revenue = effRevenue;
    // НДС 5/105 выделяется из базы (п. 12.2 оферты): это не «налог сверху»,
    // а часть цены, которая не достаётся продавцу.
    var total = commission + vat + logistics + ad + returnCost + v.cost;
    var margin = revenue - total;
    // Безубыточность по РРЦ: цена, при которой маржа = 0. Решаем по цене,
    // поэтому скидку и прочие статьи, зависящие от цены, выносим вправо.
    // margin = P(1-r) - P*c - P*5/105 - P*ad - fixed - r*(2L + pvz + R)
    //   => P * (1 - r - c - 5/105 - ad) = fixed + r*(2L + pvz + R)
    var denom = 1 - ret - v.commission - 5 / 105 - (v.ad || 0);
    var fixed = v.cost + v.logistics + v.pvz;
    var be = denom > 0.01 ? (fixed + ret * (v.logistics * 2 + v.pvz + v.returnFixed)) / denom : null;
    return {
      revenue: revenue, commission: commission, vat: vat, logistics: logistics,
      ad: ad, returnCost: returnCost, total: total, margin: margin,
      marginPct: price > 0 ? (margin / price) * 100 : 0,
      be: be, price: price,
    };
  }

  // Ползунки показывают проценты (33 = 33 %), формула ждёт доли (0,33).
  // Делим здесь, а не в разметке: иначе пришлось бы умножать на 100 в
  // data-lab-default и легко ошибиться в сотню раз.
  var PCT = { commission: true, returns: true, ad: true };

  function read() {
    var v = {};
    $$("[data-lab-slider]").forEach(function (el) {
      var key = el.dataset.labSlider;
      var n = Number(el.value);
      if (!Number.isFinite(n)) n = Number(el.dataset.labDefault) || 0;
      v[key] = PCT[key] ? n / 100 : n;
    });
    // Ползунок есть не в каждом кейсе: у case_10 нет возвратов, у case_11
    // нет ДРР. Без нуля по умолчанию формула получает undefined → NaN.
    ["price", "cost", "commission", "returns", "ad"].forEach(function (k) {
      if (typeof v[k] !== "number" || !Number.isFinite(v[k])) v[k] = k === "price" || k === "cost" ? 0 : (PCT[k] ? 0 : 0);
    });
    // Статьи без ползунков приходят из конфига кейса.
    v.logistics = CFG.logistics || 0;
    v.pvz = CFG.pvz || 0;
    v.extra = CFG.extra || 0;
    return v;
  }

  function paint(r) {
    var set = function (id, text, tone) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      if (tone) el.classList.add("tone-" + tone);
      else el.classList.remove("tone-profit", "tone-loss", "tone-neutral");
    };
    var tone = r.margin >= 0 ? "profit" : "loss";
    set("lab-margin", rub(r.margin, dec) + " ₽", tone);
    set("lab-margin-pct", rub(r.marginPct, 1) + " %", tone);
    set("lab-revenue", rub(r.revenue, dec) + " ₽");
    set("lab-commission", rub(r.commission, dec) + " ₽");
    set("lab-logistics", rub(r.logistics, dec) + " ₽");
    set("lab-ad", rub(r.ad, dec) + " ₽");
    set("lab-return", rub(r.returnCost, dec) + " ₽");
    set("lab-total", rub(r.total, dec) + " ₽");
    set("lab-be", r.be ? rub(r.be, dec) + " ₽" : "—");
    var live = document.getElementById("lab-live");
    if (live) {
      live.textContent =
        "Маржа " + rub(r.margin, dec) + " рублей с единицы, " +
        rub(r.marginPct, 1) + " процента. Безубыточная цена " +
        (r.be ? rub(r.be, dec) + " рублей" : "не достигается") + ".";
    }
    // Метка точки безубыточности на графике.
    // Раньше здесь стояла проверка ax = getElementById("lab-be-label") —
    // такого элемента в разметке нет, поэтому условие всегда было ложно и
    // линия BE не появлялась НИКОГДА. Проверяем сам график.
    if (window.Chart && window.__labChart__) {
      // Ось X — линейная по РРЦ, поэтому подпись ставится по самому
      // значению цены, а не по проценту от максимума: иначе линия
      // безубыточности уезжала в сторону.
      var dataset = window.__labChart__.data.datasets[0];
      // Сравниваем с правой границей ОСИ графика, а не с кратностью BE.
      // Ось строится как max(1,6 × РРЦ, 1,15 × BE), поэтому корректная
      // проверка — попадание метки в диапазон подписей.
      var axisLabels = window.__labChart__.data.labels.map(Number);
      var maxX = axisLabels.length ? Math.max.apply(null, axisLabels) : 0;
      if (r.be && r.be > 0 && r.be <= maxX) {
        dataset.zeroLabel = { x: r.be, text: "безубыточность " + rub(r.be, 0) + " ₽" };
      } else {
        dataset.zeroLabel = null;
      }
      window.__labChart__.update("none");
    }
  }

  function currentSeries(v) {
    // Маржа на 21 точке по РРЦ: показывает форму кривой и положение BE.
    // Ось должна дотягиваться до безубыточности. Раньше верхний
    // предел был жёстко 1,6 × РРЦ: в case_09 доля возврата 30 %, и BE
    // уходил за правый край графика, поэтому метка пропадала при первом
    // же движении ползунка комиссии.
    var be = compute(Object.assign({}, v)).be;
    // CFG.chartMax задан в кейсе как стартовый предел, а не как запрет:
    // ось обязана дотягиваться до безубыточности, иначе при росте
    // комиссии или себестоимости точка BE уходит за правый край.
    var max = Math.max(CFG.chartMax || 0, v.price * 1.6, (be || 0) * 1.15);
    var step = max / 20;
    var out = [];
    for (var i = 0; i <= 20; i++) {
      var p = i * step;
      var vv = Object.assign({}, v, { price: p });
      out.push(Number(compute(vv).margin.toFixed(2)));
    }
    return { labels: out.map(function (_, i) { return Math.round(i * step); }), values: out };
  }

  function initChart(v) {
    var cv = document.getElementById("lab-chart");
    if (!cv || !window.Chart) return;
    var s = currentSeries(v);
    var chart = new window.Chart(cv.getContext("2d"), {
      type: "line",
      data: {
        labels: s.labels,
        datasets: [{
          label: "Маржа с единицы, ₽",
          data: s.values,
          borderColor: "#ff6b35",
          backgroundColor: "rgba(255,107,53,0.12)",
          fill: true,
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 4,
          zeroLabel: null,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (it) { return "РРЦ " + rub(it[0].label, 0) + " ₽"; },
              label: function (it) { return "Маржа " + rub(it.parsed.y, 2) + " ₽"; },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "РРЦ, ₽" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: { title: { display: true, text: "Маржа, ₽" }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
      plugins: [labZeroPlugin()],
    });
    window.__labChart__ = chart;
  }

  // Вертикальная отметка безубыточности. Регистрируется через plugins
  // конструктора: в Chart.js 4 chart.config — геттер, и присваивание
  // chart.config.plugins падает с TypeError, из-за чего не запускался
  // весь расчёт на странице.
  function labZeroPlugin() {
    return {
      id: "labZero",
      afterDatasetsDraw: function (chart) {
        var ds = chart.data.datasets[0];
        var z = ds && ds.zeroLabel;
        if (!z) return;
        // Ось X категорийная (подписи — округлённые РРЦ), поэтому пиксель
        // берём по индексу ближайшей подписи, а не по самому значению:
        // getPixelForValue на категорийной шкале ищет индекс, а не цену.
        var labels = chart.data.labels;
        var idx = 0;
        var best = Infinity;
        for (var i = 0; i < labels.length; i++) {
          var dd = Math.abs(Number(labels[i]) - z.x);
          if (dd < best) { best = dd; idx = i; }
        }
        var x = chart.scales.x.getPixelForValue(idx);
        var ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(16,185,129,0.9)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chart.chartArea.top);
        ctx.lineTo(x, chart.chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#10b981";
        ctx.font = "11px Inter, sans-serif";
        ctx.fillText(z.text, Math.min(x + 6, chart.chartArea.right - 120), chart.chartArea.top + 12);
        ctx.restore();
      },
    };
  }

  function reset() {
    $$("[data-lab-slider]").forEach(function (el) {
      el.value = el.dataset.labDefault;
      var out = el.parentElement && el.parentElement.querySelector("[data-lab-out]");
      if (out) out.textContent = el.dataset.labOut || el.value;
    });
    recalc();
  }

  function recalc() {
    var v = read();
    v.returnFixed = CFG.returnFixed || 0;
    v.ad = v.ad || 0;
    // График пересчитываем здесь же, а не только в initChart: ось X
    // строится от РРЦ, поэтому при смене комиссии или себестоимости
    // кривая уезжает за пределы оси, и точка безубыточности пропадает.
    refreshChart();
    paint(compute(v));
  }

  /** Пересчитывает данные графика под текущие значения ползунков. */
  function refreshChart() {
    var chart = window.__labChart__;
    if (!chart) return;
    var v = read();
    v.returnFixed = CFG.returnFixed || 0;
    v.ad = v.ad || 0;
    var s = currentSeries(v);
    chart.data.labels = s.labels;
    chart.data.datasets[0].data = s.values;
    chart.update("none");
  }

  function bind() {
    $$("[data-lab-slider]").forEach(function (el) {
      el.addEventListener("input", function () {
        var out = el.parentElement && el.parentElement.querySelector("[data-lab-out]");
        if (out) {
          var dec2 = Number(el.dataset.labDec || 0);
          out.textContent = dec2
            ? Number(el.value).toLocaleString("ru-RU", { minimumFractionDigits: dec2, maximumFractionDigits: dec2 }) + (el.dataset.labUnit || "")
            : Number(el.value).toLocaleString("ru-RU") + (el.dataset.labUnit || "");
        }
        recalc();
      });
    });
    var rb = document.querySelector(CFG.root + " [data-lab-reset]");
    if (rb) rb.addEventListener("click", reset);
    // Кнопка PDF: печать того же расчёта с текущими значениями слайдеров.
    var pdfBtn = document.querySelector(CFG.root + " [data-lab-pdf]");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        document.body.classList.add("lab-printing");
        window.print();
        setTimeout(function () { document.body.classList.remove("lab-printing"); }, 500);
      });
    }
  }

  function boot() {
    bind();
    recalc();
    initChart(read());
    // Метка BE ставится в paint(); до создания графика она уходила в
    // пустоту, и точка безубыточности не появлялась на диаграмме.
    recalc();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
