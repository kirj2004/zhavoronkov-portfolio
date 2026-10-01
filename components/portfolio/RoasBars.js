/**
 * RoasBars — горизонтальные столбцы «было / стало».
 *
 * Ширину полосы задаёт CSS-переменная --v, а не inline width:
 * так при пересчёте страницы не трогается атрибут style и не ломается
 * кэш картинок/шрифтов. MAX-полоса и фактическая — два разных
 * состояния одного товара, поэтому у фактической есть tone.
 */
import React from "react";

/**
 * @typedef {Object} RoasItem
 * @property {string}  label   товар или категория
 * @property {number}  before  значение «было», %
 * @property {number}  after   значение «стало», %
 *
 * @typedef {Object} RoasBarsProps
 * @property {RoasItem[]} items   строки, обычно 3–5
 * @property {number}     [max]   верхняя шкала, %
 * @property {string}     [unit]  подпись шкалы, по умолчанию "%"
 * @property {string}     [caption] подпись под диаграммой
 */
export default function RoasBars({ items = [], max, unit = "%", caption }) {
  // Шкала берётся максимум из данных, но не меньше 10 —
  // иначе значения 3–4% займут весь блок и будут выглядеть как успех.
  const scale = max ?? Math.max(10, ...items.map((i) => Math.max(i.before, i.after)));
  const pct = (v) => `${Math.max(0, Math.min(100, (v / scale) * 100)).toFixed(1)}%`;

  return (
    <figure className="pfx-roas">
      <div className="pfx-roas__legend" aria-hidden="true">
        <span className="pfx-roas__legend-item">было</span>
        <span className="pfx-roas__legend-item pfx-roas__legend-item--after">стало</span>
      </div>

      <ul className="pfx-roas__list">
        {items.map((it) => (
          <li key={it.label} className="pfx-roas__row">
            <span className="pfx-roas__label">{it.label}</span>
            <span className="pfx-roas__bars">
              <span className="pfx-roas__bar pfx-roas__bar--before" style={{ "--v": pct(it.before) }}>
                <span className="pfx-roas__value tnum">
                  {it.before}
                  {unit}
                </span>
              </span>
              <span className="pfx-roas__bar pfx-roas__bar--after" style={{ "--v": pct(it.after) }}>
                <span className="pfx-roas__value tnum">
                  {it.after}
                  {unit}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>

      <figcaption className="pfx-roas__caption">
        {caption ?? `Шкала до ${scale}${unit} от нуля. Отрезки сравнимы между строками.`}
      </figcaption>
    </figure>
  );
}
