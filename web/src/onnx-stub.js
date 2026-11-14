/** Tokenizer-only build: do not ship onnxruntime WASM. */
export default {};
export const env = { wasm: {} };
export const InferenceSession = { create: async () => ({}) };
export const Tensor = class Tensor {};
export const VERSION = "stub";
