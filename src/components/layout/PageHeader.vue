<script setup lang="ts">
    import { useRouter } from "vue-router";

    /**
     * Шапка вложенной страницы («Справочники», «Настройки»).
     * Отдельный компонент, потому что без кнопки «назад» с таких экранов
     * некуда возвращаться — они не входят в нижнюю навигацию.
     */
    defineProps<{ title: string }>();

    const router = useRouter();

    function goBack(): void {
        // history.back() ломается, если на страницу зашли по прямой ссылке.
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/overview");
        }
    }
</script>

<template>
    <header class="ft-page-head">
        <button type="button" class="ft-page-head__back ft-icon-btn" aria-label="Назад" @click="goBack">
            <el-icon :size="20"><ArrowLeft /></el-icon>
        </button>
        <h2 class="ft-page-head__title">{{ title }}</h2>
    </header>
</template>
