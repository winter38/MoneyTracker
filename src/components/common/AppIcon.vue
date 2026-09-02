<script setup lang="ts">
    import { computed } from "vue";

    import { iconPath } from "@/data/icons";

    /**
     * Draws an icon by its id from `@/data/icons`.
     *
     * Three kinds of value are accepted, in this order: a registry id, a raw 24x24 SVG
     * path (used by the navigation, whose icons are not offered for picking), and
     * anything else - rendered as text, which is what keeps the emoji stored by earlier
     * versions of the app visible.
     *
     * The glyph is sized in `em` and painted with `currentColor`, so it picks up the
     * font size and the color of whatever container it sits in - that is what makes
     * `iconTint()` recolor it for free.
     */
    const props = defineProps<{ icon: string }>();

    function isRawPath(value: string): boolean {
        return /^[Mm][\s\d.,-]/.test(value);
    }

    const path = computed(() => iconPath(props.icon) ?? (isRawPath(props.icon) ? props.icon : undefined));
</script>

<template>
    <svg v-if="path" class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path :d="path" fill="currentColor" />
    </svg>
    <span v-else class="app-icon app-icon--text" aria-hidden="true">{{ icon }}</span>
</template>

<style scoped>
    .app-icon {
        display: block;
        flex: 0 0 auto;
        width: 1em;
        height: 1em;
    }

    /* An emoji fallback is a glyph, not a box: it needs the line box collapsed to match. */
    .app-icon--text {
        width: auto;
        line-height: 1;
    }
</style>
