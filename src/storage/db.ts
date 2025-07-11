// db.ts
import Dexie, { type EntityTable } from "dexie";

interface Handle {
  name: string;
  handle: FileSystemHandle;
}

const db = new Dexie("HandleDatabase") as Dexie & {
  handles: EntityTable<Handle, "name">;
};

// Schema declaration:
db.version(1).stores({
  handles: "++name, handle",
});

export type { Handle };
export { db };
