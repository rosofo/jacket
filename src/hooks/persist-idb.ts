import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

export function usePersistIDB<T>(name: string) {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    get(name).then((handle) => setValue(handle || null));
  }, [name]);

  const store = useCallback(
    (value: T) => {
      set(name, value).then(() => setValue(value));
    },
    [name, setValue]
  );

  return [value, store] as const;
}
