import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const onnxStub = fileURLToPath(new URL("./src/onnx-stub.js", import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  publicDir: "public",
  resolve: {
    alias: {
      "onnxruntime-web/webgpu": onnxStub,
      "onnxruntime-web": onnxStub,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
});
