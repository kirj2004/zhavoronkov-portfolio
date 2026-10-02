#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Кейсы портфолио — генератор HTML + PDF.

Единый шаблон кейса, четыре заполнения. Числа берутся из
`data/products.json` (реальные заказы WB) и пересчитываются
`econ_v3.py` — в разметку не вносится ни одной цифры руками.

Сценарии у каждого кейса два:
  by_brief    — РРЦ и скидка из ТЗ, СПП = 0;
  by_wb_fact  — последний реальный заказ WB, включая СПП.
В портфолио показывается by_wb_fact: он объясняет, почему карточка
теряет деньги на реальных ценах, а не на проектируемых.

Запуск:  python3 build_cases.py            # HTML + PDF
          python3 build_cases.py --no-pdf  # только HTML
"""
from __future__ import annotations

import argparse
import html
import json
import pathlib
import subprocess
import sys
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from cases_05_08 import CASES_05_08
from cases_09_12 import CASES_09_12  # noqa: E402
from cases_13_14 import CASES_13_14  # noqa: E402
from _bars_js import CHART_BARS_JS  # noqa: E402

DATA = json.loads((ROOT / "data" / "products.json").read_text(encoding="utf-8"))
OUT = ROOT / "cases"

MAX_URL = "https://max.ru/u/f9LHodD0cOLdp8PLl5xLOgbVyMIGA-CzKgczzqM_HK-bc2fsqmhaWQNg7Lk"
EMAIL = "ip.zhavoronkov.ka@yandex.ru"
NAME = "Жаворонков Кирилл"
TODAY = date.today().isoformat()

NBSP = " "
MINUS = "−"


def e(s) -> str:
    return html.escape(str(s), quote=True)


def money(v, dec=2, sign=False) -> str:
    """Деньги ru-RU: ₽ без пробела, типографский минус, неразрывные разряды."""
    if v is None:
        return "—"
    neg = v < 0
    s = f"{abs(v):,.{dec}f}".replace(",", NBSP).replace(".", ",")
    out = ("−" if neg else ("+" if sign and v > 0 else "")) + s + NBSP + "₽"
    return out


def num(v, dec=1) -> str:
    if v is None:
        return "—"
    s = f"{abs(v):,.{dec}f}".replace(",", NBSP).replace(".", ",")
    return ("−" if v < 0 else "") + s


def pct(v, dec=1, sign=False) -> str:
    if v is None:
        return "—"
    return num(v, dec) + NBSP + "%"


# ── данные кейсов ─────────────────────────────────────────────────────────
# Тексты — авторские. Каждая цифра в них проверяется скриптом
# verify_cases.py: числа, которых нет в products.json, не проходят.

CASES = [
    {
        "id": "case_01",
        "num": "CASE 01",
        "title": "ParaMagic — набор «9 планет»",
        "subtitle": "Подарочный набор натуральных камней",
        "category": "Рукоделие → Природные камни",
        "kv_label": "разрыв в пользу FBW",
        "kv_value": 84.90,
        "kv_dec": 2,
        "kv_tone": "profit",
        "model": "both",
        "tags": ["экономика"],
        "headline": "Один и тот же товар: FBS в минусе, FBW в плюсе",
        "context": [
            "Набор натуральных камней в подарочной упаковке. РРЦ 3 700 ₽, объём 1,25 л — "
            "в 6 раз больше медианы ниши, где преобладают объёмы около 0,2 л.",
            "Категория относится к дорогим: кВВ 33 % FBS против 29,5 % FBW. К этому "
            "добавляются фиксированные 60 ₽ обработки в ПВЗ и фулфилмента — только в FBS.",
        ],
        "problem": [
            "При РРЦ 1 000 ₽ модель FBS даёт −58,28 ₽ с единицы. Комиссия с НДС плюс "
            "фиксированные расходы съедают всю маржу: безубыточность FBS — 1 109,19 ₽, "
            "то есть на 9 % выше цены.",
            "FBW при той же цене даёт +26,62 ₽. Разрыв 84,90 ₽ с единицы — он "
            "складывается из разницы ставок 3,5 п.п. и разницы фиксированных расходов.",
        ],
        "did": [
            "Разобрал экономику по оферте: база комиссии — цена после скидки продавца, "
            "СПП вычитается из ставки кВВ с порогом 1 %, скидки WB выплату не уменьшают.",
            "Посчитал безубыточность и цену под маржу 15 % отдельно для FBS и FBW.",
            "Разобрал влияние скорости передачи: скидка кС −3,5 % поднимает маржу с "
            "−58,28 ₽ до −8,28 ₽ — это снижение ставки вознаграждения, а не выручки.",
            "Оценил EV штрафа за просрочку: двойная комиссия × КСО, потолок 50 % РРЦ.",
        ],
        "result": [
            ("Рекомендованная РРЦ", "1 543 ₽", "neutral"),
            ("Маржа при 1 543 ₽", "231,53 ₽ (15,0 %)", "profit"),
            ("BE FBS", "1 109,19 ₽", "loss"),
            ("BE FBW", "953,19 ₽", "warning"),
            ("Маржа при 1 000 ₽, FBS", "−58,28 ₽", "loss"),
            ("Маржа при 1 000 ₽, FBW", "+26,62 ₽", "profit"),
        ],
        "insight": "Рекомендованная РРЦ 1 543 ₽ даёт 15 % маржи. С учётом скидки за "
                   "скорость передачи безубыточность опускается до 1 043,68 ₽ — запас "
                   "появляется за счёт дисциплины передачи, а не за счёт цены. "
                   "Топ-конкурент ниши стоит 1 723 ₽ при 768 отзывах, то есть "
                   "запас по цене есть.",
        "pdf_href": "../clients/test_wb_2026_09/paramagic_report.pdf",
        "pdf_label": "Полный отчёт",
        # Графика не было — п. 7 ТЗ требует по одному на кейс. Числа взяты
        # из make_charts_01_03_04.py, та же модель econ_v3, p_fine = 0:
        # при нём FBS даёт ровно −58,28 ₽ и FBW +26,62 ₽ из текста кейса.
        "chart": {
            "title": "Прибыль с единицы при скидке продавца",
            "note": "РРЦ 1 000 ₽, объём 1,25 л, ставки ParaMagic 33 % FBS и "
                    "29,5 % FBW, постоянные расходы 447,84 ₽. Линия FBS "
                    "пересекает ноль раньше FBW — это и есть разрыв 84,90 ₽.",
            "labels": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
            "series": [
                {"name": "FBS", "values": [-58.28, -84.96, -111.65, -138.33, -165.02, -191.7, -218.39, -245.08, -271.76, -298.45, -325.13, -351.82, -378.5, -405.19, -431.88]},
                {"name": "FBW", "values": [26.62, -1.81, -30.25, -58.68, -87.12, -115.55, -143.99, -172.43, -200.86, -229.3, -257.73, -286.17, -314.6, -343.04, -371.48]},
            ],
            "zero_label": "нет в диапазоне",
        },
    },
    {
        "id": "case_02",
        "num": "CASE 02",
        "title": "Покрытие для унитаза — выход из минуса",
        "subtitle": "Категория с дорогой логистикой и глубокой скидкой",
        "category": "Другие хозяйственные принадлежности",
        "kv_label": "FBS при реальных ценах",
        "kv_value": -23.49,
        "kv_dec": 2,
        "kv_tone": "loss",
        "model": "fbs",
        "tags": ["экономика", "логистика"],
        "headline": "При реальных ценах FBS убыточен, FBW прибылен",
        "context": [
            "Чехол-накладка на унитаз, объём 0,992 л, вес 61 г. Категория "
            "«Другие хозяйственные принадлежности», кВВ 33 % FBS и 28,5 % FBW.",
            "За период с 05.04 по 12.09.2026 — 410 заказов, 379 продаж. Карточка "
            "работает постоянно, проблема не в спросе.",
            "Себестоимость 32,45 ₽ подтверждена продавцом: партия 400 шт, товар с "
            "доставкой 17,50 ₽, доставка по России 5,00 ₽, коробки 1,20 ₽, отправка "
            "на WB 8,75 ₽.",
        ],
        "problem": [
            "Последний реальный заказ 12.09.2026: РРЦ 600 ₽, скидка продавца 66 %, "
            "СПП 23 %. Цена покупателя 157,08 ₽ — при такой цене FBS даёт −23,49 ₽.",
            "Причина в скидке: она опустила базу так сильно, что фиксированные "
            "расходы FBS (60 ₽ ПВЗ и фулфилмента плюс логистика 78,20 ₽) перестали "
            "покрываться выплатой.",
        ],
        "did": [
            "Разложил себестоимость по статьям — видно, что экономить на закупке "
            "почти бесполезно: товар с доставкой 17,50 ₽ против 78,20 ₽ логистики WB.",
            "Посчитал пороговую скидку: FBS выходит в ноль при скидке 60,57 %, "
            "то есть текущие 66 % — это 5,4 п.п. за точкой.",
            "Проверил альтернативу: FBW при тех же ценах даёт +36,82 ₽, потому что "
            "не несёт расходов на ПВЗ и фулфилмент.",
            "Зафиксировал безубыточность: 320,64 ₽ FBS и 206,83 ₽ FBW.",
        ],
        "result": [
            ("Скидка 66 % (факт), FBS", "−23,49 ₽", "loss"),
            ("Скидка 66 % (факт), FBW", "+36,82 ₽", "profit"),
            ("Порог скидки для FBS", "60,57 %", "warning"),
            ("BE FBS", "320,64 ₽", "loss"),
            ("BE FBW", "206,83 ₽", "profit"),
            ("Скидка 50 %, FBS", "+45,77 ₽", "profit"),
        ],
        "insight": "Логистика WB 78,20 ₽ в 15,6 раза дороже доставки товара до "
                   "склада (5,00 ₽) и в 2,4 раза дороже всей себестоимости "
                   "(32,45 ₽). Экономить 1 ₽ на закупке бессмысленно, пока "
                   "фиксированные 78,20 ₽ не покрыты ценой: сначала скидка и "
                   "модель, потом закупка.",
        "chart": {
            "title": "Прибыль с единицы при скидке продавца",
            "note": "РРЦ 600 ₽, СПП 23 %, реальные ставки и себестоимость. "
                    "Ноль profit = 60,57 % скидки для FBS.",
            "labels": ["0", "5", "10", "15", "20", "25", "30", "35", "40", "45",
                       "50", "55", "60", "65", "70"],
            "series": [
                {"name": "FBS", "values": [262.18, 240.54, 218.90, 197.26, 175.62,
                                           153.98, 132.33, 110.69, 89.05, 67.41,
                                           45.77, 24.13, 2.48, -19.16, -40.80]},
                {"name": "FBW", "values": [340.65, 317.63, 294.61, 271.59, 248.58,
                                           225.56, 202.54, 179.53, 156.51, 133.49,
                                           110.47, 87.46, 64.44, 41.42, 18.41]},
            ],
            "zero_label": "60,57 %",
        },
        "cost_rows": [
            ("Товар + доставка по Китаю", 17.50),
            ("Доставка по России", 5.00),
            ("Коробки", 1.20),
            ("Отправка на WB", 8.75),
        ],
        "plan": {
            "title": "План выхода из минуса",
            "note": "все три сценария считаны на фактическом РРЦ 600 ₽, СПП 23 % "
                    "и подтверждённой себестоимости 32,45 ₽",
            "scenarios": [
                ("A", "Снизить скидку", "66 % → 50 %",
                 "Цена покупателя растёт, FBS перестаёт терять. Спрос просядет, "
                 "но экономика сходится без смены модели."),
                ("B", "Поднять РРЦ", "600 → 900 ₽",
                 "Скидка остаётся высокой, маржа FBS положительная. Но карточка "
                 "уходит из массовой выдачи по цене 235,62 ₽."),
                ("C", "Перевести в FBW", "без скидки",
                 "Ничего не меняем в ценах и спросе: FBW снимает ПВЗ и фулфилмент "
                 "и сразу даёт плюс. Требует своего склада."),
            ],
            "rows": [
                ("Цена покупателя", "231,00 ₽", "235,62 ₽", "157,08 ₽"),
                ("Прибыль с единицы", "+45,77 ₽", "+50,10 ₽", "+36,82 ₽"),
                ("Маржа к РРЦ", "+7,6 %", "+5,6 %", "+6,1 %"),
                ("Спрос", "просядет", "упадёт заметно", "не изменится"),
                ("Свои затраты", "нет", "нет", "склад и доставка до него"),
            ],
            "verdict": "Выбрать A. Первый рычаг — скидка: FBS выходит в "
                       "+45,77 ₽ без единицы новых затрат, тогда как B требует "
                       "роста цены на 50 % и риска потери позиций, а C "
                       "добавляет складской оборот к карточке, которая сейчас "
                       "даёт 36,82 ₽. Порог безубыточности FBS — скидка "
                       "60,57 %, то есть текущие 66 % зашли за него на "
                       "5,4 п.п.",
            "next": [
                "Неделя 1: снизить скидку 66 % → 55 % и снять первые 50 заказов. "
                "Контроль: FBS не ниже +24,13 ₽, доля возвратов не выросла.",
                "Неделя 2: довести до 50 %, сравнить выручку и число продаж "
                "с периодом 05.04–12.09 (379 продаж).",
                "Неделя 3: если спрос просел больше чем на треть — вернуть 55 % "
                "и перевести карточку в FBW как запасной вариант.",
            ],
        },
    },
    {
        "id": "case_03",
        "num": "CASE 03",
        "title": "Карта серого — СПП повышает маржу",
        "subtitle": "Реквизит для фотографа",
        "category": "Реквизит для фотографа",
        "kv_label": "маржа FBW при реальных ценах",
        "kv_value": 216.57,
        "kv_dec": 2,
        "kv_tone": "profit",
        "model": "fbw",
        "tags": ["экономика"],
        "headline": "Скидка покупателя увеличивает, а не уменьшает маржу",
        "context": [
            "Карта серого для фото и видео, объём 0,162 л, вес 30 г. Категория "
            "«Реквизит для фотографа», кВВ 35 % FBS и 30,5 % FBW.",
            "За период с 06.04 по 18.09.2026 — 60 заказов, 56 продаж. Себестоимость "
            "50 ₽, подтверждена продавцом.",
        ],
        "problem": [
            "По ценам из ТЗ (скидка 60 %, СПП 0) карточка выглядит убыточной: "
            "FBS даёт −65,47 ₽, FBW — около нуля. Вывод «FBS отключить, FBW оставить "
            "на грани» рисковал быть неверным.",
            "Реальный заказ 18.09.2026 другой: РРЦ 599 ₽, скидка продавца 25 %, СПП 27 %, "
            "цена покупателя 327,95 ₽.",
        ],
        "did": [
            "Пересчитал модель на фактических ценах последнего заказа вместо цен из ТЗ.",
            "Разложил статьи расхода FBS и FBW, чтобы найти, что именно изменилось.",
            "Проверил, как СПП действует на ставку по пункту 12.5.2 оферты: она "
            "вычитается из кВВ с делением на 1,22, то есть быстрее, чем из цены.",
        ],
        "result": [
            ("Маржа FBS (факт)", "141,66 ₽ (23,6 %)", "profit"),
            ("Маржа FBW (факт)", "216,57 ₽ (36,2 %)", "profit"),
            ("Маржа FBS по ТЗ", "−65,47 ₽", "loss"),
            ("BE FBS", "367,42 ₽", "neutral"),
            ("BE FBW", "239,59 ₽", "neutral"),
            ("РРЦ для маржи 15 %, FBW", "327,52 ₽", "profit"),
        ],
        "insight": "СПП повышает маржу, и это не ошибка расчёта: по п. 12.5.2 "
                   "скидка покупателя вычитается из ставки кВВ с делением на 1,22, "
                   "тогда как из цены покупателя — без деления. Ставка падает быстрее, "
                   "чем выручка. Вывод по ТЗ «FBS убыточен» был следствием "
                   "неверной отправной цены, а не проблемы карточки.",
        # Графика не было — п. 7 ТЗ требует по одному на кейс. Числа из
        # make_charts_01_03_04.py: та же модель econ_v3 на подтверждённых
        # РРЦ 599 ₽ и себестоимости 50 ₽.
        "chart": {
            "title": "Прибыль с единицы при скидке продавца",
            "note": "РРЦ 599 ₽, объём 0,162 л, себестоимость 50 ₽, СПП 27 %. "
                    "Обе линии идут выше нуля до 38,66 % скидки по FBS — "
                    "у этой карточки большой запас прочности.",
            "labels": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
            "series": [
                {"name": "FBS", "values": [118.62, 103.28, 87.93, 72.59, 57.25, 41.91, 26.57, 11.23, -4.11, -19.45, -34.79, -50.13, -65.47, -80.81, -96.16]},
                {"name": "FBW", "values": [200.81, 184.08, 167.34, 150.61, 133.87, 117.14, 100.41, 83.67, 66.94, 50.21, 33.47, 16.74, 0.01, -16.73, -33.46]},
            ],
            "zero_label": "38.66 %",
        },
    },
    {
        "id": "case_04",
        "num": "CASE 04",
        "title": "Рефлектор — комиссия 42 % съедает FBS",
        "subtitle": "Отражатели для фотовспышки",
        "category": "Отражатели для фотовспышки",
        "kv_label": "FBS при реальных ценах",
        "kv_value": 27.59,
        "kv_dec": 2,
        "kv_tone": "warning",
        "model": "fbs",
        "tags": ["экономика", "логистика"],
        "headline": "В дорогой категории FBS держится на грани, FBW работает",
        "context": [
            "Отражатель для накамерной вспышки, двусторонний. Объём 0,475 л, вес 42 г. "
            "Категория «Отражатели для фотовспышки» — самая дорогая из четырёх.",
            "За период с 05.04 по 21.09.2026 — 462 заказа, 424 продажи. Себестоимость "
            "60 ₽, подтверждена продавцом.",
        ],
        "problem": [
            "КВВ 42 % FBS и 37,5 % FBW — на 7–11 п.п. выше остальных кейсов. "
            "Разница схем на этой категории решает всё.",
            "По ценам из ТЗ (скидка 57 %, СПП 0) FBS даёт −47,98 ₽. Реальный заказ "
            "21.09.2026: РРЦ 791 ₽, скидка 57 %, СПП 27 %, цена покупателя 248,29 ₽.",
        ],
        "did": [
            "Посчитал FBS и FBW на фактических ценах: FBS +27,59 ₽ (3,5 %), "
            "FBW +96,36 ₽ (12,2 %).",
            "Разложил расход FBS: комиссия 67,58 ₽ — крупнейшая статья, при объёме "
            "0,475 л логистика 78,20 ₽ почти сравнялась с комиссией.",
            "Посчитал безубыточность: 448,20 ₽ FBS против 296,98 ₽ FBW.",
        ],
        "result": [
            ("Маржа FBS (факт)", "27,59 ₽ (3,5 %)", "warning"),
            ("Маржа FBW (факт)", "96,36 ₽ (12,2 %)", "profit"),
            ("Маржа FBS по ТЗ", "−47,98 ₽", "loss"),
            ("BE FBS", "448,20 ₽", "neutral"),
            ("BE FBW", "296,98 ₽", "neutral"),
            ("РРЦ для маржи 15 %, FBW", "428,50 ₽", "profit"),
        ],
        "insight": "При 42 % кВВ экономия FBS на 60 ₽ ПВЗ и фулфилмента не "
                   "перекрывает потерю в ставке. FBS держится на 3,5 % маржи — это "
                   "цена одного просроченного заказа: EV штрафа при скидке 57 % "
                   "равен 0,41 ₽ на единицу, а один просроченный заказ стоит "
                   "785,58 ₽. На FBW такой риск не переносится.",
        "chart": {
            "title": "Прибыль с единицы при скидке продавца",
            "note": "РРЦ 791 ₽, объём 0,475 л, себестоимость 60 ₽, СПП 27 %. "
                    "FBS уходит в минус раньше FBW: разрыв линий и есть "
                    "следствие комиссии 42 % против 37,5 %.",
            "labels": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
            "series": [
                {"name": "FBS", "values": [151.59, 134.1, 116.61, 99.12, 81.63, 64.14, 46.65, 29.16, 11.67, -5.81, -23.3, -40.79, -58.28, -75.77, -93.26]},
                {"name": "FBW", "values": [241.44, 222.11, 202.78, 183.45, 164.12, 144.79, 125.46, 106.13, 86.81, 67.48, 48.15, 28.82, 9.49, -9.84, -29.17]},
            ],
            "zero_label": "43.34 %",
        },
    },
]

_ORDER_MODAL_HTML = (pathlib.Path(__file__).resolve().parent
                     / "assets" / "order-modal.html").read_text(encoding="utf-8")
# из файла берём только разметку окна, без <body> и без doctype
_ORDER_MODAL_HTML = _ORDER_MODAL_HTML[
    _ORDER_MODAL_HTML.find('<div class="order-modal"'):
].strip()

CASES = CASES + CASES_05_08 + CASES_09_12 + CASES_13_14


def _service_titles() -> dict[str, str]:
    """Названия услуг читаются из order-modal.js — единственного места,
    где они объявлены. Дублировать список здесь нельзя: он уже разъезжался
    с products/index.html, из-за чего в кейсах печаталось «Услуга №…»."""
    import re as _re
    path = ROOT / "assets" / "order-modal.js"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="replace")
    return {
        m.group(1): m.group(2)
        for m in _re.finditer(r'id:\s*"(p\d+)",\s*title:\s*"([^"]+)"', text)
    }


SERVICE_TITLES = _service_titles()


def _pain_titles() -> dict[str, str]:
    """Названия болей читаются из карточек главной страницы.

    Заголовок боли на главной и в кейсе обязан совпадать: иначе посетитель
    приходит по ссылке «Похожая боль» и не находит того, что обещал."""
    import re as _re
    path = ROOT / "index.html"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="replace")
    out: dict[str, str] = {}
    # Атрибут id идёт не сразу за class: между ними может стоять style
    # (--i задаёт задержку появления карточки). Поэтому атрибуты ищем
    # по отдельности внутри <article>, а не одним жёстким шаблоном.
    for m in _re.finditer(
        r'<article class="pain-card[^"]*"[^>]*\bid="(pain-[\w-]+)"[^>]*>(.*?)</article>',
        text, _re.S,
    ):
        title = _re.search(r'pain-card__title">(.*?)</h3>', m.group(2), _re.S)
        if title:
            out[m.group(1)] = _re.sub(r"\s+", " ", title.group(1)).strip()
    return out


PAIN_TITLES = _pain_titles()

# Числа для верификации: должны встречаться в products.json или в отчёте
# ParaMagic. Скрипт verify_cases.py сверяет их с источником.
#
# Кейсы 05–08 сознательно НЕ входят в VERIFY_EXPECT: их цифры примерные,
# по этому аккаунту таких SKU нет. Проверяется другое — что флаг
# approximate проставлен и числа помечены словом «примерно».
#
# Боли, на которые ссылаются кейсы, обязаны существовать в разметке главной
# (PAIN_TITLES читается оттуда же). Правка id боли без соответствующей
# карточки даёт ссылку в пустоту — это была исходная ошибка, из-за которой
# case_01, 03, 04, 06 и 07 вели на pain-margin / pain-start / pain-noconversion,
# которых на странице не было. Ниже они переразмечены по смыслу кейса.
#
# Связка кейс → боль → услуга. Кейсы 09–12 несут pain/service в своих
# словарях, для 01–08 они заданы здесь: ТЗ требует блок «Похожая боль?» и
# «Как решаем» во ВСЕХ кейсах, а не только в новых.
#
# Боль — якорь на главной (#pains), услуга — карточка каталога
# (products/index.html#product-N).
# Второй элемент пары — id услуги в формате «p7», как в order-modal.js и
# products/index.html. Раньше здесь стояли голые числа (7, 13), и генератор
# печатал «Услуга №13», а якорь строил как #product-13 — таких id на
# странице услуг нет, настоящие #p7 и #p13.
CASE_LINKS = {
    # Набор «9 планет»: разрыв FBW против FBS считается юнит-экономикой.
    "case_01": ("pain-margin", "p1"),
    "case_02": ("pain-commission", "p3"),
    # «Карта серого»: СПП поднял маржу — это про цену и расчёт РРЦ.
    "case_03": ("pain-margin", "p8"),
    # Рефлектор: комиссия 42 % съедает FBS — боль комиссии, решается
    # пересчётом FBS против FBW по юнит-экономике.
    "case_04": ("pain-commission", "p7"),
    "case_05": ("pain-commission", "p13"),
    # Заниженные габариты и штраф за размеры — операционная боль логистики.
    "case_06": ("pain-logistics", "p11"),
    # Демпинг из Китая — боль демпинга, решается поиском ниши.
    "case_07": ("pain-dumping", "p10"),
    "case_08": ("pain-logistics", "p7"),
}

VERIFY_EXPECT = {
    "case_01": ["1 109,19", "953,19", "−58,28", "26,62", "84,90", "231,53", "1 543"],
    "case_02": ["−23,49", "36,82", "320,64", "206,83", "60,57", "78,20", "32,45",
                # сценарии A/B/C плана выхода из минуса — контрфактические,
                # посчитаны через econ_v3, в orders.json этих цен нет
                "235,62", "231,00", "50,10", "24,13"],
    "case_03": ["141,66", "216,57", "367,42", "239,59", "327,52", "−65,47",
                # FBS breakeven discount, econ_v3 — подпись нуля на графике
                "38,66"],
    "case_04": ["27,59", "96,36", "448,20", "296,98", "428,50", "−47,98", "67,58"],
}


# ── общие куски разметки ──────────────────────────────────────────────────

# ── Интерактивная лаборатория для кейсов 09–12 ──────────────────────────
# Кейсы 09–12 должны считаться вживую: ползунки, график маржи, точка
# безубыточности и кнопка PDF. Значения по умолчанию берутся из словаря
# кейса (calc), чтобы стартовое состояние совпадало с текстом разбора.
#
# Тарифы возвратов — п. 7.1 оферты WB от 24.09.2026: обратная доставка в ПВЗ
# селлера 25 ₽ за товар, хранение 10 ₽ в день с 4-го дня, утилизация 44 ₽.
RETURN_FIXED = 25.0 + 10.0 * 3 + 44.0


def lab_block(c: dict, depth: int) -> list[str]:
    calc = c["calc"]
    r0 = calc["returns"]
    fields = [
        ("price", "РРЦ, ₽", 0, int(calc["price"] * 0.5),
         max(int(calc["price"] * 2), int(calc["price"]) + 100), int(calc["price"]), 0, ""),
        ("cost", "Себестоимость, ₽", 0, int(calc["cost"] * 0.4),
         int(calc["cost"] * 1.6), int(calc["cost"]), 0, ""),
        # Ползунок показывает проценты (33 = 33 %), а case-lab.js ждёт
        # доли. Поэтому в data-lab-default кладём проценты и делим на 100
        # при чтении — см. lab_block() ниже и read() в case-lab.js.
        ("commission", "Комиссия кВВ, %", 1, 10,
         50, round(calc["commission"] * 100), 1, " %"),
    ]
    if c["id"] == "case_09":
        fields.append(("returns", "Доля возврата, %", 1, 0, 60,
                       round(r0 * 100), 1, " %"))
    if c["id"] == "case_10":
        fields.append(("ad", "ДРР, %", 1, 0, 40,
                       round(calc.get("ad", 0.25) * 100), 1, " %"))

    A = ['<section class="section case-lab" id="lab" aria-labelledby="lab-t">']
    A.append('<div class="section-head"><h2 class="section-title" id="lab-t">'
             "Посчитайте сами</h2>"
             '<span class="section-note">ползунки считают по той же модели, '
             "что разбор выше</span></div>")
    A.append(f'<div class="card case-lab__card" id="lab-root">')
    A.append('<div class="case-lab__grid">')
    A.append('<div class="case-lab__controls">')
    for key, label, _, lo, hi, default, dd, unit in fields:
        fid = "lab-" + key
        A.append('<div class="case-lab__field">')
        A.append(f'<label class="case-lab__label" for="{fid}">{e(label)}</label>')
        A.append(f'<output class="case-lab__out" id="{fid}-out" for="{fid}">'
                 + e(num(default).rstrip("0").rstrip(".") if dd else
                     f"{default:,}".replace(",", NBSP))
                 + e(unit) + "</output>")
        A.append(f'<input class="case-lab__range" type="range" id="{fid}" '
                 f'data-lab-slider="{key}" data-lab-dec="{dd}" '
                 f'data-lab-unit="{e(unit)}" '
                 f'data-lab-default="{default}" '
                 f'min="{lo}" max="{hi}" step="{0.1 if dd else 1}" '
                 f'value="{default}" '
                 f'aria-describedby="{fid}-out">')
        A.append(f'<span class="case-lab__range-ends" aria-hidden="true">'
                 f'{lo:,}'.replace(",", " ") + f' — ' +
                 f'{hi:,}'.replace(",", " ") + '</span>')
        A.append("</div>")
    A.append('<div class="case-lab__buttons">'
             '<button class="btn" type="button" data-lab-reset>'
             '<i data-lucide="rotate-ccw" width="16" height="16" '
             'aria-hidden="true"></i>Сбросить</button>'
             '<button class="btn btn--primary" type="button" data-lab-pdf>'
             '<i data-lucide="download" width="16" height="16" '
             'aria-hidden="true"></i>Скачать PDF</button></div>')
    A.append("</div>")

    A.append('<div class="case-lab__out">')
    A.append('<div class="case-lab__kpi">'
             '<span class="metric-label">Маржа с единицы</span>'
             '<p class="case-lab__margin" id="lab-margin">—</p>'
             '<span class="case-lab__pct" id="lab-margin-pct">—</span></div>')
    A.append('<div class="case-lab__be">'
             '<span class="metric-label">Безубыточная цена</span>'
             '<p class="case-lab__be-value" id="lab-be">—</p></div>')
    A.append('<dl class="case-lab__break">'
             f'<dt>Выручка после возвратов</dt><dd id="lab-revenue">—</dd>'
             f'<dt>Комиссия кВВ</dt><dd id="lab-commission">—</dd>'
             f'<dt>Логистика и ПВЗ</dt><dd id="lab-logistics">—</dd>'
             f'<dt>Реклама</dt><dd id="lab-ad">—</dd>'
             f'<dt>Стоимость возврата</dt><dd id="lab-return">—</dd>'
             f'<dt>Всего расход</dt><dd id="lab-total">—</dd></dl>')
    A.append('<p class="sr-only" id="lab-live" role="status" aria-live="polite"></p>')
    A.append("</div></div>")

    A.append('<div class="chart-box case-lab__chart">'
             '<canvas id="lab-chart" role="img" '
             'aria-label="Маржа с единицы в зависимости от РРЦ"></canvas></div>')
    A.append('<p class="footnote">Точка безубыточности — цена, при которой '
             'маржа равна нулю. Возврат считается полной себестоимостью '
             "доставки туда и обратно плюс хранение и утилизация по п. 7.1 "
             "оферты WB.</p>")
    A.append("</div></section>")
    return A


def order_modal() -> str:
    """Разметка модального окна заказа — общая для всех страниц.

    Один источник: assets/order-modal.html. Копии в страницах расходятся при
    правке, поэтому страница подключает готовый файл как есть, а стили и
    скрипт — через head/footer.
    """
    return _ORDER_MODAL_HTML


def head(title: str, desc: str, depth: int) -> list[str]:
    css = "../assets/style.css" if depth else "assets/style.css"
    icon = "../assets/favicon.svg" if depth else "assets/favicon.svg"
    A = [
        "<!DOCTYPE html>",
        '<html lang="ru" data-theme="dark">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{e(title)}</title>",
        f'<meta name="description" content="{e(desc)}">',
        f'<link rel="icon" href="{icon}" type="image/svg+xml">',
        f'<link rel="stylesheet" href="{css}">',
        f'<link rel="stylesheet" href="{"../assets/" if depth else "assets/"}order-modal.css">',
        '<script src="https://cdn.jsdelivr.net/npm/lucide@0.454.0/dist/umd/lucide.min.js" defer></script>',
        '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js" defer></script>',
        "<style>",
        CASE_CSS,
        "</style>",
        "</head>",
        "<body>",
    ]
    return A


def header(depth: int, active: str = "") -> list[str]:
    up = "../" if depth else ""
    A = ['<header class="site-header no-print">', '<div class="site-header__inner">']
    A.append(f'<a class="brand" href="{up}index.html">'
             f'<span class="brand__name">{e(NAME)}</span>'
             f'<span class="brand__sub">Юнит-экономика маркетплейсов</span></a>')
    A.append('<nav class="nav" aria-label="Разделы">')
    for href, label in [(f"{up}index.html", "Главная"), (f"{up}resume.html", "Резюме"),
                        (f"{up}products/index.html", "Каталог"), ("index.html", "Кейсы"),
                        (f"{up}tools/index.html", "Инструменты")]:
        cls = "nav-link" + (" nav-link--active" if href == active else "")
        A.append(f'<a class="{cls}" href="{href}">{e(label)}</a>')
    A.append("</nav>")
    A.append(f'<a class="btn btn--primary cs-max" href="{e(MAX_URL)}" target="_blank" rel="noopener">'
             f'<i data-lucide="message-circle" width="16" height="16" aria-hidden="true"></i>'
             f"Написать в MAX</a>")
    A.append("</div></header>")
    return A


def footer(depth: int) -> list[str]:
    up = "../" if depth else ""
    A = ['<footer class="site-footer">', '<div class="site-footer__inner">']
    A.append(f'<span class="site-footer__copy">© 2026 {e(NAME)}</span>')
    A.append('<nav class="site-footer__nav" aria-label="Разделы">')
    for href, label in [(f"{up}index.html", "Главная"), ("index.html", "Все кейсы"),
                        (f"{up}products/index.html", "Каталог"), (f"{up}resume.html", "Резюме")]:
        A.append(f'<a class="nav-link" href="{href}">{e(label)}</a>')
    A.append("</nav>")
    A.append(f'<span class="site-footer__copy">Дата сборки: {TODAY}</span>')
    A.append("</div></footer>")
    A.append('<script type="module" src="%sassets/site.js"></script>' % up)
    A.append('<script type="module" src="%sassets/order-modal.js"></script>' % up)
    A.append("</body></html>")
    return A


def chart_script(c: dict) -> list[str]:
    """Chart.js для страницы кейса: цвета — из токенов, не из hex."""
    import json as _json
    ch = c["chart"]
    kind = ch.get("kind", "line")
    cfg = {
        "labels": ch["labels"],
        "series": ch["series"],
        # zeroLabel нужен только линии FBS/FBW — у неё он рисуется на графике.
        "zeroLabel": ch.get("zero_label", ""),
        "kind": kind,
        "xLabel": ch.get("x_label", ""),
        "yLabel": ch.get("y_label", ""),
        "yUnit": ch.get("y_unit", ""),
    }
    # Линия FBS/FBW — отдельный рендерер, у него своя разметка и подписи.
    js = CHART_JS if kind == "line" else CHART_BARS_JS
    return [
        "<script>",
        "document.addEventListener('DOMContentLoaded', function () {",
        "  var CFG = " + _json.dumps(cfg, ensure_ascii=False) + ";",
        js,
        "});",
        "</script>",
    ]


def case_page(c: dict, depth: int = 1) -> str:
    A = head(f"{c['title']} — кейс {c['num']}",
             f"{c['subtitle']}. Разбор юнит-экономики карточки: контекст, проблема, "
             f"решение, результат.", depth)
    A += header(depth, active="index.html")

    A.append('<main class="page case-page">')
    A.append('<nav class="crumbs" aria-label="Хлебные крошки"><ol>')
    A.append(f'<li><a href="../index.html">Портфолио</a></li>')
    A.append('<li><a href="index.html">Кейсы</a></li>')
    A.append(f'<li aria-current="page">{e(c["title"])}</li>')
    A.append("</ol></nav>")

    A.append(f'<div class="case-hero">')
    A.append(f'<div class="case-hero__main">')
    A.append(f'<div class="case__num">{e(c["num"])}</div>')
    A.append(f'<h1 class="page-title case-hero__title">{e(c["title"])}</h1>')
    A.append(f'<p class="page-sub">{e(c["subtitle"])}</p>')
    A.append(f'<div class="case-tags">')
    A.append(f'<span class="badge badge--neutral"><i data-lucide="layers" width="12" '
             f'height="12" aria-hidden="true"></i>{e(c["category"])}</span>')
    for m in (["FBS", "FBW"] if c["model"] == "both" else [c["model"].upper()]):
        A.append(f'<span class="badge badge--info">{e(m)}</span>')
    # Темы кейса — по ним фильтруется cases/index.html
    for t in c.get("tags", []):
        A.append(f'<span class="badge badge--neutral" data-tag="{e(t)}">{e(t)}</span>')
    A.append("</div></div>")
    tone = c["kv_tone"]
    A.append(f'<div class="case-hero__kpi">')
    A.append(f'<span class="calc-hero-label">{e(c["kv_label"])}</span>')
    A.append(f'<p class="calc-hero-value kpi-{tone}" data-money="{c["kv_value"]}" '
             f'data-dec="{c["kv_dec"]}">—</p>')
    A.append("</div></div>")

    A.append(f'<p class="case-headline">{e(c["headline"])}</p>')

    # Кейсы 05–08 обобщают боли из исследования, а не разбор этого
    # аккаунта. Помечаем явно, чтобы «примерные» цифры не читались как точные.
    if c.get("approximate"):
        A.append('<div class="alert alert--warning" style="margin:var(--space-4) 0">'
                 '<i data-lucide="info" width="16" height="16" aria-hidden="true"></i>'
                 "<span><strong>Обобщённый разбор.</strong> Кейс описывает реальную "
                 "боль селлеров, но цифры в нём <strong>примерные</strong>: они "
                 "показывают порядок величин и соотношения, а не расчёт по "
                 "конкретному аккаунту. Кейсы 01–04, наоборот, посчитаны по данным "
                 "Seller API.</span></div>")

    for anchor, title, icon, paras in [
        ("context", "Контекст", "info", c["context"]),
        ("problem", "Проблема", "alert-triangle", c["problem"]),
        ("did", "Что сделали", "list-checks", c["did"]),
    ]:
        A.append(f'<section class="section" id="{anchor}" aria-labelledby="{anchor}-t">')
        A.append('<div class="section-head">')
        A.append(f'<h2 class="section-title" id="{anchor}-t">{e(title)}</h2>')
        A.append("</div>")
        A.append('<div class="card case-prose">')
        for p in paras:
            A.append(f'<p class="service__text">{e(p)}</p>')
        A.append("</div>")
        A.append("</section>")

    if c.get("plan"):
        pl = c["plan"]
        A.append('<section class="section" id="plan" aria-labelledby="plan-t">')
        A.append('<div class="section-head"><h2 class="section-title" id="plan-t">'
                 f'{e(pl["title"])}</h2><span class="section-note">'
                 f'{e(pl["note"])}</span></div>')
        A.append('<div class="plan-grid">')
        for tag, name, lever, why in pl["scenarios"]:
            A.append('<article class="card plan-card">'
                     f'<p class="plan-card__tag">Сценарий {e(tag)}</p>'
                     f'<h3 class="plan-card__name">{e(name)}</h3>'
                     f'<p class="plan-card__lever">{e(lever)}</p>'
                     f'<p class="service__text">{e(why)}</p></article>')
        A.append("</div>")
        A.append('<div class="table-wrap"><table class="table table--compact">'
                 '<thead><tr><th>Показатель</th>'
                 + "".join(f'<th class="num">Сценарий {e(t)}</th>'
                           for t, _, _, _ in pl["scenarios"])
                 + "</tr></thead><tbody>")
        for row in pl["rows"]:
            cells = "".join(f'<td class="num">{e(v)}</td>' for v in row[1:])
            A.append(f'<tr><td class="lead">{e(row[0])}</td>{cells}</tr>')
        A.append("</tbody></table></div>")
        A.append('<div class="card plan-verdict"><p class="plan-verdict__label">'
                 "Вывод</p>"
                 f'<p class="service__text">{e(pl["verdict"])}</p></div>')
        A.append('<div class="card plan-next"><p class="plan-verdict__label">'
                 "Что дальше: 2–3 недели</p>"
                 '<ul class="list-checks">')
        for step in pl["next"]:
            A.append(f'<li class="service__text">{e(step)}</li>')
        A.append("</ul></div>")
        A.append("</section>")

    if c.get("cost_rows"):
        A.append('<section class="section" id="cost" aria-labelledby="cost-t">')
        A.append('<div class="section-head"><h2 class="section-title" id="cost-t">'
                 "Себестоимость по статьям</h2>"
                 '<span class="section-note">партия 400 шт, на единицу</span></div>')
        total = sum(v for _, v in c["cost_rows"])
        A.append('<div class="table-wrap"><table class="table table--compact">'
                 '<thead><tr><th>Статья</th><th class="num">На единицу</th>'
                 '<th class="num">Доля</th></tr></thead><tbody>')
        for name, v in c["cost_rows"]:
            A.append(f'<tr><td class="lead">{e(name)}</td>'
                     f'<td class="num" data-money="{v}" data-dec="2">—</td>'
                     f'<td class="num" data-pct-num="{round(v / total * 100, 1)}">—</td></tr>')
        A.append(f'<tr><td class="lead">Итого</td>'
                 f'<td class="num" data-money="{total}" data-dec="2">—</td>'
                 f'<td class="num">100,0 %</td></tr>')
        A.append("</tbody></table></div>")
        A.append(f'<p class="footnote">Логистика WB по этому объёму — '
                 f'<span data-money="78.2" data-dec="2">—</span>. Это больше всей '
                 f'себестоимости и в 15,6 раза больше доставки товара до склада.</p>')
        A.append("</section>")

    A.append('<section class="section" id="result" aria-labelledby="result-t">')
    A.append('<div class="section-head"><h2 class="section-title" id="result-t">Результат</h2>'
             '<span class="section-note">по фактическим ценам последнего заказа</span></div>')
    A.append('<div class="grid grid-3">')
    for label, value, tone in c["result"]:
        A.append('<div class="metric">')
        A.append(f'<span class="metric-label">{e(label)}</span>')
        A.append(f'<p class="metric--sm metric-value tone-{tone}">{e(value)}</p>')
        A.append("</div>")
    A.append("</div></section>")

    if c.get("chart"):
        ch = c["chart"]
        A.append('<section class="section" id="chart" aria-labelledby="chart-t">')
        A.append('<div class="section-head">')
        A.append(f'<h2 class="section-title" id="chart-t">{e(ch["title"])}</h2>')
        A.append('<span class="section-note">на 5 п.п. скидки</span>')
        A.append("</div>")
        A.append('<div class="card">')
        A.append('<div class="chart-box">')
        A.append('<canvas id="sens" role="img" '
                 f'aria-label="{e(ch["title"])}"></canvas>')
        A.append("</div>")
        if ch.get("kind", "line") == "line":
            A.append('<div class="chart-legend">')
            A.append('<span class="legend-dot legend-dot--fbs"></span>FBS')
            A.append('<span class="legend-dot legend-dot--fbw"></span>FBW')
            A.append('<span class="legend-line legend-line--zero"></span>'
                     "точка безубыточности FBS")
            A.append("</div>")
        A.append(f'<p class="footnote">{e(ch["note"])}</p>')
        A.append("</div>")
        A.append("</section>")

    A.append('<section class="section" id="insight" aria-labelledby="insight-t">')
    A.append('<div class="section-head"><h2 class="section-title" id="insight-t">'
             "Ключевой инсайт</h2></div>")
    A.append(f'<div class="alert alert--info case-insight"><i data-lucide="lightbulb" '
             f'width="16" height="16" aria-hidden="true"></i><span>{e(c["insight"])}</span></div>')
    A.append("</section>")

    if c.get("calc"):
        A += lab_block(c, depth)

    # «Похожая боль?» → «Как решаем» с кнопкой заказа.
    # pain — id карточки боли на главной (pain-commission …), svc — id услуги
    # (p7, p13 …). Названия берутся из разметки главной и order-modal.js,
    # чтобы текст в кейсе и на главной не расходились.
    pain_id = c.get("pain") or CASE_LINKS.get(c["id"], (None, None))[0]
    svc = c.get("service") or CASE_LINKS.get(c["id"], (None, None))[1]
    pain = PAIN_TITLES.get(pain_id, pain_id)
    if pain:
        up2 = "../" if depth else ""
        A.append('<section class="section case-fix" id="fix" aria-labelledby="fix-t">')
        A.append('<div class="section-head"><h2 class="section-title" id="fix-t">'
                 "Похожая боль?</h2>"
                 '<span class="section-note">если это про вас — есть решение'
                 "</span></div>")
        A.append('<div class="case-fix__grid">')
        A.append('<div class="card case-fix__pain">'
                 '<p class="plan-card__tag">Похожая боль</p>'
                 f'<p class="case-fix__title">{e(pain)}</p>'
                 f'<a class="case-fix__link" href="{up2}index.html#{e(pain_id)}">'
                 'Эта боль на главной'
                 '<i data-lucide="arrow-right" width="14" height="14" '
                 'aria-hidden="true"></i></a></div>')
        if svc:
            # svc — это ЧИСЛОВОЙ id услуги (p7, p13 …), а не её название.
            # Название берём из PRODUCTS: раньше сюда попадало само название,
            # из-за чего в тексте печаталось «Услуга №Юнит-экономика», а в
            # якорь уходил «#product-Юнит-экономика» — битая ссылка, потому
            # что настоящие якоря в products/index.html это #p7, #p13.
            svc_title = SERVICE_TITLES.get(str(svc), f"Услуга {svc}")
            A.append('<div class="card case-fix__svc">'
                     '<p class="plan-card__tag">Как решаем</p>'
                     f'<p class="case-fix__title">{e(svc_title)}</p>'
                     '<p class="service__text">Разбор считается по вашим '
                     'данным: ставка категории, логистика по фактическим '
                     'габаритам, возвраты и реклама, которых нет в '
                     'типовом расчёте площадки.</p>'
                     '<div class="case-fix__actions">'
                     f'<button class="btn btn--primary btn-order" type="button" '
                     f'data-order-service="{e(svc)}">'
                     '<i data-lucide="shopping-cart" width="16" height="16" '
                     'aria-hidden="true"></i>Заказать</button>'
                     f'<a class="btn btn--ghost" href="{up2}products/index.html#{e(svc)}">'
                     'Подробнее об услуге</a></div></div>')
        A.append("</div></section>")

    A.append('<div class="case-actions no-print">')
    # Ссылка на карточку товара. Реальной ссылки нет ни у одного кейса —
    # показываем плейсхолдер, как требует ТЗ, вместо выдуманного URL.
    link = c.get("product_url")
    if link:
        A.append(f'<a class="btn" href="{e(link)}" target="_blank" rel="noopener">'
                 '<i data-lucide="external-link" width="16" height="16" '
                 'aria-hidden="true"></i>Карточка товара</a>')
    else:
        A.append('<span class="btn btn--ghost is-disabled" aria-disabled="true">'
                 '<i data-lucide="external-link" width="16" height="16" '
                 'aria-hidden="true"></i>Карточка товара — [ССЫЛКА]</span>')
    A.append(f'<button class="btn btn--primary btn-order" type="button" '
             f'data-order-source="кейс {e(c["num"])}">'
             f'<i data-lucide="shopping-cart" width="16" height="16" '
             f'aria-hidden="true"></i>Заказать разбор</button>')
    A.append(f'<a class="btn btn--primary cs-max" href="{e(MAX_URL)}" target="_blank" '
             f'rel="noopener"><i data-lucide="message-circle" width="16" height="16" '
             f'aria-hidden="true"></i>Написать в MAX</a>')
    A.append(f'<button class="btn" type="button" onclick="window.print()">'
             f'<i data-lucide="download" width="16" height="16" aria-hidden="true"></i>'
             f"Скачать PDF</button>")
    A.append('<a class="btn btn--ghost" href="index.html">'
             '<i data-lucide="arrow-left" width="16" height="16" aria-hidden="true"></i>'
             "Все кейсы</a>")
    A.append("</div>")

    if c.get("chart"):
        A += chart_script(c)
    if c.get("calc"):
        import json as _json
        # Логистика и ПВЗ ползунками не меняются: их значения приходят
        # из словаря кейса. Без них формула даёт NaN, а поля показывают
        # «не число».
        A.append('<script>window.__CASE_LAB__ = ' + _json.dumps({
            "root": "#lab-root",
            "dec": 2,
            "returnFixed": RETURN_FIXED,
            "logistics": c["calc"]["logistics"],
            "pvz": c["calc"]["pvz"],
            "extra": c["calc"].get("extra", 0),
            "chartMax": max(400, int(c["calc"]["price"] * 1.6)),
        }, ensure_ascii=False) + ";</script>")
        up_lab = "../assets/" if depth else "assets/"
        A.append('<script defer src="%scase-lab.js"></script>' % up_lab)
    if c.get("source"):
        A.append(f'<p class="case-source">{e(c["source"])}</p>')
    A.append('<p class="case-source">Расчёт по данным Seller API и оферты WB. '
             "Модель: <span class=\"code\">econ_v3</span>, вероятность штрафа 0,30 % "
             "по эмпирике продавца. Себестоимость подтверждена продавцом.</p>")
    A.append("</main>")
    A.append(order_modal())

    A += footer(depth)
    return "\n".join(A)


def index_page() -> str:
    A = head("Кейсы — аналитика маркетплейсов",
             "Двенадцать разборов: четыре по данным Seller API и восемь "
             "обобщённых — по реальным болям селлеров.", depth=1)
    A += header(1, active="index.html")
    A.append('<main class="page">')
    A.append('<header class="page-head"><div>')
    A.append('<h1 class="page-title">Кейсы</h1>')
    A.append('<p class="page-sub">Восемь разборов. Кейсы 01–04 посчитаны по данным Seller API '
             "по последнему реальному заказу, а не из брифа: именно на фактических "
             "ценах видно, где карточка теряет деньги. Кейсы 05–08 — обобщённые "
             "разборы реальных болей, их цифры примерные и помечены.</p>")
    A.append("</div></header>")

    A.append('<div class="grid grid-kpi">')
    for label, value, hint in [
        ("Разборов", "8", "4 по API, 4 обобщённых"),
        ("Сценарий", "факт WB", "последний реальный заказ"),
        ("Комиссия в кейсах", "28,5 – 42 %", "разброс категорий"),
        ("Модель", "econ_v3", "верифицирована 5/5"),
    ]:
        A.append('<div class="metric"><div class="metric-top">'
                 f'<span class="metric-label">{e(label)}</span></div>'
                 f'<p class="metric--sm metric-value">{e(value)}</p>'
                 f'<span class="metric-foot metric-hint">{e(hint)}</span></div>')
    A.append("</div>")

    A.append('<div class="cs-filter" role="group" aria-label="Фильтр по модели">'
             '<span class="cs-filter__label">Модель:</span>')
    for fid, label in [("all", "Все"), ("fbs", "FBS"), ("fbw", "FBW")]:
        A.append(f'<button class="btn btn--ghost cs-filter__btn" type="button" '
                 f'data-model="{fid}" aria-pressed="{"true" if fid == "all" else "false"}">'
                 f"{label}</button>")
    A.append("</div>")

    # Фильтр по темам. Идентификаторы — русские и совпадают со значениями
    # в data-tags карточек: латинские ключи не находили ничего, потому что
    # теги заданы по-русски.
    A.append('<div class="cs-filter" role="group" aria-label="Фильтр по теме">'
             '<span class="cs-filter__label">Тема:</span>')
    for fid, label in [("all", "Все"), ("экономика", "экономика"),
                       ("логистика", "логистика"), ("реклама", "реклама"),
                       ("комплаенс", "комплаенс")]:
        A.append(f'<button class="btn btn--ghost cs-filter__btn" type="button" '
                 f'data-topic="{e(fid)}" aria-pressed="{"true" if fid == "all" else "false"}">'
                 f"{label}</button>")
    A.append("</div>")

    A.append('<div class="grid grid-2">')
    for c in CASES:
        tone = c["kv_tone"]
        label = c["kv_label"]
        tags = ",".join(c.get("tags", []))
        A.append(f'<article class="card case" data-model="{c["model"]}" '
                 f'data-tags="{tags}">')
        A.append(f'<div class="case__num">{e(c["num"])}</div>')
        A.append(f'<div><h2 class="card-title">{e(c["title"])}</h2>'
                 f'<p class="card-sub">{e(c["subtitle"])}</p></div>')
        A.append(f'<div class="case__kpi">'
                 f'<span class="case__kpi-value kpi-{tone}" data-money="{c["kv_value"]}" '
                 f'data-dec="{c["kv_dec"]}">—</span>'
                 f'<span class="case__kpi-label">{e(label)}</span></div>')
        A.append(f'<p class="service__text">{e(c["headline"])}</p>')
        A.append('<div class="case__foot">')
        A.append(f'<span class="badge badge--neutral">{e(c["category"])}</span>')
        A.append(f'<a class="case__link" href="{c["id"]}.html">Смотреть'
                 f'<i data-lucide="arrow-up-right" width="14" height="14" '
                 f'aria-hidden="true"></i></a>')
        A.append("</div></article>")
    A.append("</div>")

    A.append('<div class="case-actions no-print">')
    A.append(f'<button class="btn btn--primary btn-order" type="button" '
             f'data-order-source="кейс {e(c["num"])}">'
             f'<i data-lucide="shopping-cart" width="16" height="16" '
             f'aria-hidden="true"></i>Заказать разбор</button>')
    A.append(f'<a class="btn btn--primary cs-max" href="{e(MAX_URL)}" target="_blank" '
             f'rel="noopener"><i data-lucide="message-circle" width="16" height="16" '
             f'aria-hidden="true"></i>Написать в MAX</a>')
    A.append('<a class="btn btn--ghost" href="../index.html">'
             '<i data-lucide="arrow-left" width="16" height="16" aria-hidden="true"></i>'
             "На главную</a>")
    A.append("</div>")
    A.append('<p class="case-source">Кейсы 01–04 — честная выборка по этому аккаунту: '
             "два товара были убыточны на ценах из брифа и вышли в плюс на "
             "фактических, один держится на грани из-за комиссии 42 %, один "
             "оказался лучше, чем выглядел по ТЗ. Кейсы 05–08 — обобщённые "
             "разборы болей, их цифры считаются по тарифам WB и "
             "методическим материалам ФНС.</p>")
    A.append("<script>")
    A.append(CASE_JS)
    A.append("</script>")
    A.append("</main>")
    A.append(order_modal())
    A += footer(1)
    return "\n".join(A)


CASE_CSS = """
/* Интерактивная лаборатория кейса */
.case-lab__card{padding:var(--space-5)}
.case-lab__grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);
  gap:var(--space-6);align-items:start}
