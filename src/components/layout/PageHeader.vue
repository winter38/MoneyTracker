<script setup lang="ts">
    import { useRouter } from "vue-router";

    /**
     * The header of a sub-page (Manage, Settings).
     * A separate component, because without a back button there is nowhere to return to
     * from these screens - they are not part of the bottom navigation.
     */
    defineProps<{ title: string }>();

    const router = useRouter();

    function goBack(): void {
        // history.back() breaks when the page was opened via a direct link.
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/overview");
        }
    }
</script>

<template>
    <header class="ft-page-head">
        <button type="button" class="ft-page-head__back ft-icon-btn" aria-label="Back" @click="goBack">
            <el-icon :size="20"><ArrowLeft /></el-icon>
        </button>
        <h2 class="ft-page-head__title">{{ title }}</h2>
    </header>
</template>
