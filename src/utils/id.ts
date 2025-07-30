import { getLogger } from "@logtape/logtape";
import xxhash from "xxhash-wasm";
const hashes = await xxhash();

const logger = getLogger(["jacket", "tracking"]);

export function genId(data: string, parentId: string) {
  const digest = hashes.h32(data + parentId);
  return digest.toString();
}
