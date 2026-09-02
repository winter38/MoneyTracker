import type { CategoryKind } from "@/types/models";
import { useAccountsStore } from "@/stores/accounts";
import { useCategoriesStore } from "@/stores/categories";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";

/** The palette for category groups - a tested set that stays distinguishable with color blindness too. */
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

/** The starter set of categories - roughly what any finance tracker starts with. Everything is editable in the Categories section. */
const SEED_GROUPS: SeedGroup[] = [
    { name: "Groceries", icon: "🛒", kind: "expense", children: ["Supermarket", "Market", "Delivery"] },
    { name: "Cafes and restaurants", icon: "☕", kind: "expense", children: ["Coffee", "Lunch", "Bar"] },
    { name: "Transport", icon: "🚌", kind: "expense", children: ["Public transport", "Taxi", "Fuel", "Parking"] },
    { name: "Housing", icon: "🏠", kind: "expense", children: ["Rent", "Utilities", "Internet"] },
    { name: "Health", icon: "💊", kind: "expense", children: ["Pharmacy", "Doctor", "Fitness"] },
    { name: "Shopping", icon: "🛍️", kind: "expense", children: ["Clothes", "Electronics", "Home goods"] },
    { name: "Entertainment", icon: "🎮", kind: "expense", children: ["Subscriptions", "Cinema", "Games", "Travel"] },
    { name: "Other", icon: "📦", kind: "expense", children: ["Gifts", "Fees"] },
    { name: "Salary", icon: "💼", kind: "income", children: ["Base pay", "Bonus"] },
    { name: "Side income", icon: "💻", kind: "income", children: ["Freelance"] },
    { name: "Other income", icon: "💰", kind: "income", children: ["Interest", "Refund", "Gift"] },
];

/**
 * Fills an empty app with starter data: one account and a category tree.
 * Runs only once - the fact that it ran is remembered in localStorage.
 */
export function seedIfEmpty(): void {
    const alreadySeeded = loadState<boolean>(STORAGE_KEYS.seeded, false);
    const accounts = useAccountsStore();
    const categories = useCategoriesStore();

    if (alreadySeeded || accounts.items.length > 0 || categories.groups.length > 0) {
        return;
    }

    accounts.add({ name: "Cash", icon: "💵", color: "#1baf7a", initialBalance: 0 });
    accounts.add({ name: "Card", icon: "💳", color: "#2a78d6", initialBalance: 0 });

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
