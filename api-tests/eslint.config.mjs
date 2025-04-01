import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url),
    __dirname = path.dirname(__filename),
    compat = new FlatCompat({
        baseDirectory: __dirname,
        recommendedConfig: js.configs.recommended,
        allConfig: js.configs.all
    });

export default [{
    ignores: ["node_modules", "playwright.config.ts"],
}, {
    rules: {
        "playwright/no-wait-for-timeout": ["off"],
        "@typescript-eslint/no-useless-constructor": ["off"],
        "@typescript-eslint/await-thenable": ["off"],
        "arrow-spacing": "error",

        "brace-style": ["error", "stroustrup", {
            allowSingleLine: true,
        }],

        "consistent-return": "off",
        "dot-notation": "off",
        "eol-last": "off",
        eqeqeq: "error",
        "func-names": "off",
        "func-style": "off",
        indent: "error",

        "import/no-import-module-exports": "off",
        "import/no-relative-packages": "off",
        "implicit-arrow-linebreak": "error",
        "keyword-spacing": "error",
        "linebreak-style": "off",
        "no-array-constructor": "error",
        "no-await-in-loop": "off",
        "no-console": "off",
        "no-confusing-arrow": "error",
        "no-nested-ternary": "warn",
        "no-unused-vars": "error",
        "no-new-object": "error",
        "no-new-func": "error",
        "no-restricted-syntax": "off",
        "no-restricted-properties": "error",
        "no-redeclare": "off",
        "no-loop-func": "off",
        "no-trailing-spaces": "off",
        "no-plusplus": "off",
        "no-undef": "off",
        "nonblock-statement-body-position": "error",
        "no-multiple-empty-lines": "error",
        "no-multi-assign": "off",
        "newline-per-chained-call": "error",
        "no-var": "error",
        "one-var": "error",
        "prefer-arrow-callback": "off",
        "prefer-const": "error",
        "padded-blocks": "off",
        "prettier/prettier": "off",
        "prefer-spread": "error",
        "space-before-function-paren": "error",
        "space-before-blocks": "error",
        "spaced-comment": "error",
        "space-infix-ops": "error",
        "space-in-parens": "error",
        quotes: "error",
    },
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:playwright/playwright-test",
    "prettier",
).map(config => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
})), {
    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.browser,
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "commonjs",

        parserOptions: {
            parser: "@typescript-eslint/parser",
            project: ["./tsconfig.json"],
        },
    },

    rules: {
        "@typescript-eslint/no-explicit-any": ["warn"],
        "playwright/no-conditional-in-test": ["off"],
        "@typescript-eslint/no-unsafe-assignment": ["off"],
        "no-continue": ["off"],

        "@typescript-eslint/no-unused-vars": ["error", {
            vars: "all",
        }],

        "@typescript-eslint/no-unsafe-member-access": ["off"],
        "@typescript-eslint/no-misused-promises": ["off"],
        "@typescript-eslint/no-unsafe-call": ["off"],
        "playwright/no-wait-for-timeout": ["off"],
        "import/prefer-default-export": "off",
        "@typescript-eslint/ban-ts-comment": ["off"],
        "@typescript-eslint/require-await": ["off"],
        "@typescript-eslint/await-thenable": ["off"],
        "@typescript-eslint/restrict-template-expressions": ["off"],

        "@typescript-eslint/no-use-before-define": ["error", {
            functions: false,
            classes: true,
            variables: true,
        }],

        "no-plusplus": ["error", {
            allowForLoopAfterthoughts: true,
        }],

        "no-await-in-loop": "off",
        "max-classes-per-file": "off",
        "arrow-body-style": ["off"],

        quotes: ["error", "single", {
            avoidEscape: true,
            allowTemplateLiterals: true,
        }],

        "no-restricted-syntax": ["off", "ForInStatement", "ForOffStatement"],
        "prefer-destructuring": "off",
        "no-trailing-spaces": "error",

        "no-multiple-empty-lines": ["error", {
            max: 1,
            maxBOF: 0,
            maxEOF: 0,
        }],

        "eol-last": ["error", "always"],
        "linebreak-style": ["error", "unix"],
        "@typescript-eslint/lines-between-class-members": "off",
        "class-methods-use-this": "off",
        "arrow-spacing": "error",

        "max-len": ["warn", {
            code: 160,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreComments: true,
        }],

        "padding-line-between-statements": ["error", {
            blankLine: "always",
            prev: "*",
            next: "return",
        }, {
            blankLine: "always",
            prev: "import",
            next: "*",
        }, {
            blankLine: "any",
            prev: "import",
            next: "import",
        }, {
            blankLine: "always",
            prev: "function",
            next: "*",
        }, {
            blankLine: "always",
            prev: "if",
            next: "*",
        }, {
            blankLine: "always",
            prev: "for",
            next: "*",
        }, {
            blankLine: "always",
            prev: ["const", "let", "var"],
            next: "*",
        }, {
            blankLine: "any",
            prev: ["const", "let", "var"],
            next: ["const", "let", "var"],
        }],

        "object-curly-newline": ["warn", {
            ObjectExpression: {
                multiline: true,
                minProperties: 3,
                consistent: true,
            },

            ObjectPattern: {
                multiline: true,
            },

            ImportDeclaration: {
                multiline: true,
                minProperties: 4,
            },

            ExportDeclaration: {
                multiline: true,
                minProperties: 4,
            },
        }],
    },
}];
