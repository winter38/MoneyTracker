<script setup lang="ts">
    defineProps<{
        label: string;
        value: string;
        tone?: "expense" | "income" | "neutral";
        hint?: string;
    }>();
</script>

<template>
    <div class="stat ft-card">
        <span class="stat__label ft-muted">{{ label }}</span>
        <strong class="stat__value ft-amount" :class="tone && tone !== 'neutral' ? `ft-amount--${tone}` : undefined">{{ value }}</strong>
        <span v-if="hint" class="stat__hint ft-muted">{{ hint }}</span>
    </div>
</template>

<style scoped>
    .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat__label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 600;
    }

    .stat__value {
        font-size: 22px;
    }

    @media (max-width: 899px) {
        .stat {
            padding: 12px;
        }

        .stat__value {
            font-size: 18px;
        }
    }

    .stat__hint {
        font-size: 12px;
    }
</style>
