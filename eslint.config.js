import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/coverage/**",
            ".turbo/**",
            "**/.cache/**",
            "**/target/**",
            "**/src-tauri/target/**",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            sourceType: "module",
        },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                },
            ],
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
);
