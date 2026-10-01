/**
 * ContactForm — трёхшаговая форма «обсудить задачу».
 *
 * Шаги скрыты не через display:none, а через hidden на fieldset:
 * нативная форма не отправит скрытые поля, и пользователь не сможет
 * уйти с третьего шага, оставив пустые обязательные поля.
 *
 * Отправки нет: компонент вызывает onSubmit с собранными данными.
 * Фактическую отправку (письмо, CRM, Telegram) делает бэкенд.
 */
import React, { useState } from "react";

/** Порядок шагов. label используется и в прогрессе, и в заголовке панели. */
export const STEPS = [
  { n: 1, label: "Задача", title: "Что нужно сделать" },
  { n: 2, label: "Контекст", title: "Что уже известно" },
  { n: 3, label: "Контакты", title: "Как с вами связаться" },
];

/** Чипы на шаге «Контекст». Ограничение по числу — не проверяем:
 *  значение придёт в бэкенд, и уже он решит, что допустимо. */
export const BRIEF_OPTIONS = [
  "Доступ к API WB",
  "Выгрузка CSV",
  "Архив заказов",
  "Касса и эквайринг",
  "Ничего — нужен аудит с нуля",
];

/**
 * @typedef {Object} ContactFormProps
 * @property {string[]} [channels]   доступные каналы связи для выбора
 * @property {(data: {task: string, brief: string[], channel: string, contact: string}) => void} [onSubmit]
 * @property {boolean} [sent]  true после успешной отправки — показать заглушку
 * @property {string}   [error] текст ошибки отправки
 */
export default function ContactForm({ channels = ["MAX", "Email"], onSubmit, sent = false, error }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ task: "", brief: [], channel: channels[0], contact: "" });
  const [touched, setTouched] = useState(false);

  const max = STEPS[STEPS.length - 1].n;

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const toggleBrief = (value) =>
    setData((d) => ({
      ...d,
      brief: d.brief.includes(value) ? d.brief.filter((v) => v !== value) : [...d.brief, value],
    }));

  // Пропуск вперёд только если шаг заполнен: без этого можно дойти
  // до контактов, не описав задачу, и отправить пустую заявку.
  const stepValid = (n) =>
    n === 1 ? data.task.trim().length > 0
    : n === 2 ? data.brief.length > 0
    : data.contact.trim().length > 0;

  const goTo = (n) => {
    if (n <= step) { setStep(n); return; }
    for (let k = step; k < n; k += 1) {
      if (!stepValid(k)) { setStep(k); setTouched(true); return; }
    }
    setStep(n);
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    for (let k = 1; k <= max; k += 1) {
      if (!stepValid(k)) { setStep(k); return; }
    }
    onSubmit?.(data);
  };

  if (sent) {
    return (
      <section className="pfx-form pfx-reveal" aria-live="polite">
        <h2 className="section-title">Заявка отправлена</h2>
        <p className="section-lead">
          Вернусь в {data.channel} или на почту с первичной экономикой и сроками по тексту.
        </p>
      </section>
    );
  }

  return (
    <section className="order pfx-reveal" aria-labelledby="order-title">
      <h2 id="order-title" className="section-title">
        Обсудить задачу
      </h2>

      <div className="order__steps" role="list">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 ? <span className="order-step__sep" aria-hidden="true" /> : null}
            <button
              className={`order-step${s.n === step ? " is-active" : ""}`}
              type="button"
              role="listitem"
              aria-current={s.n === step ? "step" : undefined}
              onClick={() => goTo(s.n)}
            >
              <span className="order-step__num tnum">{s.n}</span>
              <span className="order-step__label">{s.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      <form className="order-form" onSubmit={submit} noValidate>
        {/* Шаг 1 */}
        <fieldset className={`order-panel${step === 1 ? " is-open" : ""}`} hidden={step !== 1}>
          <legend className="order-panel__title">{STEPS[0].title}</legend>
          <p className="field">
            <label className="field-label" htmlFor="of-task">Задача</label>
            <input
              className="input"
              type="text"
              id="of-task"
              name="task"
              autoComplete="off"
              placeholder="Например: посчитать юнит-экономику по 30 SKU"
              value={data.task}
              onChange={(e) => update({ task: e.target.value })}
              aria-invalid={touched && step === 1 && !stepValid(1)}
            />
            {touched && step === 1 && !stepValid(1) ? (
              <span className="field-error">Опишите задачу одной строкой</span>
            ) : null}
          </p>
        </fieldset>

        {/* Шаг 2 */}
        <fieldset className={`order-panel${step === 2 ? " is-open" : ""}`} hidden={step !== 2}>
          <legend className="order-panel__title">{STEPS[1].title}</legend>
          <div className="chips" role="group" aria-labelledby="of-brief-label">
            <span className="field-label" id="of-brief-label">
              Что уже есть — можно несколько
            </span>
            {BRIEF_OPTIONS.map((o) => (
              <label className="chip" key={o}>
                <input
                  type="checkbox"
                  name="brief"
                  value={o}
                  checked={data.brief.includes(o)}
                  onChange={() => toggleBrief(o)}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Шаг 3 */}
        <fieldset className={`order-panel${step === 3 ? " is-open" : ""}`} hidden={step !== 3}>
          <legend className="order-panel__title">{STEPS[2].title}</legend>

          <div className="field">
            <span className="field-label" id="of-channel-label">Канал</span>
            <div className="chips" role="group" aria-labelledby="of-channel-label">
              {channels.map((c) => (
                <label className="chip" key={c}>
                  <input
                    type="radio"
                    name="channel"
                    value={c}
                    checked={data.channel === c}
                    onChange={() => update({ channel: c })}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="field">
            <label className="field-label" htmlFor="of-contact">
              {data.channel === "Email" ? "Почта" : "Телефон или ник в " + data.channel}
            </label>
            <input
              className="input"
              type={data.channel === "Email" ? "email" : "text"}
              id="of-contact"
              name="contact"
              autoComplete="email"
              value={data.contact}
              onChange={(e) => update({ contact: e.target.value })}
              aria-invalid={touched && step === 3 && !stepValid(3)}
            />
            {touched && step === 3 && !stepValid(3) ? (
              <span className="field-error">Нужен контакт для ответа</span>
            ) : null}
          </p>
        </fieldset>

        <div className="order-form__nav">
          {step > 1 ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
              назад
            </button>
          ) : null}
          {step < max ? (
            <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)}>
              дальше
            </button>
          ) : (
            <button type="submit" className="btn btn--primary">
              отправить
            </button>
          )}
        </div>

        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
