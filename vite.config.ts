import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  define: {
    // Environment variables for frontend
    'import.meta.env.VITE_RUBICON_INTEGRATION': JSON.stringify(process.env.RUBICON_INTEGRATION || 'false'),
    'import.meta.env.VITE_RUBICON_BASE_URL': JSON.stringify(process.env.RUBICON_BASE_URL || 'https://www.rubiconprgroup.com'),
    'import.meta.env.VITE_DISABLE_NATIVE_AUTH': JSON.stringify(process.env.DISABLE_NATIVE_AUTH || 'false'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize build size and speed
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['chart.js', 'recharts'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js']
        }
      }
    },
    // Reduce bundle size in production
    minify: 'terser',
    sourcemap: false, // Disable sourcemaps in production
    chunkSizeWarningLimit: 1000
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
});