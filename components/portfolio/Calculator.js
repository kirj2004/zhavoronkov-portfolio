/**
 * Calculator — калькулятор себестоимости поставки из Китая.
 *
 * Компонент не считает экономику: он собирает значения полей,
 * показывает прогресс расчёта и отдаёт их наверх через onChange.
 * Расчёт живёт в бэкенде (Python), здесь только ввод и отображение.
 *
 * ВАЖНО: currency вынесен наружу. Если компонент сам подставит символ
 * валюты, пользователь с валютой ≠ RUB увидит «¥» впереди цены и
 * решит, что это закупка в юанях, а не пересчёт.
 */
import React from "react";

/** Значения полей по умолчанию. Нули вместо пустых строк — чтобы
 *  input[type=number] не показывал пустое поле при первом рендере. */
export const DEFAULT_FIELDS = {
  price: 120,
  currency: "CNY",
  qty: 100,
  rate: 12.4,
  rateMode: "auto",
  china: 3000,
  russia: 18000,
  pack: 35,
  fulfillment: 9000,
  extra: 0,
};

/**
 * @typedef {Object} CalcResult
 * @property {string} perUnit   себестоимость за штуку (уже отформатировано)
 * @property {string} batch     себестоимость партии (уже отформатировано)
 * @property {number} [progress] 0–100, доля завершённого расчёта
 *
 * @typedef {Object} CalculatorProps
 * @property {(patch: Partial<typeof DEFAULT_FIELDS>) => void} onChange  любые изменения полей
 * @property {typeof DEFAULT_FIELDS} [fields]  текущие значения полей
 * @property {CalcResult}  result       результат от бэкенда
 * @property {string}       [rateStatus] подпись под курсом («курс ЦБ», «введён вручную»)
 * @property {string[]}     [breakdown] строки расшифровки партии
 * @property {boolean}      [loading]  расчёт выполняется
 * @property {() => void}   [onReset]  сброс к значениям по умолчанию
 */
export default function Calculator({
  onChange,
  fields = DEFAULT_FIELDS,
  result,
  rateStatus,
  breakdown = [],
  loading = false,
  onReset,
}) {
  const set = (key) => (e) => {
    const value = e.target.value;
    onChange({ [key]: e.target.type === "number" ? (value === "" ? 0 : Number(value)) : value });
  };

  const field = (id, label, node) => (
    <div className="csc-field" key={id}>
      <label className="csc-label" htmlFor={id}>
        {label}
      </label>
      {node}
    </div>
  );

  return (
    <section className="csc" aria-labelledby="calc-title">
      <h2 id="calc-title" className="section-title">
        Калькулятор
      </h2>

      <div className="csc__grid">
        <div className="csc__in">
          {field("csc-price", "Цена за штуку", (
            <input
              className="csc-input"
              id="csc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fields.price}
              onChange={set("price")}
            />
          ))}

          {field("csc-currency", "Валюта закупки", (
            <select
              className="csc-select"
              id="csc-currency"
              value={fields.currency}
              onChange={set("currency")}
            >
              <option value="CNY">CNY — юань</option>
              <option value="RUB">RUB — рубль</option>
              <option value="USD">USD — доллар</option>
            </select>
          ))}

          {field("csc-qty", "Количество, шт", (
            <input
              className="csc-input"
              id="csc-qty"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={fields.qty}
              onChange={set("qty")}
            />
          ))}

          <div className="csc-field">
            <span className="csc-label" id="csc-rate-label">Курс</span>
            {fields.rateMode === "auto" ? (
              <p className="csc-rate" id="csc-rate-status" role="status" aria-live="polite">
                {rateStatus || "загружаю курс…"}
              </p>
            ) : (
              <>
                <input
                  className="csc-input"
                  id="csc-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={fields.rate}
                  onChange={set("rate")}
                />
                <button type="button" className="csc-link" onClick={() => onChange({ rateMode: "auto" })}>
                  вернуть автоматический курс
                </button>
              </>
            )}
          </div>

          {field("csc-china", "Доставка по Китаю, сумма на партию", (
            <input className="csc-input" id="csc-china" type="number" min="0" step="1"
              value={fields.china} onChange={set("china")} />
          ))}

          {field("csc-russia", "Доставка по России, сумма на партию, ₽", (
            <input className="csc-input" id="csc-russia" type="number" min="0" step="1"
              value={fields.russia} onChange={set("russia")} />
          ))}

          {field("csc-pack", "Упаковка, ₽/шт", (
            <input className="csc-input" id="csc-pack" type="number" min="0" step="1"
              value={fields.pack} onChange={set("pack")} />
          ))}

          {field("csc-fulfillment", "Фулфилмент, ₽ за партию", (
            <input className="csc-input" id="csc-fulfillment" type="number" min="0" step="1"
              value={fields.fulfillment} onChange={set("fulfillment")} />
          ))}

          {field("csc-extra", "Доп. расходы, ₽ на партию", (
            <input className="csc-input" id="csc-extra" type="number" min="0" step="1"
              value={fields.extra} onChange={set("extra")} />
          ))}

          {onReset ? (
            <button type="button" className="csc-link" onClick={onReset}>
              сбросить
            </button>
          ) : null}
        </div>

        <div className="csc__out">
          <div className="csc-hero" aria-busy={loading}>
            <span className="csc-hero__label">Себестоимость за штуку</span>
            <span className="csc-hero__value tnum">
              {result?.perUnit ?? "—"}
              <span className="csc-hero__cur" aria-hidden="true">₽</span>
            </span>
            <span className="csc-hero__side">
              <span className="csc-hero__side-label">на партию</span>
              <span className="csc-hero__side-value tnum">{result?.batch ?? "—"}</span>
              <span className="csc-hero__side-label">
                <span id="csc-qty-echo">{fields.qty}</span> шт
              </span>
            </span>
          </div>

          {breakdown.length ? (
            <table className="csc-table">
              <caption className="visually-hidden">Расшифровка себестоимости партии</caption>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="mono tnum">{row.value}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Итого за партию</th>
                  <td className="mono tnum">{result?.batch ?? "—"}</td>
                </tr>
              </tfoot>
            </table>
          ) : null}
        </div>
      </div>
    </section>
  );
}
