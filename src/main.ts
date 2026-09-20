import { createApp } from "vue";
import { createPinia } from "pinia";
import VueApexCharts from "vue3-apexcharts";

// Element Plus components are auto-imported per template by unplugin-vue-components
// (see vite.config.ts), so only the base variables and the styles of the two components
// that are called from code rather than from a template are needed here.
import "element-plus/theme-chalk/base.css";
import "element-plus/theme-chalk/el-message.css";
import "element-plus/theme-chalk/el-message-box.css";
import "element-plus/theme-chalk/el-overlay.css";
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
app.use(VueApexCharts);

// Startup work: the theme, demo categories for an empty database, and catching up on
// transactions from recurring rules for the time the app was not open.
useSettingsStore().applyTheme();
seedIfEmpty();
useRecurringStore().materializeDue();

app.mount("#app");
