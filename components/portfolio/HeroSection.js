/**
 * HeroSection — первый экран лендинга.
 *
 * Презентационный компонент: принимает данные и отдаёт разметку.
 * Расчётов, запросов и состояния внутри нет — логика на стороне бэкенда.
 */
import React from "react";

/**
 * @typedef {Object} HeroAction
 * @property {string} label   подпись кнопки
 * @property {string} href    адрес перехода
 * @property {boolean} [primary]  основная кнопка (залитая) вместо контурной
 * @property {string} [icon]  имя иконки из набора lucide
 *
 * @typedef {Object} HeroStat
 * @property {string} value  основное число (уже отформатировано)
 * @property {string} label  подпись под числом
 * @property {string} [was]  строка «было …» для контраста
 *
 * @typedef {Object} HeroProps
 * @property {string} title      заголовок; переносы строк — через список lines
 * @property {string} [subtitle] подзаголовок
 * @property {HeroAction[]} actions  кнопки (0–2, обычно две)
 * @property {HeroStat[]} stats      показатели, 2–4 штуки
 * @property {string[]} [proof]      строка доверия, до трёх пунктов
 * @property {boolean} [animate]    включить последовательное появление
 */

export default function HeroSection({
  title,
  subtitle,
  actions = [],
  stats = [],
  proof = [],
  animate = false,
}) {
  // Шаг задержки между блоками: 80 мс — читается как связная волна,
  // а не как случайный разброс.
  const delay = (i) => (animate ? { animationDelay: `${i * 0.08}s` } : undefined);

  return (
    <section className="pfx-hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className={`pfx-hero__title${animate ? " pfx-reveal" : ""}`}>
        {title}
      </h1>

      {subtitle ? (
        <p className={`pfx-hero__sub${animate ? " pfx-reveal" : ""}`} style={delay(1)}>
          {subtitle}
        </p>
      ) : null}

      {actions.length ? (
        <div
          className={`pfx-hero__actions${animate ? " pfx-reveal" : ""}`}
          style={delay(2)}
        >
          {actions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className={`pfx-btn ${a.primary ? "pfx-btn--primary" : "pfx-btn--ghost"}`}
            >
              {a.icon ? <i data-lucide={a.icon} width="16" height="16" aria-hidden="true" /> : null}
              {a.label}
            </a>
          ))}
        </div>
      ) : null}

      {stats.length ? (
        <div className="pfx-stats">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`pfx-stat${animate ? " pfx-reveal" : ""}`}
              style={delay(3 + i)}
            >
              <span className="pfx-stat__value tnum">{s.value}</span>
              <span className="pfx-stat__label">{s.label}</span>
              {s.was ? <span className="pfx-stat__was">{s.was}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {proof.length ? (
        <div className={`pfx-proof${animate ? " pfx-reveal" : ""}`} style={delay(3 + stats.length)}>
          {proof.map((p) => (
            <span key={p} className="pfx-proof__item">
              {p}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
