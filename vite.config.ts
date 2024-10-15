import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "public/background.js"),
        contentScript: resolve(__dirname, "public/contentScript.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "contentScript" ||
            chunkInfo.name === "background"
            ? "[name].js"
            : "assets/[name]-[hash].js";
        },
      },
    },
  },
  define: {
    "import.meta.env.VITE_OPENAI_API_KEY": JSON.stringify(
      process.env.VITE_OPENAI_API_KEY
    ),
  },
});
