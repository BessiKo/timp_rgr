import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-empty": ["warn", { "allowEmptyCatch": true }], // <- Игнорируем пустые catch
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    }
  }
];