import { onUnmounted, ref } from "vue";

/**
 * A reactive "we are on a narrow screen" flag - switches between the desktop and mobile layout.
 *
 * The value is computed synchronously on creation rather than in onMounted: otherwise the first
 * frame renders with the desktop layout and everything is rebuilt right after mounting -
 * ApexCharts used to crash with a destroy() error on that kind of live rebuild.
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