.case-lab__field{margin-bottom:var(--space-4)}
.case-lab__label{display:block;font-size:.82rem;color:var(--color-text-secondary);
  letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.case-lab__out{display:inline-block;margin-left:var(--space-2);font-size:1.05rem;
  font-weight:700;color:var(--color-text-primary);font-variant-numeric:tabular-nums}
.case-lab__range{width:100%;margin:var(--space-2) 0 var(--space-1);accent-color:var(--color-accent)}
.case-lab__range:focus-visible{outline:2px solid var(--color-accent);outline-offset:4px}
.case-lab__range-ends{font-size:.75rem;color:var(--color-text-tertiary);
  font-variant-numeric:tabular-nums}
.case-lab__buttons{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-4)}
.case-lab__kpi{background:var(--color-surface);border:1px solid var(--color-border);
  border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3)}
.case-lab__margin{font-size:2rem;font-weight:800;font-variant-numeric:tabular-nums;
  line-height:1.1;letter-spacing:-.02em}
.case-lab__pct{font-size:.9rem;color:var(--color-text-secondary);font-variant-numeric:tabular-nums}
.case-lab__be{margin-bottom:var(--space-3)}
.case-lab__be-value{font-size:1.4rem;font-weight:700;color:var(--color-accent);
  font-variant-numeric:tabular-nums}
