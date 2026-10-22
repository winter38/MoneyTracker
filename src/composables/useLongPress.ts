import { onUnmounted, ref } from "vue";

/**
 * "Tap and hold" for a button that already does something on a plain tap.
 *
 * Pointer events cover a finger and a mouse alike. Two things make the gesture behave on a
 * phone: the timer is dropped as soon as the finger travels more than `moveTolerance`, so
 * scrolling the grid never counts as a hold, and the view asks `consumed()` inside its click
 * handler - a hold is followed by a click on most browsers, and without that check the tile
 * would fire its tap action on top of the hold.
 *
 * The browser's own long-press menu (text selection on Android, the link preview on iOS) has
 * to be suppressed by the element itself: `@contextmenu.prevent` plus `user-select: none` and
 * `-webkit-touch-callout: none` in its styles, otherwise it opens over whatever this shows.
 */
export function useLongPress<T>(onLongPress: (payload: T) => void, delay = 500, moveTolerance = 10) {
    let timer = 0;
    let origin: { x: number; y: number } | null = null;
    const fired = ref(false);

    function clear(): void {
        if (timer !== 0) {
            window.clearTimeout(timer);
            timer = 0;
        }
        origin = null;
    }

    function start(event: PointerEvent, payload: T): void {
        // A right or middle click is not a hold.
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }
        clear();
        // Cleared here as well as in consumed(): on touch the hold often swallows the click
        // that would have reset it, and a stale flag would eat the next ordinary tap.
        fired.value = false;
        origin = { x: event.clientX, y: event.clientY };
        timer = window.setTimeout(() => {
            timer = 0;
            fired.value = true;
            onLongPress(payload);
        }, delay);
    }

    function move(event: PointerEvent): void {
        if (origin === null || timer === 0) {
            return;
        }
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > moveTolerance) {
            clear();
        }
    }

    /** True when the gesture just ended was a hold - the tap action is then skipped. */
    function consumed(): boolean {
        const wasHeld = fired.value;
        fired.value = false;
        return wasHeld;
    }

    onUnmounted(clear);

    return { start, move, cancel: clear, consumed };
}
