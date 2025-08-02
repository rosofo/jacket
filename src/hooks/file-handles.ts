import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

export function useStoreHandle(name: string) {
  const [handle, setHandle] = useState<FileSystemHandle | null>(null);
  useEffect(() => {
    get(key(name)).then((handle) => setHandle(handle || null));
  }, [name]);

  const storeHandle = useCallback(
    (handle: FileSystemHandle) => {
      set(key(name), handle).then(() => setHandle(handle));
    },
    [name, setHandle]
  );

  return [handle, storeHandle] as const;
}

function key(name: string): IDBValidKey {
  return `jacket__handles_${name}`;
}
