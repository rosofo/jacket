import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand/react";
import { getLogger } from "@logtape/logtape";
import { useShallow } from "zustand/shallow";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { PersistOptions } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

const logger = getLogger(["jacket", "files"]);

type Status = null | "no-access" | "loading" | "loaded" | "reloading";
type FileStore = {
  status: Status;
  handle?: FileSystemDirectoryHandle;
  files: Record<string, string>;
  observeLocal: boolean;
  setLoading: (handle: FileSystemDirectoryHandle) => void;
  setLoaded: (files: Record<string, string>) => void;
  setReloading: () => void;
  setNoAccess: () => void;
  reset: () => void;
};

class FileStorage implements PersistStorage<Partial<FileStore>> {
  async getItem(name: string) {
    return { state: { handle: await get(name) } };
  }

  setItem(name: string, value: StorageValue<Partial<FileStore>>) {
    return set(name, value.state.handle);
  }

  removeItem(name: string) {
    return del(name);
  }
}
const useFileStore = create<FileStore>()(
  persist(
    (set) => ({
      status: null,
      files: {},
      observeLocal: true,
      setLoaded: (files) => {
        set({ status: "loaded", files });
      },
      setLoading: (handle) => {
        set({ status: "loading", handle });
      },
      setNoAccess: () => {
        set({ status: "no-access" });
      },
      setReloading: () => {
        set({ status: "reloading" });
      },
      reset: () => {
        set({ status: null, files: {} });
      },
    }),
    {
      name: "file-store",
      partialize: (state) => ({ handle: state.handle }),
      storage: new FileStorage(),
    } as PersistOptions<FileStore, Partial<FileStore>>
  )
);

function useChooseDir() {
  const setLoading = useFileStore((state) => state.setLoading);
  const choose = useCallback(async () => {
    const dirHandle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    setLoading(dirHandle);
  }, [setLoading]);
  return choose;
}

type UseFilesReturn = {
  files: Record<string, string>;
  choose: () => Promise<void>;
  setHandle: (handle: FileSystemDirectoryHandle) => void;
  create: (name: string, text: string) => Promise<void>;
  path?: string;
  status: Status;
};

export function useStaticFiles(files: Record<string, string>) {
  useEffect(() => {
    useFileStore.setState({ files, observeLocal: false });

    return () => {
      useFileStore.setState({ observeLocal: true });
    };
  }, [files]);
}

export function useFiles(): UseFilesReturn {
  const choose = useChooseDir();
  useObserveDirectory();

  const handle = useFileStore((state) => state.handle);
  const setHandle = useFileStore((state) => state.setLoading);
  const create = useCallback(
    async (name: string, text: string) => {
      const fileHandle = await handle?.getFileHandle(name, { create: true });
      if (fileHandle !== undefined) {
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
      }
    },
    [handle]
  );

  const status = useFileStore((state) => state.status);
  const files = useFileStore((state) => state.files);

  return { files, choose, setHandle, create, path: handle?.name, status };
}

function useObserveDirectory() {
  const handle = useFileStore((state) => state.handle);
  const {
    setLoaded,
    setNoAccess,
    reset,
    setReloading,
    setLoading,
    observeLocal,
  } = useFileStore(
    useShallow(
      ({
        setLoaded,
        setNoAccess,
        reset,
        setReloading,
        setLoading,
        observeLocal,
      }) => ({
        setLoaded,
        setNoAccess,
        reset,
        setReloading,
        setLoading,
        observeLocal,
      })
    )
  );
  const timestamps = useRef({} as Record<string, number>);
  useEffect(() => {
    if (!observeLocal || handle === undefined) return;
    let cancelled = false;
    const interval = setInterval(() => {
      (async () => {
        if (cancelled) return;
        if (
          (await handle?.queryPermission({ mode: "readwrite" })) !== "granted"
        ) {
          try {
            const permission = await handle?.requestPermission({
              mode: "readwrite",
            });
            if (permission !== "granted") {
              setNoAccess();
              return;
            }
          } catch (e) {
            setNoAccess();
            return;
          }
        }
        const entries = handle?.entries();
        if (entries === undefined) {
          reset();
          return;
        }
        const files = {} as Record<string, string>;
        setReloading();
        let changed = false;
        for await (const [name, entryHandle] of entries) {
          if (entryHandle instanceof FileSystemFileHandle) {
            const file = await entryHandle.getFile();
            const timestamp = file.lastModified;
            const prevTimestamp = timestamps.current[name];
            if (prevTimestamp === undefined || timestamp > prevTimestamp) {
              console.log(prevTimestamp, timestamp);
              changed = true;
              timestamps.current[name] = timestamp;
            }
            files[name] = await file.text();
          }
        }

        if (changed) {
          setLoaded(files);
        } else {
          setReloading();
        }
      })();
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    handle,
    reset,
    setLoaded,
    setLoading,
    setNoAccess,
    setReloading,
    timestamps,
    observeLocal,
  ]);
}
