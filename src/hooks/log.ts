import type { LogRecord } from "@logtape/logtape";
import { create } from "zustand/react";

type LogStore = {
  records: LogRecord[];
  keepLines: number;
  push: (...records: LogRecord[]) => void;
};
export const useLogStore = create<LogStore>((set) => ({
  records: [],
  keepLines: 1000,
  push: (...records: LogRecord[]) => {
    set((state) => ({
      records: [...state.records, ...records].slice(-state.keepLines),
    }));
  },
}));
