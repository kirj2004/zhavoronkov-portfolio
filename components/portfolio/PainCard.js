/**
 * PainCard — карточка «боли клиента» с раскрывающимся блоком.
 *
 * Собственного состояния нет: раскрытие контролирует родитель
 * (см. проп open и колбэк onToggle). Так карточки нельзя случайно
 * рассинхронизировать между собой.
 */
import React from "react";

/**
 * @typedef {Object} PainBlock
 * @property {string} label  заголовок блока («Что происходит», «Как решаем»)
 * @property {string} text   текст блока
 *
 * @typedef {Object} PainCardProps
 * @property {string}      title     короткое имя проблемы
 * @property {string}      [quote]   прямая речь клиента — цитата без кавычек
 * @property {string}      [icon]    имя иконки lucide
 * @property {PainBlock[]} [blocks]  раскрывающиеся блоки, 1–3 штуки
 * @property {string}      [ctaLabel]   подпись ссылки внизу карточки
 * @property {string}      [ctaHref]    адрес ссылки
 * @property {boolean}     [open]    раскрыта ли карточка
 * @property {() => void}  [onToggle]  обработчик раскрытия
 */
export default function PainCard({
  title,
  quote,
  icon,
  blocks = [],
  ctaLabel,
  ctaHref = "#contacts",
  open = false,
  onToggle,
}) {
  const bodyId = `pain-body-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <article className="pain-card pfx-reveal">
      {icon ? (
        <span className="pain-card__icon">
          <i data-lucide={icon} width="18" height="18" aria-hidden="true" />
        </span>
      ) : null}

      <h3 className="pain-card__title">{title}</h3>

      {quote ? <p className="pain-card__quote">«{quote}»</p> : null}

      {blocks.length ? (
        <>
          <div className="pain-card__toggle">
            {onToggle ? (
              <button
                type="button"
                className="pain-card__toggle-btn"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={onToggle}
              >
                <span className="pain-card__toggle-text">
                  {open ? "Свернуть" : "Подробнее"}
                </span>
                <i
                  data-lucide="chevron-down"
                  width="18"
                  height="18"
                  className={`pain-card__chevron${open ? " is-open" : ""}`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span className="pain-card__toggle-text">Подробнее</span>
            )}
          </div>

          <div id={bodyId} className="pain-card__body" hidden={!open}>
            <div className="pain-card__body-inner">
              {blocks.map((b) => (
                <div key={b.label} className="pain-block">
                  <span className="pain-block__label">{b.label}</span>
                  <p className="pain-block__text">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {ctaLabel ? (
        <a className="pain-card__cta" href={ctaHref}>
          {ctaLabel}
        </a>
      ) : null}
    </article>
  );
}
