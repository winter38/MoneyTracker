import { onUnmounted, ref } from "vue";

/**
 * Реактивный флаг «мы на узком экране» — переключает десктопный и мобильный макет.
 *
 * Значение вычисляется синхронно при создании, а не в onMounted: иначе первый кадр
 * рисуется десктопным макетом, а сразу после монтирования всё перестраивается —
 * ApexCharts от такой пересборки на лету падал с ошибкой destroy().
 */
export function useBreakpoint(query = "(max-width: 899px)") {
    const media = typeof window !== "undefined" ? window.matchMedia(query) : undefined;
    const isMobile = ref(media?.matches ?? false);

    function handler(event: MediaQueryListEvent): void {
        isMobile.value = event.matches;
    }

    media?.addEventListener("change", handler);
    onUnmounted(() => media?.removeEventListener("change", handler));

    return { isMobile };
}
