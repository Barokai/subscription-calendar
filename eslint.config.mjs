import { defineConfig } from "eslint/config";
import { includeIgnoreFile } from "@eslint/compat";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const gitignorePath = new URL(".gitignore", import.meta.url);

export default defineConfig([
  includeIgnoreFile(gitignorePath.pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react 7.x can't auto-detect the React version under ESLint 10
    // (it calls the removed context.getFilename()), so pin it explicitly.
    settings: {
      react: { version: "19.2" },
    },
    rules: {
      curly: "error",
      // New in eslint-plugin-react-hooks 7. The existing code predates them (data loading and
      // localStorage reads in effects, the click-outside listener in subscription-calendar.tsx).
      // Kept as warnings so CI stays useful; refactor and switch back to "error".
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
