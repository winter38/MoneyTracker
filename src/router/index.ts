import { createRouter, createWebHashHistory } from "vue-router";

/**
 * Hash-режим выбран намеренно: собранный `dist` так открывается и с файловой системы,
 * и с любого статического хостинга без настройки rewrite-правил.
 *
 * Порядок разделов повторяет 1Money: Счета · Категории · Операции · Бюджет · Обзор,
 * а «Справочники» и «Настройки» живут за кнопками в шапке.
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: "/", redirect: "/overview" },
        {
            path: "/accounts",
            name: "accounts",
            component: () => import("@/views/AccountsView.vue"),
            meta: { title: "Счета" },
        },
        {
            path: "/categories",
            name: "categories",
            component: () => import("@/views/CategoriesView.vue"),
            meta: { title: "Категории" },
        },
        {
            path: "/transactions",
            name: "transactions",
            component: () => import("@/views/TransactionsView.vue"),
            meta: { title: "Операции" },
        },
        {
            path: "/budget",
            name: "budget",
            component: () => import("@/views/BudgetView.vue"),
            meta: { title: "Бюджет" },
        },
        {
            path: "/overview",
            name: "overview",
            component: () => import("@/views/OverviewView.vue"),
            meta: { title: "Обзор" },
        },
        {
            path: "/manage",
            name: "manage",
            component: () => import("@/views/ManageView.vue"),
            meta: { title: "Справочники" },
        },
        {
            path: "/settings",
            name: "settings",
            component: () => import("@/views/SettingsView.vue"),
            meta: { title: "Настройки" },
        },
        { path: "/:pathMatch(.*)*", redirect: "/overview" },
    ],
    scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
    const title = (to.meta.title as string | undefined) ?? "";
    document.title = title ? `${title} · Финансы` : "Финансы";
});

export default router;
