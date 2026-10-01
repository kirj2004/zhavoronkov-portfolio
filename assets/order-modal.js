/* order-modal.js — единая форма заказа.
 *
 * Один модальный диалог на весь сайт. Кнопки с классом .btn-order открывают
 * его и передают параметры через data-атрибуты:
 *
 *   data-order-service="p8"     — id услуги из каталога
 *   data-order-title="Ценообразование" — название, если услуга не из списка
 *   data-order-cost="1 240,50"  — предзаполненная себестоимость
 *   data-order-source="case_02" — откуда пришли (кейс, калькулятор)
 *
 * Бэкенда нет и не планируется: три способа отправки работают на стороне
 * пользователя — копирование в буфер, ссылка-приглашение MAX и mailto.
 * Токены и доступы сюда не присылают.
 */

const SERVICES = [
  { id: "express-audit", title: "Экспресс-аудит WB за 24 часа", price: "6 900 ₽" },
  { id: "p1", title: "Расчёт точки безубыточности", price: "2 500 ₽" },
  { id: "p2", title: "Аудит карточки на 20+ нарушений", price: "1 500 ₽" },
  { id: "p3", title: "Расчёт РРЦ под цель", price: "1 500 ₽" },
  { id: "p4", title: "Разбор одного конкурента", price: "1 900 ₽" },
  { id: "p5", title: "Проверка семантики", price: "2 000 ₽" },
  { id: "p6", title: "Чек-лист из 30 пунктов", price: "990 ₽" },
  { id: "p7", title: "Юнит-экономика FBS/FBW", price: "9 900 ₽" },
  { id: "p8", title: "Ценообразование", price: "15 000 ₽" },
  { id: "p9", title: "Полный аудит магазина", price: "24 900 ₽" },
  { id: "p10", title: "Анализ ниши", price: "19 900 ₽" },
  { id: "p11", title: "Аудит поставщика и логистики", price: "14 900 ₽" },
  { id: "p12", title: "Аудит документов и оферты", price: "12 900 ₽" },
  { id: "p13", title: "План роста на 3 месяца", price: "29 900 ₽" },
  { id: "p14", title: "Пакет «Старт»", price: "29 900 ₽" },
  { id: "p15", title: "Пакет «Рост»", price: "59 000 ₽" },
  { id: "p16", title: "Пакет «Масштаб»", price: "99 000 ₽" },
  { id: "p17", title: "Абонемент «Контент»", price: "20 000 ₽" },
  { id: "p18", title: "Абонемент «Аналитика»", price: "35 000 ₽" },
  { id: "p19", title: "Комбо", price: "69 000 ₽" },
];

const ORDER_EMAIL = "ip.zhavoronkov.ka@yandex.ru";
const ORDER_MAX =
  "https://max.ru/u/f9LHodD0cOLdp8PLl5xLOgbVyMIGA-CzKgczzqM_HK-bc2fsqmhaWQNg7Lk";

const TAX_MODES = [
  "Не применяю спецрежим",
  "УСН 6 % (доходы)",
  "УСН 15 % (доходы минус расходы)",
  "ОСН / НДС",
  "Самозанятость 4–6 %",
  "Не знаю — надо посчитать",
];

/* Восемь шагов создания токена WB только на чтение. Текст меняется раз в
   год, поэтому держим его здесь, а не в разметке карточки кейса. */
const API_STEPS = [
  "Откройте кабинет продавца WB: seller.wildberries.ru.",
  "Откройте «Настройки» → «Доступы к API». В разделе «Токены» нажмите «Создать».",
  "В поле типа токена выберите только «Только чтение» (read-only).",
  "Никаких галочек на запись и удаление ставить не нужно — они вам не понадобятся.",
  "Задайте срок действия токена: например, 7 дней с запасом.",
  "Нажмите «Создать» и сразу скопируйте токен — второй раз он показывается не полностью.",
  "Токен пришлите в MAX или на почту. В форму заказа он не вводится.",
  "После работы токен можно отозвать в том же разделе кабинета.",
];

let orderRoot = null;
let orderEl = null;
let orderTriggers = [];
let lastFocus = null;
let orderStep = 1;
const ORDER_STEPS = 3;

const $ord = (sel) => (orderRoot ? orderRoot.querySelector(sel) : null);