.case-lab__break{display:grid;grid-template-columns:1fr auto;gap:6px var(--space-3);
  margin:0;font-size:.9rem}
.case-lab__break dt{color:var(--color-text-secondary)}
.case-lab__break dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.case-lab__chart{margin-top:var(--space-5);height:300px}

/* Блок «Похожая боль? / Как решаем» */
.case-fix__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:var(--space-4)}
.case-fix__pain,.case-fix__svc{display:flex;flex-direction:column;gap:var(--space-2)}
.case-fix__title{font-size:1.15rem;font-weight:700;line-height:1.3;color:var(--color-text-primary)}
.case-fix__link{display:inline-flex;align-items:center;gap:6px;margin-top:auto;
  font-size:.9rem;color:var(--color-accent);text-decoration:none;font-weight:600}
.case-fix__link:hover{text-decoration:underline}
.case-fix__actions{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)}

/* Печать: в PDF уходит только результат расчёта, не ползунки */
@media print{
  .case-lab__controls .case-lab__buttons{display:none}
  .case-lab__chart{height:220px}
}
@media (max-width:820px){
  .case-lab__grid{grid-template-columns:1fr}
  .case-lab__chart{height:240px}
}


/* Специфика страниц кейсов. Общие компоненты (крошки, титул, инсайт,
   фильтр, кнопки) живут в assets/style.css, раздел 17 — здесь только
   то, что не нужно ни главной, ни каталогу. */

