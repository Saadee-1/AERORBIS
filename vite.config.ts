import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    throw new Error("Missing env: VITE_SUPABASE_URL");
  }

  return {
    server: {
      host: "::",
      port: 5173,
      proxy: {
        '/api/assistant-events': {
          target: `${SUPABASE_URL}/functions/v1`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove apikey header if present
            proxyReq.removeHeader('apikey');
            // Forward only Content-Type and Authorization headers
            const contentType = req.headers['content-type'];
            const authorization = req.headers['authorization'];
            // Clear all headers first
            Object.keys(proxyReq.getHeaders()).forEach(key => {
              proxyReq.removeHeader(key);
            });
            // Set only allowed headers
            if (contentType) {
              proxyReq.setHeader('Content-Type', contentType);
            }
            if (authorization) {
              proxyReq.setHeader('Authorization', authorization);
            }
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
