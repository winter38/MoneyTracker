import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import type { CategoryGroup, CategoryKind, Subcategory } from "@/types/models";
import { STORAGE_KEYS, loadState, saveState } from "@/utils/storage";
import { createId } from "@/utils/id";

/** A "group + its subcategories" tree - what gets rendered in the dropdowns and in the Categories section. */
export interface CategoryTreeNode {
    group: CategoryGroup;
    children: Subcategory[];
}

export const useCategoriesStore = defineStore("categories", () => {
    const groups = ref<CategoryGroup[]>(loadState<CategoryGroup[]>(STORAGE_KEYS.groups, []));
    const subcategories = ref<Subcategory[]>(loadState<Subcategory[]>(STORAGE_KEYS.subcategories, []));

    watch(groups, (value) => saveState(STORAGE_KEYS.groups, value), { deep: true });
    watch(subcategories, (value) => saveState(STORAGE_KEYS.subcategories, value), { deep: true });

    function groupById(id: string | undefined): CategoryGroup | undefined {
        return id ? groups.value.find((group) => group.id === id) : undefined;
    }

    function subcategoryById(id: string | undefined): Subcategory | undefined {
        return id ? subcategories.value.find((item) => item.id === id) : undefined;
    }

    function childrenOf(groupId: string, includeArchived = false): Subcategory[] {
        return subcategories.value
            .filter((item) => item.groupId === groupId && (includeArchived || !item.archived))
            .sort((a, b) => a.order - b.order);
    }

    /** The category tree for one direction (expense or income). */
    function tree(kind: CategoryKind, includeArchived = false): CategoryTreeNode[] {
        return groups.value
            .filter((group) => group.kind === kind && (includeArchived || !group.archived))
            .sort((a, b) => a.order - b.order)
            .map((group) => ({ group, children: childrenOf(group.id, includeArchived) }));
    }

    const expenseTree = computed(() => tree("expense"));
    const incomeTree = computed(() => tree("income"));

    /** The full name for lists: "Cafe / Coffee". */
    function labelFor(groupId?: string, subcategoryId?: string): string {
        const group = groupById(groupId);
        if (!group) {
            return "No category";
        }
        const child = subcategoryById(subcategoryId);
        return child ? `${group.name} · ${child.name}` : group.name;
    }

    function addGroup(payload: Omit<CategoryGroup, "id" | "order" | "archived">): CategoryGroup {
        const group: CategoryGroup = {
            ...payload,
            id: createId(),
            archived: false,
            order: groups.value.filter((item) => item.kind === payload.kind).length,
        };
        groups.value.push(group);
        return group;
    }

    function updateGroup(id: string, patch: Partial<CategoryGroup>): void {
        const index = groups.value.findIndex((group) => group.id === id);
        if (index !== -1) {
            groups.value[index] = { ...groups.value[index], ...patch };
        }
    }

    /** Deletes a group together with its subcategories. Transactions stay, but lose their category. */
    function removeGroup(id: string): void {
        groups.value = groups.value.filter((group) => group.id !== id);
        subcategories.value = subcategories.value.filter((item) => item.groupId !== id);
    }

    function addSubcategory(groupId: string, name: string): Subcategory {
        const child: Subcategory = {
            id: createId(),
            groupId,
            name,
            archived: false,
            order: childrenOf(groupId, true).length,
        };
        subcategories.value.push(child);
        return child;
    }

    function updateSubcategory(id: string, patch: Partial<Subcategory>): void {
        const index = subcategories.value.findIndex((item) => item.id === id);
        if (index !== -1) {
            subcategories.value[index] = { ...subcategories.value[index], ...patch };
        }
    }

    function removeSubcategory(id: string): void {
        subcategories.value = subcategories.value.filter((item) => item.id !== id);
    }

    function replaceAll(nextGroups: CategoryGroup[], nextSubcategories: Subcategory[]): void {
        groups.value = nextGroups;
        subcategories.value = nextSubcategories;
    }

    return {
        groups,
        subcategories,
        expenseTree,
        incomeTree,
        tree,
        groupById,
        subcategoryById,
        childrenOf,
        labelFor,
        addGroup,
        updateGroup,
        removeGroup,
        addSubcategory,
        updateSubcategory,
        removeSubcategory,
        replaceAll,
    };
});
