import { onUnmounted, ref } from "vue";

/**
 * A reactive "hide the floating button" flag - true while the page is being scrolled down,
 * false again as soon as it moves back up.
 *
 * The "+" button is fixed to the bottom right corner, which is exactly where the lists
 * right-align their amounts. The bottom padding of the content only keeps the final row
 * clear; every row passing under the button mid-scroll stays covered by it. Getting out of
 * the way while reading the list - and coming back the moment the user scrolls up - keeps
 * the numbers readable without moving anything in the layout.
 *
 * Scroll events fire far more often than frames are painted, so the work is coalesced into
 * one rAF callback. Movements under `threshold` are ignored (and do not update the anchor,
 * so small steps still add up) - otherwise the button would flicker on the slightest drag.
 */
export function useScrollHide(threshold = 8, topOffset = 24) {
    const hidden = ref(false);
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let frame = 0;

    function update(): void {
        frame = 0;
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY;
        if (Math.abs(delta) < threshold) {
            return;
        }
        // Near the top nothing is covered yet, so the button stays visible there.
        hidden.value = delta > 0 && y > topOffset;
        lastY = y;
    }

    function onScroll(): void {
        if (frame === 0) {
            frame = requestAnimationFrame(update);
        }
    }

    /** Brings the button back - used when the route changes and the old scroll state is gone. */
    function reveal(): void {
        hidden.value = false;
        lastY = typeof window !== "undefined" ? window.scrollY : 0;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onUnmounted(() => {
        window.removeEventListener("scroll", onScroll);
        if (frame !== 0) {
            cancelAnimationFrame(frame);
        }
    });

    return { hidden, reveal };
}
