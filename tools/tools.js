/* tools.js — логика страницы инструментов.

   Калькулятор — прямой порт `econ_v3.py` на JavaScript, чтобы числа
   калькулятора и кейсов считались по одной методике. Расхождение
   порта и эталона — баг, а не расхождение округления.

   Зависимости: ../format.js.
*/

import { formatMoney, formatPercent, kpiClass } from "../assets/format.js";

/* ── Константы методики v3 (см. econ_v3.py) ────────────────────────────── */

const VAT_K = 1.22;
const NDS_RATE = 5.0;
const NDS_KEEP = 1 - 5 / 105;
const USN = 6.0;
const RKO = 1.0;
const ACQ_DEFAULT = 2.2;
const LOGI_BASE = 46.0;
const LOGI_PER_L = 14.0;
const LOGI_COEF = 1.70;
const PVZ = 10.0;
const FULFILMENT = 50.0;
const PRIM = 5.0;
const WAREHOUSE_RATE = 0.08;
const STORAGE_DAYS = 30;
const P_FINE = 0.03;
const FINE_CAP_SHARE = 0.5;

const logistics = (volumeL) =>
  (LOGI_BASE + LOGI_PER_L * Math.max(volumeL - 1, 0)) * LOGI_COEF;

/** prof = coef · base − dbl · base − fix. */
function coefAndFix(model, p) {
  const kv0 = model === "FBS" ? p.kvFbs : p.kvFbw;
  const kvEff = Math.max(kv0, 1) / 100;
  const coef = NDS_KEEP - kvEff - p.acq / 100 - ((USN + RKO) / 100) * NDS_KEEP;
  const logi = logistics(p.volumeL);
  const fix =
    (model === "FBS"
      ? logi + PVZ + FULFILMENT
      : logi + PRIM + WAREHOUSE_RATE * p.volumeL * LOGI_COEF * STORAGE_DAYS) + p.cost;
  const dbl = model === "FBS" ? P_FINE * Math.min(2 * kvEff, FINE_CAP_SHARE) : 0;
  return { coef, fix, dbl };
}

const breakeven = (model, p) => {
  const { coef, fix, dbl } = coefAndFix(model, p);
  return fix / (coef - dbl);
};

const priceForMargin = (target, model, p) => {
  const { coef, fix, dbl } = coefAndFix(model, p);
  return fix / (coef - dbl - target);
};

/** Юнит-экономика на единицу. model: 'FBS' | 'FBW'. */
function econ(model, rrp, p, sellerDisc) {
  const base = rrp * (1 - sellerDisc / 100);
  const kvEff = Math.max(model === "FBS" ? p.kvFbs : p.kvFbw, 1) / 100;
  const nds = base * NDS_RATE / 105;
  const income = base - nds;
  const comm = base * kvEff;
  const acq = base * p.acq / 100;
  const fine =
    model === "FBS"
      ? P_FINE * Math.min(Math.max(base * Math.min(2 * kvEff, FINE_CAP_SHARE), 10), 10000)
      : 0;
  const { fix } = coefAndFix(model, p);
  const profit = income - (comm + acq + income * (USN + RKO) / 100 + fix + fine);
  return { profit, marginPct: rrp ? (profit / rrp) * 100 : 0 };
}

/* ── Связь с DOM ───────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

const FIELDS = {
  rrp: $("in-rrp"),
  disc: $("in-disc"),
  fbs: $("in-fbs"),
  fbw: $("in-fbw"),
  vol: $("in-vol"),
  cost: $("in-cost"),
};

const num = (el, fallback = 0) => {
  const v = Number(el.value);
  return Number.isFinite(v) ? v : fallback;
};

function setText(id, text, toneClass) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  if (toneClass !== undefined) {
    el.classList.remove("kpi-profit", "kpi-loss", "tone-profit", "tone-loss");
    if (toneClass) el.classList.add(toneClass);
  }
}

function render() {
  const rrp = num(FIELDS.rrp);
  const disc = num(FIELDS.disc);
  const p = {
    kvFbs: num(FIELDS.fbs),
    kvFbw: num(FIELDS.fbw),
    volumeL: Math.max(num(FIELDS.vol, 0.01), 0.01),
    cost: Math.max(num(FIELDS.cost), 0),
    acq: ACQ_DEFAULT,
  };

  setText("out-fbs", formatPercent(p.kvFbs));
  setText("out-fbw", formatPercent(p.kvFbw));

  const fbs = econ("FBS", rrp, p, disc);
  const fbw = econ("FBW", rrp, p, disc);

  setText("o-fbs", formatMoney(fbs.profit, { decimals: 0 }), kpiClass(fbs.profit));
  setText("o-fbw", formatMoney(fbw.profit, { decimals: 0 }), kpiClass(fbw.profit));
  setText("o-be-fbs", formatMoney(breakeven("FBS", p), { decimals: 0 }));
  setText("o-be-fbw", formatMoney(breakeven("FBW", p), { decimals: 0 }));
  setText("o-buyer", formatMoney(rrp * (1 - disc / 100), { decimals: 0 }));
  setText("o-logi", formatMoney(logistics(p.volumeL), { decimals: 2 }));
  setText("o-m20-fbs", formatMoney(priceForMargin(0.2, "FBS", p), { decimals: 0 }));
  setText("o-m20-fbw", formatMoney(priceForMargin(0.2, "FBW", p), { decimals: 0 }));

  const better = fbs.profit >= fbw.profit ? "FBS" : "FBW";
  const gap = Math.abs(fbs.profit - fbw.profit);
  setText(
    "o-verdict",
    gap < 1 ? "схемы равны" : `${better} выгоднее на ${formatMoney(gap, { decimals: 0 })}`,
    null,
  );

  const live = document.getElementById("live-region");
  if (live) {
    live.textContent = `Прибыль FBS ${formatMoney(fbs.profit, { decimals: 0 })}, FBW ${formatMoney(
      fbw.profit,
      { decimals: 0 },
    )}. Безубыточность FBS ${formatMoney(breakeven("FBS", p), { decimals: 0 })}, FBW ${formatMoney(
      breakeven("FBW", p),
      { decimals: 0 },
    )}.`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  Object.values(FIELDS).forEach((el) => el && el.addEventListener("input", render));
  render();
});
