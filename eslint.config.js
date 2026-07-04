import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // dist e artefatos gerados pelo Astro (blog) não são lintados
  { ignores: ["dist", "apps/blog/.astro"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Desligado: variantes do shadcn (cva) e providers de contexto convivem
      // com componentes no mesmo arquivo por convenção do projeto.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Coerente com o modo relaxado do tsconfig (strict: false,
      // noImplicitAny: false) — ver CLAUDE.md.
      "@typescript-eslint/no-explicit-any": "off",
      // catch {} vazio é o padrão documentado de restauração de rascunhos
      // (ver "Persistência de Rascunho em Formulários" no CLAUDE.md)
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // arquivos de declaração usam triple-slash por exigência do Astro/Vite
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
);
