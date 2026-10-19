<script setup lang="ts">
    import { reactive, ref } from "vue";
    import { ElMessage, ElMessageBox } from "element-plus";

    import type { CategoryGroup, CategoryKind } from "@/types/models";
    import AppIcon from "@/components/common/AppIcon.vue";
    import IconPicker from "@/components/common/IconPicker.vue";
    import { DEFAULT_EXPENSE_ICON, DEFAULT_INCOME_ICON } from "@/data/icons";
    import { PALETTE } from "@/data/seed";
    import { useCategoriesStore } from "@/stores/categories";
    import { iconTint } from "@/utils/color";

    const categories = useCategoriesStore();

    const kind = ref<CategoryKind>("expense");
    const expanded = ref<Set<string>>(new Set());

    const groupDialog = ref(false);
    const editingGroupId = ref<string | null>(null);
    const groupForm = reactive({ name: "", icon: DEFAULT_EXPENSE_ICON, color: PALETTE[0] as string });

    const subDialog = ref(false);
    const subParentId = ref<string | null>(null);
    const editingSubId = ref<string | null>(null);
    const subName = ref("");

    function toggle(groupId: string): void {
        const next = new Set(expanded.value);
        if (next.has(groupId)) {
            next.delete(groupId);
        } else {
            next.add(groupId);
        }
        expanded.value = next;
    }

    function openNewGroup(): void {
        editingGroupId.value = null;
        Object.assign(groupForm, {
            name: "",
            icon: kind.value === "expense" ? DEFAULT_EXPENSE_ICON : DEFAULT_INCOME_ICON,
            color: PALETTE[categories.groups.length % PALETTE.length],
        });
        groupDialog.value = true;
    }

    function openEditGroup(group: CategoryGroup): void {
        editingGroupId.value = group.id;
        Object.assign(groupForm, { name: group.name, icon: group.icon, color: group.color });
        groupDialog.value = true;
    }

    function submitGroup(): void {
        if (!groupForm.name.trim()) {
            ElMessage.warning("Enter a group name");
            return;
        }
        const payload = { name: groupForm.name.trim(), icon: groupForm.icon, color: groupForm.color };
        if (editingGroupId.value) {
            categories.updateGroup(editingGroupId.value, payload);
        } else {
            categories.addGroup({ ...payload, kind: kind.value });
        }
        groupDialog.value = false;
    }

    async function removeGroup(group: CategoryGroup): Promise<void> {
        try {
            await ElMessageBox.confirm(
                `Delete the group "${group.name}" and all of its subcategories? The transactions stay, but lose their category.`,
                "Delete group",
                { type: "warning", confirmButtonText: "Delete", cancelButtonText: "Cancel" },
            );
            categories.removeGroup(group.id);
            ElMessage.success("Group deleted");
        } catch {
            // Cancelled by the user.
        }
    }

    function openNewSub(groupId: string): void {
        subParentId.value = groupId;
        editingSubId.value = null;
        subName.value = "";
        subDialog.value = true;
    }

    function openEditSub(id: string, name: string): void {
        editingSubId.value = id;
        subName.value = name;
        subDialog.value = true;
    }

    function submitSub(): void {
        const name = subName.value.trim();
        if (!name) {
            ElMessage.warning("Enter a subcategory name");
            return;
        }
        if (editingSubId.value) {
            categories.updateSubcategory(editingSubId.value, { name });
        } else if (subParentId.value) {
            categories.addSubcategory(subParentId.value, name);
            expanded.value = new Set([...expanded.value, subParentId.value]);
        }
        subDialog.value = false;
    }
</script>

