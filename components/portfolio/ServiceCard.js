/**
 * ServiceCard — карточка услуги: иконка, название, суть, результат.
 * Чистый рендер, без состояния.
 */
import React from "react";

/**
 * @typedef {Object} ServiceCardProps
 * @property {string}  title    название услуги
 * @property {string}  [subtitle] короткое пояснение в одну строку
 * @property {string}  [text]   подробное описание
 * @property {string}  [outcome] что клиент получает на выходе
 * @property {string}  [icon]   имя иконки lucide
 */
export default function ServiceCard({
  title,
  subtitle,
  text,
  outcome,
  icon,
}) {
  return (
    <article className="card service">
      {icon ? (
        <span className="service__icon">
          <i data-lucide={icon} width="18" height="18" aria-hidden="true" />
        </span>
      ) : null}

      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle ? <p className="card-sub">{subtitle}</p> : null}
      </div>

      {text ? <p className="service__text">{text}</p> : null}
      {outcome ? <p className="service__meta">{outcome}</p> : null}
    </article>
  );
}
