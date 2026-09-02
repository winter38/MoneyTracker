import type { RecurrencePeriod } from "@/types/models";

/** Дата в формате YYYY-MM-DD в локальной таймзоне (не UTC — иначе «уезжает» день). */
export function toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Разбирает YYYY-MM-DD в локальную дату (полдень — чтобы переход на летнее время не сдвигал день). */
export function fromISODate(iso: string): Date {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

export function today(): string {
    return toISODate(new Date());
}

/** Вчерашняя дата — быстрая кнопка в выборе даты. */
export function yesterday(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toISODate(date);
}

/** Суббота или воскресенье. */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/** Ключ месяца YYYY-MM — используется для группировки в отчётах. */
export function monthKey(iso: string): string {
    return iso.slice(0, 7);
}

/** Первый день месяца, к которому относится дата, с учётом дня начала расчётного периода. */
export function startOfPeriod(iso: string, monthStartDay: number): string {
    const date = fromISODate(iso);
    if (date.getDate() < monthStartDay) {
        date.setMonth(date.getMonth() - 1);
    }
    date.setDate(monthStartDay);
    return toISODate(date);
}

/** Конец расчётного периода (включительно). */
export function endOfPeriod(iso: string, monthStartDay: number): string {
    const start = fromISODate(startOfPeriod(iso, monthStartDay));
    start.setMonth(start.getMonth() + 1);
    start.setDate(start.getDate() - 1);
    return toISODate(start);
}

/** Сдвигает дату на N периодов вперёд. */
export function addPeriod(iso: string, period: RecurrencePeriod, interval: number): string {
    const date = fromISODate(iso);
    switch (period) {
        case "daily":
            date.setDate(date.getDate() + interval);
            break;
        case "weekdays":
        case "weekends": {
            // Шагаем по одному дню, пока не попадём в нужный тип дня (пн–пт либо сб–вс).
            const wantsWeekend = period === "weekends";
            do {
                date.setDate(date.getDate() + 1);
            } while (isWeekend(date) !== wantsWeekend);
            break;
        }
        case "weekly":
            date.setDate(date.getDate() + interval * 7);
            break;
        case "monthly": {
            const targetDay = date.getDate();
            date.setDate(1);
            date.setMonth(date.getMonth() + interval);
            // Если в целевом месяце нет такого числа (31-е в феврале) — берём последний день.
            const daysInTarget = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            date.setDate(Math.min(targetDay, daysInTarget));
            break;
        }
        case "yearly":
            date.setFullYear(date.getFullYear() + interval);
            break;
    }
    return toISODate(date);
}

/** Человекочитаемая дата: «23 авг 2026». */
export function formatDate(iso: string, locale: string): string {
    try {
        return fromISODate(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
}

/** Заголовок дня в списке операций: «Сегодня», «Вчера» или дата. */
export function formatDayHeading(iso: string, locale: string): string {
    const now = new Date();
    if (iso === toISODate(now)) {
        return "Сегодня";
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === toISODate(yesterday)) {
        return "Вчера";
    }
    try {
        return fromISODate(iso).toLocaleDateString(locale, { day: "numeric", month: "long", weekday: "short" });
    } catch {
        return iso;
    }
}

/** Подпись месяца для графиков: «авг 26». */
export function formatMonthLabel(key: string, locale: string): string {
    try {
        const [year, month] = key.split("-").map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "short", year: "2-digit" });
    } catch {
        return key;
    }
}

/** Список ключей месяцев от старого к новому, включая пустые месяцы между ними. */
export function monthRange(fromKey: string, toKey: string): string[] {
    const [fromYear, fromMonth] = fromKey.split("-").map(Number);
    const [toYear, toMonth] = toKey.split("-").map(Number);
    const result: string[] = [];
    const cursor = new Date(fromYear, fromMonth - 1, 1);
    const end = new Date(toYear, toMonth - 1, 1);
    while (cursor <= end) {
        result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
        cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
}
