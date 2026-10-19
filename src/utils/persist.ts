/**
 * Persisting a store slice to localStorage.
 *
 * Split out of `storage.ts` on purpose: that module stays a plain localStorage wrapper,
 * while this one knows about Vue reactivity.
 *
 * Why it exists at all: every store used to do `watch(items, () => saveState(...))` and throw
 * the result away. A failed write (a full ~5 MB quota, Safari private mode, storage blocked by
 * the browser) went completely unnoticed - the app kept working and the data silently vanished
 * on the next reload. Now a failure is remembered and the UI can tell the user about it.
 */
import { computed, ref, watch, type Ref } from "vue";

import { saveState } from "@/utils/storage";

/** The keys whose last write failed. Empty in the normal case. */
const failedKeys = ref<string[]>([]);

/** True while at least one slice of the data is not making it into localStorage. */
export const storageFailed = computed(() => failedKeys.value.length > 0);

/** Writes the slice on every change and keeps track of whether the write went through. */
export function persist<T>(key: string, source: Ref<T>): void {
    watch(
        source,
        (value) => {
            const saved = saveState(key, value);
            const index = failedKeys.value.indexOf(key);
            if (saved && index !== -1) {
                failedKeys.value.splice(index, 1);
            } else if (!saved && index === -1) {
                failedKeys.value.push(key);
            }
        },
        { deep: true },
    );
}
