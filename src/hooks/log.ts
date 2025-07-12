import type { LogRecord } from "@logtape/logtape";
import { create } from "zustand/react";

type LogStore = {
  records: LogRecord[];
  push: (...records: LogRecord[]) => void;
};
export const useLogStore = create<LogStore>((set) => ({
  records: [],
  push: (...records: LogRecord[]) => {
    set((state) => ({
      records: [...state.records, ...records],
    }));
  },
}));
