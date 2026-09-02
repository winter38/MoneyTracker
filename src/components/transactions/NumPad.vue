<script setup lang="ts">
    /**
     * A custom numeric keypad with a calculator - the same layout as in 1Money:
     * a column of operators on the left, and backspace, date and a tall confirm button on the right.
     *
     * Custom rather than the system keyboard: it is always on screen, does not cover the top of the form
     * and lets you work the amount out while typing it (12 x 3, for example).
     */
    defineProps<{ canSubmit: boolean }>();

    const emit = defineEmits<{
        digit: [value: string];
        dot: [];
        backspace: [];
        clear: [];
        operator: [value: "+" | "-" | "*" | "/"];
        date: [];
        submit: [];
    }>();
</script>

<template>
    <div class="numpad">
        <button type="button" class="key key--op" aria-label="Divide" @click="emit('operator', '/')">÷</button>
        <button type="button" class="key" @click="emit('digit', '7')">7</button>
        <button type="button" class="key" @click="emit('digit', '8')">8</button>
        <button type="button" class="key" @click="emit('digit', '9')">9</button>
        <button type="button" class="key key--op" aria-label="Backspace" @click="emit('backspace')" @contextmenu.prevent="emit('clear')">
            ⌫
        </button>

        <button type="button" class="key key--op" aria-label="Multiply" @click="emit('operator', '*')">×</button>
        <button type="button" class="key" @click="emit('digit', '4')">4</button>
        <button type="button" class="key" @click="emit('digit', '5')">5</button>
        <button type="button" class="key" @click="emit('digit', '6')">6</button>
        <button type="button" class="key key--op ft-icon-btn" aria-label="Pick a date" @click="emit('date')">
            <el-icon :size="21"><Calendar /></el-icon>
        </button>

        <button type="button" class="key key--op" aria-label="Subtract" @click="emit('operator', '-')">−</button>
        <button type="button" class="key" @click="emit('digit', '1')">1</button>
        <button type="button" class="key" @click="emit('digit', '2')">2</button>
        <button type="button" class="key" @click="emit('digit', '3')">3</button>
        <button type="button" class="key key--submit ft-icon-btn" :disabled="!canSubmit" aria-label="Save" @click="emit('submit')">
            <el-icon :size="26"><Check /></el-icon>
        </button>

        <button type="button" class="key key--op" aria-label="Add" @click="emit('operator', '+')">+</button>
        <button type="button" class="key" @click="emit('digit', '00')">00</button>
        <button type="button" class="key" @click="emit('digit', '0')">0</button>
        <button type="button" class="key" @click="emit('dot')">,</button>
    </div>
</template>

<style scoped>
    .numpad {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 6px;
        padding: 8px 10px calc(10px + env(safe-area-inset-bottom));
        background: var(--ft-surface-muted);
        border-top: 1px solid var(--ft-border);
    }

    .key {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 50px;
        border: none;
        border-radius: 12px;
        background: var(--ft-surface);
        color: var(--ft-text);
        font-size: 21px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        box-shadow: 0 1px 1px rgba(16, 24, 40, 0.05);
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }

    .key:active {
        background: var(--ft-page);
        transform: scale(0.97);
    }

    .key--op {
        background: var(--ft-surface-muted);
        color: var(--ft-text-secondary);
        box-shadow: none;
        border: 1px solid var(--ft-border);
        font-size: 19px;
    }

    /* The check key spans two rows - just like in 1Money. */
    .key--submit {
        grid-column: 5;
        grid-row: 3 / span 2;
        height: auto;
        background: var(--ft-accent);
        color: #fff;
        font-size: 24px;
    }

    .key--submit:disabled {
        opacity: 0.4;
        cursor: default;
    }

    @media (min-width: 900px) {
        .key {
            height: 44px;
            font-size: 19px;
        }
    }
</style>
