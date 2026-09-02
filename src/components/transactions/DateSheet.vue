<script setup lang="ts">
    import { computed, ref } from "vue";

    import { RECURRENCE_PRESETS, presetByKey } from "@/data/recurrence";
    import { useSettingsStore } from "@/stores/settings";
    import { formatDate, today, yesterday } from "@/utils/date";

    /**
     * Лист выбора даты и повторения — открывается кнопкой календаря на клавиатуре,
     * как в 1Money: быстрые «Вчера/Сегодня», системный календарь и список повторений.
     */
    const props = defineProps<{
        open: boolean;
        date: string;
        /** Ключ выбранного повторения из RECURRENCE_PRESETS или null. */
        recurrence: string | null;
    }>();

    const emit = defineEmits<{
        close: [];
        "update:date": [value: string];
        "update:recurrence": [value: string | null];
    }>();

    const settings = useSettingsStore();

    /** Внутри листа открыт подсписок повторений. */
    const showRecurrence = ref(false);
    const dateInput = ref<HTMLInputElement | null>(null);

    const recurrenceLabel = computed(() => presetByKey(props.recurrence)?.label ?? "Не повторять");

    function openCalendar(): void {
        const input = dateInput.value;
        if (!input) {
            return;
        }
        if (typeof input.showPicker === "function") {
            input.showPicker();
        } else {
            input.click();
        }
    }

    function pick(value: string): void {
        emit("update:date", value);
        emit("close");
    }

    function pickRecurrence(key: string | null): void {
        emit("update:recurrence", key);
        showRecurrence.value = false;
    }
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="date-overlay" @click.self="emit('close')">
            <section class="date-sheet" role="dialog" aria-modal="true">
                <!-- Список повторений -->
                <template v-if="showRecurrence">
                    <header class="date-sheet__head">
                        <button type="button" class="date-sheet__back" @click="showRecurrence = false">‹ Назад</button>
                        <span class="date-sheet__title">Повторение</span>
                    </header>

                    <div class="options">
                        <button type="button" class="option" :class="{ 'option--active': !recurrence }" @click="pickRecurrence(null)">
                            <span class="option__mark">{{ !recurrence ? "●" : "○" }}</span>
                            Не повторять
                        </button>
                        <button
                            v-for="preset in RECURRENCE_PRESETS"
                            :key="preset.key"
                            type="button"
                            class="option"
                            :class="{ 'option--active': recurrence === preset.key }"
                            @click="pickRecurrence(preset.key)"
                        >
                            <span class="option__mark">{{ recurrence === preset.key ? "●" : "○" }}</span>
                            {{ preset.label }}
                        </button>
                    </div>
                </template>

                <!-- Основной экран: дата и повторение -->
                <template v-else>
                    <header class="date-sheet__head">
                        <span class="date-sheet__title">Дата</span>
                        <button type="button" class="date-sheet__close ft-icon-btn" aria-label="Закрыть" @click="emit('close')">
                            <el-icon :size="18"><Close /></el-icon>
                        </button>
                    </header>

                    <button type="button" class="big-tile" @click="openCalendar">
                        <el-icon class="big-tile__icon" :size="22"><Calendar /></el-icon>
                        <span>Выбрать день</span>
                        <span class="ft-muted big-tile__hint">{{ formatDate(date, settings.locale) }}</span>
                    </button>

                    <div class="tiles">
                        <button type="button" class="tile-btn" :class="{ 'tile-btn--active': date === yesterday() }" @click="pick(yesterday())">
                            <el-icon class="tile-btn__icon" :size="20"><Moon /></el-icon>
                            <span>Вчера</span>
                            <span class="ft-muted tile-btn__hint">{{ formatDate(yesterday(), settings.locale) }}</span>
                        </button>

                        <button type="button" class="tile-btn" :class="{ 'tile-btn--active': date === today() }" @click="pick(today())">
                            <el-icon class="tile-btn__icon" :size="20"><Sunny /></el-icon>
                            <span>Сегодня</span>
                            <span class="ft-muted tile-btn__hint">{{ formatDate(today(), settings.locale) }}</span>
                        </button>

                        <button type="button" class="tile-btn tile-btn--wide" :class="{ 'tile-btn--active': !!recurrence }" @click="showRecurrence = true">
                            <el-icon class="tile-btn__icon" :size="20"><RefreshRight /></el-icon>
                            <span>Повторение</span>
                            <span class="ft-muted tile-btn__hint">{{ recurrenceLabel }}</span>
                        </button>
                    </div>
                </template>

                <input
                    ref="dateInput"
                    class="date-sheet__input"
                    type="date"
                    :value="date"
                    tabindex="-1"
                    aria-hidden="true"
                    @change="pick(($event.target as HTMLInputElement).value)"
                />
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
    .date-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 10, 14, 0.45);
        z-index: 2800;
        display: flex;
        align-items: flex-end;
        justify-content: center;
    }

    .date-sheet {
        position: relative;
        width: 100%;
        max-width: 460px;
        max-height: 84vh;
        overflow-y: auto;
        padding: 12px 12px calc(16px + env(safe-area-inset-bottom));
        background: var(--ft-surface);
        border-radius: var(--ft-radius) var(--ft-radius) 0 0;
    }

    @media (min-width: 900px) {
        .date-overlay {
            align-items: center;
        }

        .date-sheet {
            border-radius: var(--ft-radius);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
        }
    }

    .date-sheet__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 2px 4px 12px;
    }

    .date-sheet__title {
        font-weight: 600;
        font-size: 16px;
    }

    .date-sheet__back {
        border: none;
        background: transparent;
        color: var(--ft-accent);
        font: inherit;
        cursor: pointer;
    }

    .date-sheet__close {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--ft-text-secondary);
        font-size: 15px;
        cursor: pointer;
    }

    .big-tile,
    .tile-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 14px 10px;
        border: none;
        border-radius: 14px;
        background: var(--ft-surface-muted);
        color: var(--ft-text);
        font: inherit;
        font-size: 15px;
        cursor: pointer;
    }

    .big-tile {
        width: 100%;
        margin-bottom: 8px;
    }

    .big-tile__icon,
    .tile-btn__icon {
        font-size: 22px;
        line-height: 1;
    }

    .big-tile__hint,
    .tile-btn__hint {
        font-size: 12px;
    }

    .tiles {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .tile-btn--wide {
        grid-column: 1 / -1;
    }

    .tile-btn--active {
        background: color-mix(in srgb, var(--ft-accent) 14%, var(--ft-surface));
        color: var(--ft-accent);
    }

    .options {
        display: flex;
        flex-direction: column;
    }

    .option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 8px;
        border: none;
        border-top: 1px solid var(--ft-border);
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
    }

    .option--active {
        color: var(--ft-accent);
        font-weight: 600;
    }

    .option__mark {
        font-size: 13px;
    }

    /* Нужен только как триггер системного календаря. */
    .date-sheet__input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }
</style>
