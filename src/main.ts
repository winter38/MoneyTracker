import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import VueApexCharts from "vue3-apexcharts";
import ru from "element-plus/es/locale/lang/ru";

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
// На узком экране элементы Element Plus крупнее — по 32-пиксельным полям тяжело попадать пальцем.
app.use(ElementPlus, { locale: ru, size: window.matchMedia("(max-width: 899px)").matches ? "large" : "default" });
app.use(VueApexCharts);

Object.entries(ElementPlusIconsVue).forEach(([name, component]) => {
    app.component(name, component);
});

// Стартовая инициализация: тема, демо-категории для пустой базы и досоздание
// операций по повторяющимся правилам за время, пока приложение не открывали.
useSettingsStore().applyTheme();
seedIfEmpty();
useRecurringStore().materializeDue();

app.mount("#app");