<template>
    <div class="panel">
        <div class="panel__head">
            <el-segmented
                v-model="kind"
                :options="[
                    { label: 'Expenses', value: 'expense' },
                    { label: 'Income', value: 'income' },
                ]"
            />
            <el-button type="primary" @click="openNewGroup">Add group</el-button>
        </div>

        <div class="ft-card ft-card--flush">
            <p v-if="!categories.tree(kind).length" class="ft-empty">No groups yet</p>

            <div v-for="node in categories.tree(kind)" :key="node.group.id" class="group">
                <div class="group__head">
                    <button type="button" class="group__toggle" @click="toggle(node.group.id)">
                        <span class="ft-avatar" :style="iconTint(node.group.color)"><AppIcon :icon="node.group.icon" /></span>
                        <span class="group__name">{{ node.group.name }}</span>
                        <span class="ft-muted group__count">{{ node.children.length }}</span>
                        <span class="group__chevron ft-muted">{{ expanded.has(node.group.id) ? "▾" : "▸" }}</span>
                    </button>

                    <el-dropdown trigger="click">
                        <el-button link
                            ><el-icon :size="20"><MoreFilled /></el-icon
                        ></el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item @click="openNewSub(node.group.id)">Add subcategory</el-dropdown-item>
                                <el-dropdown-item @click="openEditGroup(node.group)">Edit</el-dropdown-item>
                                <el-dropdown-item divided @click="removeGroup(node.group)">Delete</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>

                <div v-if="expanded.has(node.group.id)" class="group__children">
                    <div v-for="child in node.children" :key="child.id" class="child">
                        <span class="child__dot" :style="{ background: node.group.color }" />
                        <span class="child__name">{{ child.name }}</span>
                        <el-button link size="small" @click="openEditSub(child.id, child.name)">Edit</el-button>
                        <el-button link size="small" type="danger" @click="categories.removeSubcategory(child.id)">Delete</el-button>
                    </div>
                    <el-button link type="primary" size="small" class="child__add" @click="openNewSub(node.group.id)">
                        + Add subcategory
                    </el-button>
                </div>
            </div>
        </div>

        <el-dialog v-model="groupDialog" :title="editingGroupId ? 'Group' : 'New group'" width="420px" append-to-body>
            <!-- Preview: shows at once how the category will look in the lists and in the ring. -->
            <div class="preview">
                <span class="preview__icon" :style="iconTint(groupForm.color)"><AppIcon :icon="groupForm.icon" /></span>
                <div class="preview__text">
                    <strong>{{ groupForm.name.trim() || "New group" }}</strong>
                    <span class="ft-muted">{{ kind === "expense" ? "Expenses" : "Income" }}</span>
                </div>
            </div>

            <el-form label-position="top">
                <el-form-item label="Name">
                    <el-input v-model="groupForm.name" maxlength="40" placeholder="For example, Groceries" />
                </el-form-item>
                <el-form-item label="Icon">
                    <IconPicker v-model="groupForm.icon" :color="groupForm.color" />
                </el-form-item>
                <el-form-item label="Color">
                    <div class="picker">
                        <button
                            v-for="color in PALETTE"
                            :key="color"
                            type="button"
                            class="picker__dot"
                            :class="{ 'picker__dot--active': groupForm.color === color }"
                            :style="{ background: color }"
                            :aria-label="color"
                            @click="groupForm.color = color"
                        />
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="groupDialog = false">Cancel</el-button>
                <el-button type="primary" @click="submitGroup">Save</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="subDialog" :title="editingSubId ? 'Subcategory' : 'New subcategory'" width="380px" append-to-body>
            <el-input v-model="subName" maxlength="40" placeholder="Name" @keyup.enter="submitSub" />
            <template #footer>
                <el-button @click="subDialog = false">Cancel</el-button>
                <el-button type="primary" @click="submitSub">Save</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
    .panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .panel__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .group {
        border-top: 1px solid var(--ft-border);
    }

    .group:first-child {
        border-top: none;
    }

    .group__head {
        display: flex;
        align-items: center;
        padding-right: 12px;
    }

    .group__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
        padding: 10px 16px;
        border: none;
        background: transparent;
        font: inherit;
        color: inherit;
        cursor: pointer;
        text-align: left;
    }

    .group__toggle:hover {
        background: var(--ft-surface-muted);
    }

    .group__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .group__count {
        font-size: 12px;
    }

    .group__chevron {
        font-size: 12px;
        width: 12px;
    }

    .group__children {
        padding: 2px 16px 12px 60px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .child {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
    }

    .child__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex: 0 0 6px;
    }

    .child__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .child__add {
        align-self: flex-start;
        margin-top: 2px;
    }

    .preview {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        margin-bottom: 16px;
        border-radius: var(--ft-radius);
        background: var(--ft-surface-muted);
    }

    .preview__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        flex: 0 0 56px;
        border-radius: 50%;
        font-size: 26px;
    }

    .preview__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .preview__text strong {
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .preview__text span {
        font-size: 12px;
    }

    .picker {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .picker__dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
    }

    .picker__dot--active {
        border-color: var(--ft-text);
    }
</style>
