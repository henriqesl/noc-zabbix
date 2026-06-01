import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/zbx": {
          target: env.VITE_ZABBIX_URL || "http://localhost",
          changeOrigin: true,
          rewrite: proxyPath => proxyPath.replace(/^\/zbx/, ""),
        },
      },
    },
    plugins: [react()],
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
