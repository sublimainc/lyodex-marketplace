import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");

const rawPort = process.env.PORT;

if (!rawPort && !isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = rawPort ? Number(rawPort) : 3000;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

// Replit-only developer tooling. Loaded dynamically and tolerated when absent,
// so the @replit/* packages can be uninstalled entirely when hosting elsewhere
// without breaking the build.
const replitDevPlugins: PluginOption[] = [];
if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
  for (const [specifier, load] of [
    ["@replit/vite-plugin-runtime-error-modal", (m: any) => m.default()],
    ["@replit/vite-plugin-cartographer", (m: any) => m.cartographer({ root: path.resolve(import.meta.dirname, "..") })],
    ["@replit/vite-plugin-dev-banner", (m: any) => m.devBanner()],
  ] as const) {
    try {
      replitDevPlugins.push(load(await import(/* @vite-ignore */ specifier)));
    } catch {
      // Package not installed — expected off Replit.
    }
  }
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...replitDevPlugins,
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
