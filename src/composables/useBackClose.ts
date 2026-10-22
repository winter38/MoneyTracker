/**
 * The phone's back button (and the back gesture) closes what is open on top.
 *
 * Without this, back on Android leaves the page while a sheet is covering half the screen -
 * the one thing a phone user does not expect. Every overlay that opens adds a history entry
 * of its own, so one press back takes one layer off: the picker inside the add screen first,
 * then the add screen, and only then the app itself.
 *
 * The entries carry the same URL as the page under them, with a marker in `history.state`.
 * The router sees no navigation at all; the browser just gets something for the gesture to
 * consume. Opening and closing are both reconciled a tick later in `sync()`, so a flow that
 * closes two layers at once (saving a transaction while a picker is still open) costs one
 * `history.go(-2)` rather than two fights over the same history.
 */
import { onUnmounted, watch } from "vue";

interface Overlay {
    close: () => void;
}

const STATE_KEY = "ftOverlay";

/** The overlays that are open, bottom first. */
const open: Overlay[] = [];

/** Markers of the history entries we pushed, bottom first. One per overlay, once in sync. */
const pushed: number[] = [];

/** Popstate events we caused with `history.go` and should not read as a press of back. */
let selfTriggered = 0;

let marker = 0;
let scheduled = false;
let listening = false;

function onPopState(): void {
    if (selfTriggered > 0) {
        selfTriggered -= 1;
        return;
    }
    // The browser has already dropped the entry; take the layer it stood for with it.
    pushed.pop();
    open.pop()?.close();
    schedule();
}

/**
 * Brings the history entries in line with the overlays that are open.
 *
 * Deliberately a tick late: a sheet that closes itself and navigates in the same breath
 * (the category details sheet opening the filtered transaction list) would otherwise race
 * its own `router.push`.
 */
function sync(): void {
    scheduled = false;

    while (pushed.length < open.length) {
        marker += 1;
        pushed.push(marker);
        history.pushState({ ...history.state, [STATE_KEY]: marker }, "");
    }

    const extra = pushed.length - open.length;
    if (extra <= 0) {
        return;
    }

    if (history.state?.[STATE_KEY] === pushed[pushed.length - 1]) {
        pushed.length = open.length;
        selfTriggered += 1; // however far it goes, `go` reports back with a single popstate
        history.go(-extra);
    } else {
        // A route change has pushed its own entry on top of ours, so ours are buried and no
        // longer removable. They hold the URL of the page they were opened from, which is
        // where back would land anyway - let them be.
        pushed.length = 0;
    }
}

function schedule(): void {
    if (!scheduled) {
        scheduled = true;
        setTimeout(sync, 0);
    }
}

function add(overlay: Overlay): void {
    if (!listening) {
        window.addEventListener("popstate", onPopState);
        listening = true;
    }
    open.push(overlay);
    schedule();
}

function remove(overlay: Overlay): void {
    const index = open.indexOf(overlay);
    if (index !== -1) {
        // Anything opened on top of it goes as well - it cannot have outlived its own parent.
        open.splice(index);
        schedule();
    }
}

/**
 * Forgets every entry without touching history - the router calls this when a page change
 * buries them.
 *
 * A sheet that navigates on its way out (the category details sheet opening the filtered
 * transaction list) closes and pushes a route in the same breath. Removing our entry at that
 * point would fight the navigation for the same history slot and leave the address bar on the
 * old page. The buried entries hold the URL of the page they were opened from, which is where
 * back goes anyway, so they can simply be left alone.
 */
export function forgetOverlays(): void {
    open.length = 0;
    pushed.length = 0;
}

/**
 * Ties an overlay to the back button.
 *
 * @param isOpen reactive getter telling whether the overlay is on screen
 * @param close  what to call when back is pressed - the same thing the close button does
 */
export function useBackClose(isOpen: () => boolean, close: () => void): void {
    const overlay: Overlay = { close };

    const stop = watch(isOpen, (value) => (value ? add(overlay) : remove(overlay)), { immediate: true });

    onUnmounted(() => {
        stop();
        remove(overlay);
    });
}
