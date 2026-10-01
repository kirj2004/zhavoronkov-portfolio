/**
 * ContactItem — один канал связи в блоке контактов.
 *
 * Внешние ссылки всегда с rel="noopener": переходы на MAX и почту
 * открывают сторонний контекст, target с этим атрибутом безопасен.
 * Мыло собирается через mailto:, отдельная обработка не нужна.
 */
import React from "react";

/**
 * @typedef {Object} ContactItemProps
 * @property {string}  label   канал («MAX», «Email», «Telegram»)
 * @property {string}  value  показываемое значение (уже отформатировано)
 * @property {string}  [href] адрес; для email можно передать "ip@…", mailto добавится сам
 * @property {"max"|"email"|"telegram"|"phone"} [channel] тип канала — влияет на иконку
 * @property {boolean} [external]  внешняя ссылка (по умолчанию — mailto и tel считаются внутренними)
 */
const ICONS = {
  max: "message-circle",
  email: "mail",
  telegram: "send",
  phone: "phone",
};

export default function ContactItem({ label, value, href, channel = "email", external }) {
  const href2 =
    href && !/^(https?:|mailto:|tel:)/.test(href)
      ? channel === "email"
        ? `mailto:${href}`
        : href
      : href;

  const isExternal = external ?? Boolean(href2 && /^https?:/.test(href2));

  return (
    <a
      className="contact"
      href={href2}
      {...(isExternal ? { rel: "noopener" } : {})}
    >
      <span className="contact__icon">
        <i data-lucide={ICONS[channel] ?? "link"} width="20" height="20" aria-hidden="true" />
      </span>
      <span className="contact__body">
        <span className="contact__label">{label}</span>
        <span className="contact__value tnum">{value}</span>
      </span>
      <i data-lucide="arrow-up-right" width="16" height="16" aria-hidden="true" />
    </a>
  );
}
