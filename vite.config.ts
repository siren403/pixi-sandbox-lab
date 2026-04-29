import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
});