function serviceById(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

/** Открывает диалог и запоминает, чем он вызван. */
export function openOrder(options = {}) {
  if (!orderEl) return;
  lastFocus = document.activeElement;

  const { service = "", title = "", cost = "", source = "" } = options;
  const svc = serviceById(service);

  const sel = $ord("#om-service");
  sel.value = svc ? svc.id : service || "";

  const fixed = $ord("#om-fixed");
  fixed.hidden = !(svc || title);
  $ord("#om-fixed-title").textContent = svc ? svc.title : title;
  $ord("#om-fixed-price").textContent = svc ? svc.price : "";
  // Заголовок блока скрыт, когда услуга выбирается из списка.
  $ord("#om-pick-label").hidden = !(svc || title);

  $ord("#om-source").value = source;

  const costInput = $ord("#om-cost");
  costInput.value = cost || "";
  costInput.dispatchEvent(new Event("input", { bubbles: true }));

  // Галочка «API-ключ» снимается: инструкция не должна занимать
  // половину диалога, пока о нём не спросили.
  const apiBox = $ord("#om-has-api");
  apiBox.checked = false;
  $ord("#om-api-guide").hidden = true;

  orderRoot.hidden = false;
  document.body.style.overflow = "hidden";
  orderEl.setAttribute("aria-hidden", "false");
  showPanel(1);
  // Фокус — на поле услуги, а не на первую кнопку: так диалог
  // открывается для ввода, а не для немедленного закрытия по Enter.
  setTimeout(() => sel.focus(), 0);
}

export function closeOrder() {
  if (!orderEl || orderRoot.hidden) return;
  orderRoot.hidden = true;
  orderEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function showPanel(n) {
  orderStep = Math.min(ORDER_STEPS, Math.max(1, n));
  orderRoot.querySelectorAll(".om-panel").forEach((p) => {
    const on = Number(p.dataset.step) === orderStep;
    p.hidden = !on;
    p.classList.toggle("is-open", on);
  });
  orderRoot.querySelectorAll(".om-step").forEach((d) => {
    const i = Number(d.dataset.goto);
    d.classList.toggle("is-active", i === orderStep);
    d.classList.toggle("is-done", i < orderStep);
    if (i === orderStep) d.setAttribute("aria-current", "step");
    else d.removeAttribute("aria-current");
  });
  $ord("#om-back").hidden = orderStep === 1;
  $ord("#om-next").hidden = orderStep === ORDER_STEPS;
  $ord("#om-send").hidden = orderStep !== ORDER_STEPS;
  const st = $ord("#om-status");
  st.textContent = orderStep === ORDER_STEPS ? "" : "Поля со звёздочкой обязательны";
  st.classList.remove("is-warn");
}

/** Проверяет обязательные поля текущего шага. Возвращает false, если не хватило. */
function validateStep() {
  const panel = orderRoot.querySelector(`.om-panel[data-step="${orderStep}"]`);
  const bad = Array.from(panel.querySelectorAll("[data-required]")).filter((el) => {
    if (el.type === "checkbox") return !el.checked;
    return !String(el.value || "").trim();
  });

  // Письменный канал нужен хотя бы один: без адреса ответа заявка
  // уйдёт в никуда. Подпись под полем об этом говорит, значит и
  // проверка обязана.
  if (orderStep === ORDER_STEPS && !bad.length) {
    const email = $ord("#om-email").value.trim();
    const max = $ord("#om-max").value.trim();
    if (!email && !max) {
      bad.push($ord("#om-email"));
      $ord("#om-email").classList.add("is-invalid");
    }
  }
  orderRoot.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  if (bad.length) {
    bad.forEach((el) => el.classList.add("is-invalid"));
    const st = $ord("#om-status");
    st.textContent = "Заполните отмеченные поля";
    st.classList.add("is-warn");
    bad[0].focus();
    return false;
  }
  return true;
}

/** Собирает текст ТЗ. Чистая функция — DOM не трогает. */
export function buildOrderText(fd) {
  const val = (k) => String(fd.get(k) ?? "").trim();
  const known = fd.getAll("known").map(String);
  const api = fd.get("api") === "on";
  const svc = serviceById(val("service"));
  const title = svc ? svc.title : val("serviceTitle");

  const lines = [
    "Техническое задание на аналитику маркетплейса",
    "",
    `Услуга: ${title || "не выбрана"}`,
    val("source") ? `Откуда обращение: ${val("source")}` : "",
    "",
    "Данные:",
    val("sku") ? `Артикул или ссылка: ${val("sku")}` : "",
    val("category") ? `Категория: ${val("category")}` : "",
    val("cost") ? `Себестоимость: ${val("cost")} ₽` : "",
    val("tax") ? `Налоговый режим: ${val("tax")}` : "",
    val("file") ? `Файл: ${val("file")}` : "",
    known.length ? `Уже есть: ${known.join(", ")}` : "",
    api ? "API-ключ WB: готов прислать в MAX или на почту" : "",
    "",
    "Что беспокоит:",
    val("about") || "—",
    "",
    "Контакты:",
    val("name") ? `Имя: ${val("name")}` : "",
    val("email") ? `Email: ${val("email")}` : "",
    val("max") ? `MAX: ${val("max")}` : "",
    val("written") === "on" ? "Только письменные каналы" : "",
  ].filter(Boolean);

  if (api) {
    lines.push("", "— Инструкция: как прислать API-ключ —");
    API_STEPS.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }

  return lines.join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Буфер может быть недоступен без https или без разрешения.
    // Тогда показываем текст в textarea: его можно выделить руками.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    orderRoot.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function initTriggers() {
  orderTriggers = Array.from(document.querySelectorAll(".btn-order"));
  orderTriggers.forEach((t) =>
    t.addEventListener("click", (e) => {
      e.preventDefault();
      openOrder({
        service: t.dataset.orderService || "",
        title: t.dataset.orderTitle || "",
        cost: t.dataset.orderCost || "",
        source: t.dataset.orderSource || "",
      });
    })
  );
}

export function initOrderModal() {
  orderRoot = document.getElementById("order-modal");
  if (!orderRoot) return;
  orderEl = orderRoot.querySelector(".om");
  if (!orderEl) return;

  // Услуги в списке — из общей константы, чтобы каталог и форма
  // не расходились по названиям.
  const sel = orderRoot.querySelector("#om-service");
  sel.innerHTML =
    '<option value="">— выберите услугу —</option>' +
    SERVICES.map(
      (s) => `<option value="${s.id}">${s.title} — ${s.price}</option>`
    ).join("");

  const tax = orderRoot.querySelector("#om-tax");
  tax.innerHTML = TAX_MODES.map((m) => `<option value="${m}">${m}</option>`).join("");

  const apiGuide = orderRoot.querySelector("#om-api-guide");
  apiGuide.innerHTML =
    '<ol class="om-api-list">' +
    API_STEPS.map((s) => `<li>${s}</li>`).join("") +
    "</ol>";

  // Клик по фону закрывает: сама панель — не фон, иначе нельзя было бы
  // выделять текст внутри.
  orderRoot.addEventListener("mousedown", (e) => {
    if (e.target === orderRoot) closeOrder();
  });

  orderEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeOrder();
    }
    // Ловушка фокуса: Tab не должен уводить за пределы диалога.
    if (e.key === "Tab") {
      const f = orderEl.querySelectorAll(
        'button, input:not([type="hidden"]), select, textarea, a[href]'
      );
      const list = Array.from(f).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  orderRoot.querySelectorAll(".om-step").forEach((d) =>
    d.addEventListener("click", () => showPanel(Number(d.dataset.goto)))
  );
  orderRoot.querySelector("#om-next").addEventListener("click", () => {
    if (validateStep()) showPanel(orderStep + 1);
  });
  orderRoot.querySelector("#om-back").addEventListener("click", () =>
    showPanel(orderStep - 1)
  );

  orderRoot.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", closeOrder)
  );

  const apiBox = orderRoot.querySelector("#om-has-api");
  apiBox.addEventListener("change", () => {
    apiGuide.hidden = !apiBox.checked;
  });

  orderRoot.querySelectorAll("[data-required]").forEach((el) => {
    el.addEventListener("input", () => el.classList.remove("is-invalid"));
    el.addEventListener("change", () => el.classList.remove("is-invalid"));
  });

  // Файл прикладывается локально: показываем только имя, сам файл
  // никуда не отправляется — сервера нет.
  const fileInput = orderRoot.querySelector("#om-file");
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    orderRoot.querySelector("#om-file-name").textContent = f
      ? `${f.name} (${Math.round(f.size / 1024)} КБ)`
      : "";
  });

  const st = orderRoot.querySelector("#om-status");
  orderRoot.querySelector("#om-copy").addEventListener("click", async () => {
    const text = buildOrderText(new FormData(orderRoot.querySelector(".om__body")));
    const ok = await copyText(text);
    st.textContent = ok
      ? "Техническое задание скопировано — вставьте в MAX или почту"
      : "Не удалось скопировать автоматически — выделите текст и скопируйте вручную";
    st.classList.add("is-warn");
  });

  orderRoot.querySelector("#om-to-max").addEventListener("click", async () => {
    const text = buildOrderText(new FormData(orderRoot.querySelector(".om__body")));
    await copyText(text);
    st.textContent = "ТЗ скопировано — вставьте его в MAX";
    st.classList.add("is-warn");
    window.open(ORDER_MAX, "_blank", "noopener");
  });

  orderRoot.querySelector("#om-to-mail").addEventListener("click", () => {
    const text = buildOrderText(new FormData(orderRoot.querySelector(".om__body")));
    const a = document.createElement("a");
    a.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(
      "ТЗ на аналитику маркетплейса"
    )}&body=${encodeURIComponent(text)}`;
    a.hidden = true;
    orderRoot.appendChild(a);
    a.click();
    a.remove();
    st.textContent = "Открываю почтовый клиент — отправьте это письмо";
    st.classList.add("is-warn");
  });

  // Калькулятор сообщает посчитанную себестоимость. Храним её, чтобы
  // кнопка заказа из блока калькулятора открывала окно уже с числом,
  // а не пустым полем.
  let calcCost = "";
  window.addEventListener("csc:cost", (e) => {
    const v = e.detail && e.detail.perUnit;
    calcCost = v ? rubMoney(v) : "";
    const trig = document.getElementById("csc-order");
    if (trig && calcCost) trig.dataset.orderCost = calcCost;
  });

  initTriggers();
  showPanel(1);
}

/** «1 240,50» — валюту добавляет подпись поля, не само число. */
function rubMoney(v) {
  return v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOrderModal);
} else {
  initOrderModal();
}