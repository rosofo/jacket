import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand/react";
import { getLogger } from "@logtape/logtape";
import { usePersistIDB } from "./persist-idb";

const logger = getLogger(["jacket", "files"]);

type Status = null | "no-access" | "loading" | "loaded";
const useFileStatus = create<{
  status: Status;
  setStatus: (status: Status) => void;
}>((set) => ({
  status: null,
  setStatus: (status) => {
    set({ status });
  },
}));

function useHandle(name: string) {
  const [handle, storeHandle] = usePersistIDB(name);
  const setStatus = useFileStatus((state) => state.setStatus);
  const choose = useCallback(async () => {
    setStatus("loading");
    const dirHandle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    storeHandle(dirHandle);
  }, [storeHandle, setStatus]);
  if (handle !== null && !(handle instanceof FileSystemDirectoryHandle))
    throw Error("expected directory handle");
  return [(handle as FileSystemDirectoryHandle) || null, choose] as const;
}

type UseFilesReturn = {
  files: Record<string, string>;
  choose: () => Promise<void>;
  create: (name: string, text: string) => Promise<void>;
  path: string;
  status: Status;
};

export function useFiles(): UseFilesReturn {
  const [handle, choose] = useHandle("dir");

  const files = useObserveDirectory(handle);

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

  const status = useFileStatus((state) => state.status);

  return { files, choose, create, path: handle?.name, status };
}

function useObserveDirectory(handle: FileSystemDirectoryHandle | null) {
  const setStatus = useFileStatus((state) => state.setStatus);
  const [files, setFiles] = useState({} as Record<string, string>);
  const timestamps = useRef({} as Record<string, number>);
  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        if (
          (await handle?.queryPermission({ mode: "readwrite" })) !== "granted"
        ) {
          try {
            const permission = await handle?.requestPermission({
              mode: "readwrite",
            });
            if (permission !== "granted") {
              setStatus("no-access");
              return;
            }
          } catch (e) {
            setStatus("no-access");
            return;
          }
        }
        const entries = handle?.entries();
        if (entries === undefined) {
          setStatus(null);
          return;
        }
        const files = {} as Record<string, string>;
        setStatus("loading");
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

        if (changed) setFiles(files);
        setStatus("loaded");
      })();
    }, 500);
    return () => clearInterval(interval);
  }, [setFiles, setStatus, handle, timestamps]);
  return files;
}
