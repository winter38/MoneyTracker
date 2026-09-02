import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "node_modules/**"] },
    // smoke.mjs runs through Node, not in a browser.
    { files: ["smoke.mjs"], languageOptions: { globals: { process: "readonly", console: "readonly" } } },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: { parser: tseslint.parser },
        },
    },
    {
        plugins: { "unused-imports": unusedImports },
        rules: {
            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/consistent-type-imports": "error",
            "vue/multi-word-component-names": "off",
            "vue/require-explicit-emits": "error",
            "prefer-const": "warn",
            "no-var": "warn",
        },
    },
    eslintConfigPrettier,
);
