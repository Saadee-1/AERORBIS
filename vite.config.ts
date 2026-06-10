import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api-groq": {
        target: "https://api.groq.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-groq/, ""),
      },
    },
  },
  preview: {
    host: "::",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api-groq": {
        target: "https://api.groq.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-groq/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
}));
