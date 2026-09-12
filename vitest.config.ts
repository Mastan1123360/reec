import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Ensure Next.js and Supabase env variables are populated in test runner
  Object.assign(process.env, env);

  return {
    test: {
      environment: "node",
      include: ["lib/**/__tests__/**/*.test.{ts,tsx}", "components/**/__tests__/**/*.test.{ts,tsx}", "app/**/__tests__/**/*.test.{ts,tsx}"],
      exclude: ["node_modules", ".next", "dist"],
      testTimeout: 30000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
