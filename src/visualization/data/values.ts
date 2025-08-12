export type ValueInfo = {
  name: string;
  label?: string;
  fields: Record<string, string | number>;
} & (
  | { length: number }
  | { length: number; bytes: number; offset: number }
  | { size: number }
  | Record<string, unknown>
);
export function valueInfo(value: Record<string, unknown>): ValueInfo {
  const info: ValueInfo = { name: "object", fields: {} };
  const constructorName = value?.constructor?.name;
  if (constructorName !== undefined) {
    info.name = constructorName;
  }
  if (typeof value === "object" && value !== null) {
    if (value.label?.length) info.label = value.label as string;
    if (value.length !== undefined) {
      info.length = value.length as number;
    }
    if (value.byteLength !== undefined) {
      info.bytes = value.byteLength as number;
      info.offset = value.byteOffset as number;
    }
    if ("size" in value) {
      info.size = value.size;
    }

    if (!("length" in value)) {
      for (const [key, v] of Object.entries(value)) {
        if (
          !["name", "label", "length", "byteLength", "offset", "size"].includes(
            key
          ) &&
          (typeof v === "string" || typeof v === "number")
        ) {
          info.fields[key] = v;
        }
      }
    }
  }
  return info;
}
