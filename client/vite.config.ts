import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
<<<<<<< HEAD
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
      "/ws": {
        target: process.env.VITE_API_URL || "ws://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
    },
=======
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  define: {
    // Define environment variables for production
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
>>>>>>> c76e66f6ee3ec461f1f75c9346d2b837b6e25829
  },
});