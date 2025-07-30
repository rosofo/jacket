import xxhash from "xxhash-wasm";
const hashes = await xxhash();

export function genId(data: unknown, parentId: string) {
  const trace = {} as { stack: string };
  Error.captureStackTrace(trace);
  const digest = hashes.h32(trace.stack + parentId, 0);
  return digest.toString();
}
