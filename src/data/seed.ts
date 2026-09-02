import type { CategoryKind } from "@/types/models";
import { useAccountsStore } from "@/stores/accounts";
import { useCategoriesStore } from "@/stores/categories";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";

/** Палитра для групп категорий — проверенный набор, различимый в том числе при дальтонизме. */
export const PALETTE = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#4a3aa7",
    "#e34948",
    "#0f766e",
    "#7c3aed",
] as const;

interface SeedGroup {
    name: string;
    icon: string;
    kind: CategoryKind;
    children: string[];
}

/** Стартовый набор категорий — примерно то, с чего начинает 1Money. Всё редактируется в разделе «Категории». */
const SEED_GROUPS: SeedGroup[] = [
    { name: "Продукты", icon: "🛒", kind: "expense", children: ["Супермаркет", "Рынок", "Доставка"] },
    { name: "Кафе и рестораны", icon: "☕", kind: "expense", children: ["Кофе", "Обед", "Бар"] },
    { name: "Транспорт", icon: "🚌", kind: "expense", children: ["Общественный транспорт", "Такси", "Бензин", "Парковка"] },
    { name: "Жильё", icon: "🏠", kind: "expense", children: ["Аренда", "Коммунальные", "Интернет"] },
    { name: "Здоровье", icon: "💊", kind: "expense", children: ["Аптека", "Врач", "Спорт"] },
    { name: "Покупки", icon: "🛍️", kind: "expense", children: ["Одежда", "Электроника", "Для дома"] },
    { name: "Развлечения", icon: "🎮", kind: "expense", children: ["Подписки", "Кино", "Игры", "Путешествия"] },
    { name: "Прочее", icon: "📦", kind: "expense", children: ["Подарки", "Комиссии"] },
    { name: "Зарплата", icon: "💼", kind: "income", children: ["Оклад", "Премия"] },
    { name: "Подработка", icon: "💻", kind: "income", children: ["Фриланс"] },
    { name: "Прочий доход", icon: "💰", kind: "income", children: ["Проценты", "Возврат", "Подарок"] },
];

/**
 * Наполняет пустое приложение стартовыми данными: один счёт и дерево категорий.
 * Выполняется один раз — факт заполнения запоминается в localStorage.
 */
export function seedIfEmpty(): void {
    const alreadySeeded = loadState<boolean>(STORAGE_KEYS.seeded, false);
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();

    if (alreadySeeded || accounts.items.length > 0 || categories.groups.length > 0) {
        return;
    }

    accounts.add({ name: "Наличные", icon: "💵", color: "#1baf7a", initialBalance: 0 });
    accounts.add({ name: "Карта", icon: "💳", color: "#2a78d6", initialBalance: 0 });

    SEED_GROUPS.forEach((seed, index) => {
        const group = categories.addGroup({
            name: seed.name,
            kind: seed.kind,
            icon: seed.icon,
            color: PALETTE[index % PALETTE.length],
        });
        seed.children.forEach((child) => categories.addSubcategory(group.id, child));
    });

    saveState(STORAGE_KEYS.seeded, true);
}
