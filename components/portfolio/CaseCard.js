/**
 * CaseCard — карточка разбора в лендинге.
 *
 * Все денежные значения приходят уже отформатированными строками:
 * компонент ничего не округляет и не пересчитывает. Иначе лендинг
 * и полная страница кейса могут разойтись в копейках.
 */
import React from "react";

/**
 * @typedef {Object} CaseRow
 * @property {string} label   подпись строки
 * @property {string} value   значение строкой (уже отформатировано)
 * @property {"loss"|"profit"|"neutral"} [tone] цвет значения; без tone — обычный
 *
 * @typedef {Object} CaseCardProps
 * @property {string}      number     номер разбора в списке («CASE 01»)
 * @property {string}      title      название товара или кейса
 * @property {string}      [subtitle] краткое описание, одна-две строки
 * @property {string}      [category] переход между категориями, в формате «A → B»
 * @property {number|string} [kpi]     ключевое число (точка безубыточности)
 * @property {string}      [kpiLabel] подпись к ключевому числу
 * @property {CaseRow[]}   [rows]     строки расчёта, 3–6 штук
 * @property {string}      [footnote] сноска под расчётом
 * @property {string}      [href]     адрес полного разбора
 */
export default function CaseCard({
  number,
  title,
  subtitle,
  category,
  kpi,
  kpiLabel,
  rows = [],
  footnote,
  href,
}) {
  return (
    <article className="card case" id={`case-${number.replace(/\D/g, "").padStart(2, "0")}`}>
      <div className="case__num">{number}</div>

      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle ? <p className="card-sub">{subtitle}</p> : null}
      </div>

      {category ? (
        <span className="badge badge--neutral">
          <i data-lucide="layers" width="12" height="12" aria-hidden="true" />
          {category}
        </span>
      ) : null}

      {kpi !== undefined && kpi !== null ? (
        <div className="case__kpi">
          <span className="case__kpi-value mono tnum">{kpi}</span>
          {kpiLabel ? <span className="case__kpi-label">{kpiLabel}</span> : null}
        </div>
      ) : null}

      {rows.length ? (
        <dl className="case__rows">
          {rows.map((r) => (
            <div key={r.label} className="case__row">
              <dt>{r.label}</dt>
              <dd
                className={`mono${
                  r.tone === "loss"
                    ? " tone-loss"
                    : r.tone === "profit"
                      ? " tone-profit"
                      : ""
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footnote ? <p className="case__note">{footnote}</p> : null}

      {href ? (
        <div className="case__foot">
          <span className="case__foot-note">{number.toLowerCase()}</span>
          <a className="case__link" href={href}>
            Смотреть
            <i data-lucide="arrow-up-right" width="14" height="14" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </article>
  );
}