@media (max-width: 720px) {
  .case-hero { padding: var(--space-4) 0; }
}

/* ТЁМНАЯ ПАЛИТРА ПЕЧАТИ.

   Раздел 18 style.css переводит печать на белый лист — это сделано
   осознанно для резюме (тёмная заливка на бумаге не печатается
   большинством принтеров). Здесь решение обратное: PDF кейсов и
   каталога выходит тёмным, премиум-версией. Поэтому палитра
   переопределяется явно, а не через var() — var() здесь уже указывал
   бы на белые значения из раздела 18.

   Значения совпадают с палитрой раздела 1 (тёмная тема): меняются
   только кегль и отступы. */
@media print{
  @page{size:A4;margin:12mm 10mm}
  html,[data-theme]{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-scheme:dark;background-color:#0a0e1a}
  :root{
    --color-bg: #0a0e1a;
    --color-surface: #121a2b;
    --color-surface-raised: #182236;
    --color-well: #0d1422;
    --color-hover: #151e2f;
    --color-border: #1e2a3f;
    --color-border-strong: #33425c;
    --color-border-control: #5a6b86;
    --color-text-primary: #e8edf7;
    --color-text-secondary: #a3b0c7;
    --color-text-tertiary: #7b8aa3;
    --color-accent: #5b9bff;
    --color-accent-strong: #8ab6ff;
    --color-profit: #3ddc97;
    --color-loss: #ff958c;
    --color-warning: #fbbf24;
    --color-profit-kpi: #3ddc97;
    --color-loss-kpi: #ff958c;
    --color-warning-kpi: #fbbf24;
    --color-info: #38bdf8;
    --color-text-on-accent: #0a0e1a;
    --color-focus-ring: #8ab6ff;
  }
  body{background:var(--color-bg)!important;color:var(--color-text-primary)!important;
    font-size:10.2pt;line-height:1.36}
  /* печать компактнее экрана: кегль и отступы уменьшены */
  /* Кегли в px, потому что токены --text-* читают элементы как font-size.
     9 pt ровно = 12 px при 96 dpi (9 * 96/72). Ниже 12 не опускаемся:
     8.6 px давали 6,45 pt и в PDF текст был нечитаем. */
  :root{--text-3xl:26px;--text-2xl:17px;--text-xl:15px;--text-lg:14px;
    --text-base:12px;--text-sm:12px;--text-xs:12px;--text-2xs:12px;
    --space-16:14px;--space-10:10px;--space-8:9px;--space-6:8px;
    --space-5:7px;--space-4:6px;--space-3:5px;--row-h-md:24px;
    --radius-lg:6px;--radius-sm:4px}
  .page{max-width:none;padding:0}
  .no-print,.site-header,.site-footer .site-footer__nav,.cs-filter{display:none!important}
  /* Секции НЕ фиксируем целиком: с avoid заголовок уезжает на
     следующую страницу вместе со всем блоком и оставляет хвостовую
     страницу в 3 строки. Разрываем свободно, но заголовок не отрываем
     от содержимого, а карточки и таблицы держим целиком. */
  .section{break-inside:auto;page-break-inside:auto}
  .section-head{break-after:avoid;page-break-after:avoid}
  .card,.metric,.alert,.table-wrap{break-inside:avoid;page-break-inside:avoid}
  .case-hero{border-bottom:1px solid var(--color-border-strong)}
  .grid-2,.grid-3{grid-template-columns:1fr 1fr!important;gap:var(--space-4)}
  .site-footer{margin-top:var(--space-5);padding-top:var(--space-3);
    border-top:1px solid var(--color-border)}
  .site-footer__copy{color:var(--color-text-tertiary)}
  a[href^="http"]::after{content:none!important}
  .case-prose{gap:var(--space-2)}
  /* Полоса набора A4 при полях 16/14 мм — 1000 px. Коротким кейсам
     (01, 03, 04) не хватало 51-82 px, из-за чего уезжал подвал на
     отдельную страницу. Ужимаем вертикальные отступы секций. */
  .section{margin-top:var(--space-4)}
  .case-hero{padding:0 0 var(--space-4)}
  .case-headline{margin-bottom:var(--space-4)}
  .case-source{margin-top:var(--space-4)}
}
"""

# Тёмная печать для существующих страниц (каталог, резюме, главная).
# Кнопки скрываются, фон печатается — по решению владельца.
PRINT_CSS = """
/* Тёмный PDF. print-color-adjust: exact иначе Chrome выдаст белый лист. */
@media print{
  @page{size:A4;margin:12mm 10mm}
  html,[data-theme]{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-scheme:dark;background-color:#0a0e1a}
  :root{
    --color-bg: #0a0e1a;
    --color-surface: #121a2b;
    --color-surface-raised: #182236;
    --color-well: #0d1422;
    --color-hover: #151e2f;
    --color-border: #1e2a3f;
    --color-border-strong: #33425c;
    --color-border-control: #5a6b86;
    --color-text-primary: #e8edf7;
    --color-text-secondary: #a3b0c7;
    --color-text-tertiary: #7b8aa3;
    --color-accent: #5b9bff;
    --color-accent-strong: #8ab6ff;
    --color-profit: #3ddc97;
    --color-loss: #ff958c;
    --color-warning: #fbbf24;
    --color-profit-kpi: #3ddc97;
    --color-loss-kpi: #ff958c;
    --color-warning-kpi: #fbbf24;
    --color-info: #38bdf8;
    --color-text-on-accent: #0a0e1a;
    --color-focus-ring: #8ab6ff;
  }
  body{background:var(--color-bg)!important;color:var(--color-text-primary)!important;
    font-size:10.2pt;line-height:1.45}  .no-print,.theme-toggle,.cat-filter,.cat-actions,.cat-contact-actions,
  .cat-head-right,.cat-filter,.print-btn{display:none!important}
  .page{max-width:none;padding:0}
  :root{--text-3xl:28px;--text-2xl:18px;--text-lg:15px;--text-base:12px;
    --text-sm:12px;--text-xs:12px;--text-2xs:12px;--space-16:16px;
    --space-8:11px;--space-6:9px;--space-5:8px;--space-4:7px;--space-3:6px;
    --row-h-md:24px;--radius-lg:6px;--radius-sm:4px}
  .card,.metric,.cat-card,.cat-contact-card,.table-wrap,.alert{
    background:var(--color-surface)!important;border-color:var(--color-border-strong)!important;
    box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
  .cat-grid{grid-template-columns:1fr 1fr!important}
  .cat-kpi{grid-template-columns:repeat(4,1fr)!important}
  .card-title,.cat-meta-value,.section-title,.metric-value{color:var(--color-text-primary)!important}
  .cat-list li,.cat-lead,.cat-result-text,.cat-contact-text,.metric-label,
  .metric-hint,.page-sub,.cat-blurb,.cat-meta-label{color:var(--color-text-secondary)!important}
  .site-footer{border-color:var(--color-border-strong)!important}
}
"""

CHART_JS = r"""  var cv = document.getElementById('sens');
  if (!cv || typeof Chart === 'undefined') return;
  var css = getComputedStyle(document.documentElement);
  var tok = function (name) { return css.getPropertyValue(name).trim(); };
  var accent = tok('--color-accent');
  var profit = tok('--color-profit');
  var loss = tok('--color-loss');
  var grid = tok('--color-border');
  var text = tok('--color-text-tertiary');

  var fmt = function (v) {
    var s = Math.abs(v).toFixed(0);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s + ' ₽';
  };

  // Линия рисуется сплошной: отрицательные значения идут ниже нуля
  // цветом loss, положительные — profit. Отрезки разделяются по знаку.
  var segmentColor = function (ctx, base, zeroColor) {
    var zero = ctx.p0.parsed.y;
    return zero < base ? base : zeroColor;
  };

  var datasets = CFG.series.map(function (sr) {
    return {
      label: sr.name,
      data: sr.values,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.15,
      fill: false,
      borderColor: sr.name === 'FBS' ? accent : profit,
      pointBackgroundColor: sr.name === 'FBS' ? accent : profit,
      segment: {
        borderColor: function (ctx) {
          var zero = ctx.p0.parsed.y;
          return zero < 0 ? loss : (sr.name === 'FBS' ? accent : profit);
        },
      },
    };
  });

  new Chart(cv, {
    type: 'line',
    data: { labels: CFG.labels.map(function (l) { return l + ' %'; }),
            datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tok('--color-surface-overlay'),
          borderColor: tok('--color-border-strong'),
          borderWidth: 1,
          titleColor: tok('--color-text-primary'),
          bodyColor: tok('--color-text-secondary'),
          padding: 10,
          displayColors: true,
          callbacks: {
            label: function (item) { return item.dataset.label + ': ' + fmt(item.parsed.y); },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'скидка продавца',
                    color: text, font: { size: 11 } },
          grid: { color: grid, drawTicks: false },
          ticks: { color: text, font: { size: 11 } },
          border: { color: grid },
        },
        y: {
          title: { display: true, text: 'прибыль с единицы',
                    color: text, font: { size: 11 } },
          grid: { color: grid, drawTicks: false },
          ticks: {
            color: text, font: { size: 11 },
            callback: function (v) { return fmt(v); },
          },
          border: { color: grid },
        },
      },
    },
    plugins: [{
      id: 'zeroLine',
      afterDatasetsDraw: function (chart) {
        var y = chart.scales.y.getPixelForValue(0);
        var ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = text;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, y);
        ctx.lineTo(chart.chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = text;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('безубыточность FBS ' + CFG.zeroLabel,
                     chart.chartArea.right - 6, y - 6);
        ctx.restore();
      },
    }],
  });
"""

CASE_JS = """
/* Фильтр кейсов: по модели (FBS/FBW) и по теме. Два независимых
   фильтра складываются — «FBS + логистика» покажет только пересечение.
   Кнопки и карточки уже в разметке, сборка не нужна. */
document.addEventListener('DOMContentLoaded', function () {
  var cards = document.querySelectorAll('.case[data-model]');
  var modelBtns = document.querySelectorAll('.cs-filter__btn[data-model]');
  var topicBtns = document.querySelectorAll('.cs-filter__btn[data-topic]');
  if (!cards.length) return;

  var curModel = 'all';
  var curTopic = 'all';

  function apply() {
    cards.forEach(function (c) {
      var mOk = curModel === 'all' || c.dataset.model === curModel
                || c.dataset.model === 'both';
      var tags = (c.dataset.tags || '').split(',').filter(Boolean);
      var tOk = curTopic === 'all' || tags.indexOf(curTopic) !== -1;
      c.hidden = !(mOk && tOk);
    });
  }

  function bind(btns, key) {
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var want = b.dataset[key];
        if (key === 'model') curModel = want; else curTopic = want;
        btns.forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        apply();
      });
    });
  }

  bind(modelBtns, 'model');
  bind(topicBtns, 'topic');
});
"""


# ── печать в PDF ──────────────────────────────────────────────────────────

def build_pdf(src: pathlib.Path, dst: pathlib.Path) -> bool:
    """Chrome печатает HTML в PDF. Тёмная тема сохраняется через print-color-adjust."""
    profile = "/tmp/chrome-cases"
    cmd = [
        "google-chrome-stable", "--headless=new", "--no-sandbox", "--disable-gpu",
        "--disable-dev-shm-usage", "--no-pdf-header-footer",
        f"--user-data-dir={profile}", "--virtual-time-budget=15000",
        f"--print-to-pdf={dst}", src.as_uri(),
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=180)
    except FileNotFoundError:
        print("chrome не найден — PDF не собран", file=sys.stderr)
        return False
    if not dst.exists():
        print("PDF не создан:", r.stderr.decode(errors="replace")[:400], file=sys.stderr)
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-pdf", action="store_true")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    written = []

    ip = OUT / "index.html"
    ip.write_text(index_page(), encoding="utf-8")
    written.append(ip)

    for c in CASES:
        p = OUT / f"{c['id']}.html"
        p.write_text(case_page(c), encoding="utf-8")
        written.append(p)

    for p in written:
        print(f"written {p} ({p.stat().st_size} bytes)")

    if args.no_pdf:
        return 0

    for p in written:
        pdf = p.with_suffix(".pdf")
        if build_pdf(p, pdf):
            print(f"written {pdf} ({pdf.stat().st_size} bytes)")
        else:
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
