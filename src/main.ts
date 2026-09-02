import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import VueApexCharts from "vue3-apexcharts";
import en from "element-plus/es/locale/lang/en";

import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";
import "@/assets/styles/main.css";

import App from "@/App.vue";
import router from "@/router";
import { seedIfEmpty } from "@/data/seed";
import { useRecurringStore } from "@/stores/recurring";
import { useSettingsStore } from "@/stores/settings";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
// On a narrow screen Element Plus components are larger - 32px tall fields are hard to hit with a finger.
app.use(ElementPlus, { locale: en, size: window.matchMedia("(max-width: 899px)").matches ? "large" : "default" });
app.use(VueApexCharts);

Object.entries(ElementPlusIconsVue).forEach(([name, component]) => {
    app.component(name, component);
});

// Startup work: the theme, demo categories for an empty database, and catching up on
// transactions from recurring rules for the time the app was not open.
useSettingsStore().applyTheme();
seedIfEmpty();
useRecurringStore().materializeDue();

app.mount("#app");
