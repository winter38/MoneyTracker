import { createRouter, createWebHashHistory } from "vue-router";

/**
 * Hash mode is a deliberate choice: the built `dist` then opens both from the file system
 * and from any static host, with no rewrite rules to configure.
 *
 * The section order follows 1Money: Accounts, Categories, Transactions, Budget, Overview,
 * while Manage and Settings live behind buttons in the header.
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: "/", redirect: "/overview" },
        {
            path: "/accounts",
            name: "accounts",
            component: () => import("@/views/AccountsView.vue"),
            meta: { title: "Accounts" },
        },
        {
            path: "/categories",
            name: "categories",
            component: () => import("@/views/CategoriesView.vue"),
            meta: { title: "Categories" },
        },
        {
            path: "/transactions",
            name: "transactions",
            component: () => import("@/views/TransactionsView.vue"),
            meta: { title: "Transactions" },
        },
        {
            path: "/budget",
            name: "budget",
            component: () => import("@/views/BudgetView.vue"),
            meta: { title: "Budget" },
        },
        {
            path: "/overview",
            name: "overview",
            component: () => import("@/views/OverviewView.vue"),
            meta: { title: "Overview" },
        },
        {
            path: "/manage",
            name: "manage",
            component: () => import("@/views/ManageView.vue"),
            meta: { title: "Manage" },
        },
        {
            path: "/settings",
            name: "settings",
            component: () => import("@/views/SettingsView.vue"),
            meta: { title: "Settings" },
        },
        { path: "/:pathMatch(.*)*", redirect: "/overview" },
    ],
    scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
    const title = (to.meta.title as string | undefined) ?? "";
    document.title = title ? `${title} - Finance` : "Finance";
});

export default router;
