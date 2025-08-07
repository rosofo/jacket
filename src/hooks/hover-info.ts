import type { ReactNode } from "react";
import { create } from "zustand/react";

export type HoverInfoStore = {
  node?: ReactNode;
  hovering: boolean;
  clear(): void;
  close(): void;
  open(): void;
  setHover(node: ReactNode): void;
};
export const useHoverInfoStore = create<HoverInfoStore>((set) => ({
  hovering: false,
  clear() {
    set({ node: undefined, hovering: false });
  },
  setHover(node) {
    set({ node, hovering: true });
  },
  open() {
    set({ hovering: true });
  },
  close() {
    set({ hovering: false });
  },
}));
