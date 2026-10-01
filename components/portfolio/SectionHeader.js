/**
 * SectionHeader — заголовок секции с подзаголовком и ссылкой «смотреть всё».
 *
 * aria-labelledby в самой секции ссылается на id, который этот
 * компонент и ставит. Поэтому idToProps обязателен: без него
 * скринридер не найдёт заголовок секции по ссылке из разметки.
 */
import React from "react";

/**
 * @typedef {Object} SectionHeaderProps
 * @property {string}  title      заголовок секции
 * @property {string}  [subtitle] пояснение под заголовком (принимается секцией)
 * @property {string}  [note]     короткая пометка справа (не кликабельная)
 * @property {string}  [noteHref] если задан — пометка становится ссылкой
 * @property {string}  [noteText] текст ссылки (по умолчанию note)
 * @property {string}  idToProps  id заголовка, который внешняя <section>
 *                                 объявит в aria-labelledby
 * @property {string}  [icon]     иконка рядом с текстом ссылки
 */
export default function SectionHeader({
  title,
  subtitle,
  note,
  noteHref,
  noteText,
  idToProps,
  icon = "arrow-up-right",
}) {
  if (!idToProps) {
    // Компонент не должен молча ломать доступность: лучше громкая ошибка
    // на этапе разработки, чем секция без имени для скринридера.
    throw new Error("SectionHeader: обязательный проп idToProps не передан");
  }

  return (
    <div className="section-head">
      <h2 className="section-title" id={idToProps}>
        {title}
      </h2>

      {noteHref ? (
        <a className="section-note section-note--link" href={noteHref}>
          {noteText ?? note}
          <i data-lucide={icon} width="14" height="14" aria-hidden="true" />
        </a>
      ) : note ? (
        <span className="section-note">{note}</span>
      ) : null}

      {subtitle ? <p className="section-lead">{subtitle}</p> : null}
    </div>
  );
}
