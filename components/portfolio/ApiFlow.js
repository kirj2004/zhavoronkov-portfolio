/**
 * ApiFlow — схема пути данных «кабинет → API → расчёт → отчёт».
 *
 * Порядок узлов фиксирован в компоненте, а не приходит пропсом:
 * переставить шаги схемы должен бэкенд, а не вёрстка. В data-атрибуте
 * data-steps отдаётся строковое описание для скринридера.
 */
import React from "react";

/** Канонический порядок шагов. Всё остальное — чистая разметка. */
const STEPS = [
  { key: "cabinet", label: "Ваш кабинет", icon: "layout-dashboard" },
  { key: "api", label: "Seller API", icon: "plug" },
  { key: "model", label: "Расчёт юнит-экономики", icon: "calculator" },
  { key: "report", label: "Отчёт с цифрами", icon: "file-text", out: true },
];

/**
 * @typedef {Object} ApiFlowProps
 * @property {{label: string, count: number}[]} [sources] что отдаёт кабинет (методы API)
 * @property {string} [caption]  пояснение под схемой
 * @property {string[]} [steps]  переопределить подписи узлов (длина может отличаться)
 */
export default function ApiFlow({ sources = [], caption, steps }) {
  const labels = steps && steps.length === STEPS.length
    ? STEPS.map((s, i) => ({ ...s, label: steps[i] }))
    : STEPS;

  const flowLabel = labels.map((s) => s.label).join(" → ");

  return (
    <section className="pfx-api" aria-labelledby="api-flow-title">
      <h2 id="api-flow-title" className="section-title">
        Как я получаю данные
      </h2>

      <div className="api-flow" role="img" aria-label={flowLabel} data-steps={flowLabel}>
        {labels.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 ? (
              <i data-lucide="arrow-right" width="16" height="16" aria-hidden="true" />
            ) : null}
            <span className={`api-flow__node${s.out ? " api-flow__node--out" : ""}`}>
              {s.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {sources.length ? (
        <ul className="pfx-api__sources">
          {sources.map((s) => (
            <li key={s.label} className="pfx-api__source">
              <code className="code">{s.label}</code>
              <span className="pfx-api__source-note">{s.count}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {caption ? <p className="section-lead">{caption}</p> : null}
    </section>
  );
}
